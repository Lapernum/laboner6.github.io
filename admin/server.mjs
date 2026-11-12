#!/usr/bin/env node
/*
 * 影記 · local content studio
 * -------------------------------------------------------------------------
 * A zero-dependency Node helper that only listens on 127.0.0.1. It serves the
 * site, accepts new photographs from the browser, uploads them to Backblaze B2
 * (or a local preview folder), appends them to ImageInfo.json with the exact
 * same Star_Citizen_XXXXX ID scheme, recomputes the collage layout, and can
 * commit/push the JSON change with git.
 *
 * Start with:  node admin/server.mjs
 *              or double-click start-admin.cmd
 */

import http from "node:http";
import { createReadStream } from "node:fs";
import {
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ADMIN_DIR = __dirname;
const CONFIG_PATH = path.join(ADMIN_DIR, "config.json");
const MEDIA_DIR = path.join(ADMIN_DIR, "media");
const TMP_DIR = path.join(ADMIN_DIR, ".tmp");
const IMAGEINFO_PATH = path.join(ROOT, "ImageInfo.json");
const MAX_BODY = 260 * 1024 * 1024;
const VERSION = "2.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const DEFAULT_CONFIG = {
  port: 8787,
  storage: {
    mode: "local",
    keyId: "",
    appKey: "",
    bucketId: "",
    bucketName: "",
    publicBaseUrl: "",
    thumbPrefix: "jpg/",
    fullPrefix: "full/",
    apiBase: "https://api.backblazeb2.com",
  },
  git: {
    enabled: true,
    push: true,
    remote: "origin",
    branch: "master",
  },
  autoPublish: true,
};

let config = null;
let port = Number(process.env.PORT) || 8787;
let b2 = null;
let uploadQueue = Promise.resolve();
let lastPublish = null;

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(payload);
}

function httpError(message, status = 400, extra = {}) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
}

function ensureTrailingSlash(value) {
  if (!value) return "";
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizePrefix(value, fallback) {
  return ensureTrailingSlash(
    String(value || fallback || "")
      .trim()
      .replace(/^\/+/, "")
  );
}

function normalizeBaseUrl(value) {
  if (!value) return "";
  return String(value).trim().replace(/\/+$/, "");
}

function parseDateInput(value) {
  const text = String(value || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2})-(\d{2})-(\d{2})$/.exec(
    text
  );
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]} ${match[4]}-${match[5]}-${match[6]}`;
  }
  const match2 = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    text
  );
  if (match2) {
    return `${match2[1]}-${match2[2]}-${match2[3]} ${match2[4]}-${match2[5]}-${
      match2[6] || "00"
    }`;
  }
  throw httpError("日期格式应为 YYYY-MM-DD HH-MM-SS");
}

function padId(number) {
  return String(number).padStart(5, "0");
}

function nextImageNumber(imageInfo) {
  let max = -1;
  for (const image of imageInfo.ImageInfo || []) {
    const match = /^Star_Citizen_(\d+)$/.exec(String(image.Name || ""));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function isLocalHost(host) {
  return /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(String(host || ""));
}

function checkLocalRequest(req) {
  if (!isLocalHost(req.headers.host)) {
    throw httpError("This helper only accepts local requests.", 403);
  }
  const origin = req.headers.origin;
  if (origin) {
    let url;
    try {
      url = new URL(origin);
    } catch {
      throw httpError("Invalid origin.", 403);
    }
    if (
      (url.hostname !== "127.0.0.1" &&
        url.hostname !== "localhost" &&
        url.hostname !== "[::1]") ||
      (url.port && url.port !== String(port))
    ) {
      throw httpError("Cross-origin request refused.", 403);
    }
  }
}

async function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(httpError("文件太大，超过 260 MB 限制。", 413));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const body = await readBody(req, 4 * 1024 * 1024);
  if (!body.length) return {};
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw httpError("请求内容不是合法的 JSON。");
  }
}

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

async function loadConfig() {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      storage: { ...DEFAULT_CONFIG.storage, ...(parsed.storage || {}) },
      git: { ...DEFAULT_CONFIG.git, ...(parsed.git || {}) },
    };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function saveConfig(next) {
  config = {
    ...DEFAULT_CONFIG,
    ...next,
    storage: { ...DEFAULT_CONFIG.storage, ...(next.storage || {}) },
    git: { ...DEFAULT_CONFIG.git, ...(next.git || {}) },
  };
  await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  try {
    await import("node:fs/promises").then((fs) => fs.chmod(CONFIG_PATH, 0o600));
  } catch {
    /* Windows: permissions are handled by the profile ACL */
  }
  b2 = null;
}

function isConfigured() {
  if (!config) return false;
  if (config.storage.mode === "local") return true;
  return Boolean(
    config.storage.keyId &&
      config.storage.appKey &&
      (config.storage.bucketId || config.storage.bucketName)
  );
}

function publicConfig() {
  return {
    mode: config?.storage?.mode || "local",
    bucketName: config?.storage?.bucketName || "",
    bucketId: config?.storage?.bucketId || "",
    publicBaseUrl: config?.storage?.publicBaseUrl || "",
    thumbPrefix: config?.storage?.thumbPrefix || "jpg/",
    fullPrefix: config?.storage?.fullPrefix || "full/",
    git: config?.git || DEFAULT_CONFIG.git,
    autoPublish: config?.autoPublish !== false,
    port,
    configured: isConfigured(),
  };
}

/* ------------------------------------------------------------------ */
/* ImageInfo                                                           */
/* ------------------------------------------------------------------ */

async function readImageInfo() {
  const raw = await readFile(IMAGEINFO_PATH, "utf8");
  let data;
  try {
    data = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    throw httpError("ImageInfo.json 不是合法的 JSON。", 500);
  }
  if (!Array.isArray(data.ImageInfo)) {
    throw httpError("ImageInfo.json 缺少 ImageInfo 数组。", 500);
  }
  return { data, raw };
}

function rowTotals(imageInfo) {
  const totals = { 1: 0, 2: 0 };
  for (const image of imageInfo.ImageInfo) {
    totals[image.Flow === 2 ? 2 : 1] += Number(image.WHRatio) || 0;
  }
  return totals;
}

/** Rebuild every position exactly like the original generator: walk from the
 * newest item to the oldest, place it after the current row length, then
 * extend that row. Existing IDs, dates and flow assignments are untouched. */
function recomputeLayout(imageInfo) {
  const lengths = { 1: 0, 2: 0 };
  const counts = { 1: 0, 2: 0 };
  for (let i = imageInfo.ImageInfo.length - 1; i >= 0; i -= 1) {
    const image = imageInfo.ImageInfo[i];
    const flow = image.Flow === 2 ? 2 : 1;
    const width = Number(image.WHRatio) || 0;
    image.PositionL = lengths[flow];
    image.PositionR = lengths[flow] + width;
    image.Num = (counts[flow] += 1);
    lengths[flow] += width;
  }
  imageInfo.Flow1Num = counts[1];
  imageInfo.Flow2Num = counts[2];
  imageInfo.Flow1Length = lengths[1];
  imageInfo.Flow2Length = lengths[2];
  imageInfo.FlowLength = Math.max(lengths[1], lengths[2]) + 13;
  return imageInfo;
}

function makeEntry({ name, ratio, date, flow, fullPath, thumbPath }) {
  // Keep the original key order for clean diffs in ImageInfo.json.
  const entry = {
    PositionL: 0,
    WHRatio: ratio,
    Num: 0,
    PositionR: ratio,
    DateModified: date,
    Name: name,
    Flow: flow,
  };
  if (fullPath) entry.FullPath = fullPath;
  if (thumbPath) entry.ThumbPath = thumbPath;
  return entry;
}

/* ------------------------------------------------------------------ */
/* B2 storage                                                          */
/* ------------------------------------------------------------------ */

function b2Credentials() {
  const storage = config?.storage || {};
  if (!storage.keyId || !storage.appKey) {
    throw httpError("尚未配置 B2 密钥。", 400);
  }
  return {
    keyId: storage.keyId,
    appKey: storage.appKey,
    apiBase: storage.apiBase,
  };
}

async function b2Authorize(credentials = b2Credentials()) {
  const basic = Buffer.from(
    `${credentials.keyId}:${credentials.appKey}`,
    "utf8"
  ).toString("base64");
  const apiBase = (
    credentials.apiBase ||
    config?.storage?.apiBase ||
    "https://api.backblazeb2.com"
  ).replace(/\/+$/, "");
  const response = await fetch(`${apiBase}/b2api/v3/b2_authorize_account`, {
    headers: { Authorization: `Basic ${basic}` },
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text;
    try {
      message = JSON.parse(text).message || text;
    } catch {
      /* leave as text */
    }
    throw httpError(`B2 授权失败：${message}`, 400);
  }
  const data = JSON.parse(text);
  const storage = data.apiInfo?.storageApi || data.apiInfo || data;
  const apiUrl = storage.apiUrl || data.apiUrl;
  const authorizationToken =
    data.authorizationToken ||
    storage.authorizationToken ||
    data.apiInfo?.storageApi?.authorizationToken;
  const accountId = data.accountId || storage.accountId;
  if (!apiUrl || !authorizationToken) {
    throw httpError("B2 授权响应缺少 apiUrl 或 token。", 502);
  }
  return {
    accountId,
    apiUrl,
    authorizationToken,
    downloadUrl: storage.downloadUrl || data.downloadUrl || "",
    bucketId: storage.bucketId || "",
    bucketName: storage.bucketName || "",
    capabilities: storage.capabilities || data.capabilities || [],
  };
}

async function b2Post(url, token, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: token,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text;
    try {
      message = JSON.parse(text).message || text;
    } catch {
      /* leave as text */
    }
    throw httpError(`B2 请求失败：${message}`, 502);
  }
  return JSON.parse(text);
}

async function b2ListBuckets(auth) {
  const result = await b2Post(
    `${auth.apiUrl}/b2api/v3/b2_list_buckets`,
    auth.authorizationToken,
    { accountId: auth.accountId }
  );
  return result.buckets || [];
}

async function getB2Auth(force = false) {
  const credentials = b2Credentials();
  const key = `${credentials.apiBase || ""}|${credentials.keyId}:${credentials.appKey}`;
  if (
    !force &&
    b2 &&
    b2.key === key &&
    Date.now() - b2.at < 20 * 60 * 60 * 1000
  ) {
    return b2.auth;
  }
  const auth = await b2Authorize(credentials);
  b2 = { key, at: Date.now(), auth };
  return auth;
}

function encodeB2Name(name) {
  return name
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

const CONTENT_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

async function b2Upload(fileName, buffer, contentType) {
  const auth = await getB2Auth();
  const bucketId = config.storage.bucketId || auth.bucketId;
  if (!bucketId) throw httpError("B2 配置缺少 bucketId。", 400);
  const upload = await b2Post(
    `${auth.apiUrl}/b2api/v3/b2_get_upload_url`,
    auth.authorizationToken,
    { bucketId }
  );
  const sha1 = crypto.createHash("sha1").update(buffer).digest("hex");
  const response = await fetch(upload.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: upload.authorizationToken,
      "X-Bz-File-Name": encodeB2Name(fileName),
      "Content-Type": contentType,
      "X-Bz-Content-Sha1": sha1,
    },
    body: buffer,
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text;
    try {
      message = JSON.parse(text).message || text;
    } catch {
      /* leave as text */
    }
    throw httpError(`B2 上传失败：${message}`, 502);
  }
  return JSON.parse(text);
}

async function localWrite(fileName, buffer) {
  const target = path.resolve(MEDIA_DIR, fileName);
  if (!target.startsWith(MEDIA_DIR + path.sep)) {
    throw httpError("非法文件路径。", 400);
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
}

async function storeFile({
  fileName,
  buffer,
  contentType,
  localPath,
}) {
  if (config.storage.mode === "local") {
    await localWrite(fileName, buffer);
    return { path: localPath, fileId: null };
  }
  const result = await b2Upload(fileName, buffer, contentType);
  return { path: fileName, fileId: result.fileId };
}

/* ------------------------------------------------------------------ */
/* Git publish                                                         */
/* ------------------------------------------------------------------ */

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    timeout: 120000,
    ...options,
  });
}

function gitRepo() {
  try {
    git(["rev-parse", "--show-toplevel"]);
    return true;
  } catch {
    return false;
  }
}

async function publishChanges(commitMessage) {
  if (!config?.git?.enabled) {
    return { ok: true, skipped: true, message: "Git 发布已关闭。" };
  }
  if (!gitRepo()) {
    throw httpError(
      "当前目录不是 git 仓库。请把网站放在 clone 下来的 laboner6.github.io 目录里运行。",
      400
    );
  }
  const status = git(["status", "--porcelain", "--", "ImageInfo.json"]);
  if (!status.trim()) {
    return { ok: true, noChanges: true, message: "ImageInfo.json 没有变化。" };
  }
  git(["add", "--", "ImageInfo.json"]);
  try {
    git([
      "commit",
      "-m",
      commitMessage ||
        `Update gallery metadata (${new Date().toISOString().slice(0, 10)})`,
      "--",
      "ImageInfo.json",
    ]);
  } catch (error) {
    const output = `${error.stdout || ""}${error.stderr || ""}`.trim();
    throw httpError(
      `git commit 失败：${output || error.message}\n请先设置 git user.name / user.email。`,
      500
    );
  }
  let pushOutput = "";
  if (config.git.push) {
    try {
      pushOutput = git([
        "push",
        config.git.remote || "origin",
        config.git.branch || "master",
      ]);
    } catch (error) {
      const output = `${error.stdout || ""}${error.stderr || ""}`.trim();
      throw httpError(
        `已提交到本地，但 push 失败：${output || error.message}\n可稍后在终端手动执行 git push。`,
        502
      );
    }
  }
  lastPublish = { at: new Date().toISOString(), message: "pushed" };
  return {
    ok: true,
    message: config.git.push
      ? "已提交并推送到 GitHub，Pages 通常会在 1 分钟内更新。"
      : "已提交到本地仓库（未推送）。",
    output: pushOutput,
  };
}

/* ------------------------------------------------------------------ */
/* Upload API                                                          */
/* ------------------------------------------------------------------ */

function detectImageType(file) {
  const type = String(file.type || "").toLowerCase();
  if (type === "image/jpeg") return { ext: "jpg", mime: "image/jpeg" };
  if (type === "image/png") return { ext: "png", mime: "image/png" };
  if (type === "image/webp") return { ext: "webp", mime: "image/webp" };
  if (type === "image/avif") return { ext: "avif", mime: "image/avif" };
  throw httpError("只支持 JPG / PNG / WebP / AVIF 图片。", 415);
}

async function handleUpload(req, res) {
  if (!isConfigured()) {
    throw httpError("请先在管理页完成存储配置。", 400);
  }
  const contentType = req.headers["content-type"] || "";
  if (!contentType.startsWith("multipart/form-data")) {
    throw httpError("上传格式必须是 multipart/form-data。", 415);
  }
  const body = await readBody(req);
  const form = await new Response(body, {
    headers: { "content-type": contentType },
  }).formData();

  const full = form.get("full");
  const thumb = form.get("thumb");
  const isFileLike = (value) =>
    value &&
    typeof value === "object" &&
    typeof value.arrayBuffer === "function" &&
    typeof value.type === "string";
  if (!isFileLike(full) || !isFileLike(thumb)) {
    throw httpError("缺少图片文件。", 400);
  }
  const kind = detectImageType(full);
  if (!String(thumb.type).startsWith("image/")) {
    throw httpError("缩略图格式无效。", 415);
  }
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 2 ||
    height < 2 ||
    width > 20000 ||
    height > 20000
  ) {
    throw httpError("图片尺寸无效。", 400);
  }
  const date = parseDateInput(form.get("date"));
  const fullBuffer = Buffer.from(await full.arrayBuffer());
  const thumbBuffer = Buffer.from(await thumb.arrayBuffer());
  if (!fullBuffer.length) throw httpError("原图为空。", 400);

  return enqueueUpload(async () => {
    const { data } = await readImageInfo();
    const number = nextImageNumber(data);
    const name = `Star_Citizen_${padId(number)}`;
    const totals = rowTotals(data);
    const flow = totals[1] <= totals[2] ? 1 : 2;
    const thumbPrefix = normalizePrefix(
      config.storage.thumbPrefix,
      "jpg/"
    );
    const fullPrefix = normalizePrefix(
      config.storage.fullPrefix,
      "full/"
    );
    const thumbName = `${thumbPrefix}${name}.jpg`;
    const fullName = `${fullPrefix}${name}.${kind.ext}`;

    const thumbStored = await storeFile({
      fileName: thumbName,
      buffer: thumbBuffer,
      contentType: "image/jpeg",
      localPath: `/media/${thumbName}`,
    });
    const fullStored = await storeFile({
      fileName: fullName,
      buffer: fullBuffer,
      contentType: kind.mime,
      localPath: `/media/${fullName}`,
    });

    const meta = {
      ratio: width / height,
      date,
      fullPath: fullStored.path,
      thumbPath:
        config.storage.mode === "local" || thumbPrefix !== "jpg/"
          ? thumbStored.path
          : "",
    };
    const entry = makeEntry({ ...meta, name, flow });
    data.ImageInfo.push(entry);
    recomputeLayout(data);
    await writeFile(IMAGEINFO_PATH, JSON.stringify(data), "utf8");
    return {
      ok: true,
      entry,
      index: data.ImageInfo.length - 1,
      thumbUrl: publicUrlFor(entry, "thumb"),
      fullUrl: publicUrlFor(entry, "full"),
      total: data.ImageInfo.length,
    };
  });
}

function enqueueUpload(task) {
  const run = uploadQueue.then(task, task);
  uploadQueue = run.catch(() => {});
  return run;
}

function publicUrlFor(entry, which) {
  const storage = config?.storage || DEFAULT_CONFIG.storage;
  const thumbPrefix = normalizePrefix(storage.thumbPrefix, "jpg/");
  const value =
    which === "thumb"
      ? entry.ThumbPath || `${thumbPrefix}${entry.Name}.jpg`
      : entry.FullPath || `png/${entry.Name}.png`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;
  const base =
    normalizeBaseUrl(storage.publicBaseUrl) || "https://img.lapernum.site";
  return `${base}/${value.replace(/^\/+/, "")}`;
}

/* ------------------------------------------------------------------ */
/* API routes                                                          */
/* ------------------------------------------------------------------ */

async function apiRoute(req, res, pathname) {
  checkLocalRequest(req);
  if (req.method !== "GET" && req.method !== "POST") {
    throw httpError("Method not allowed", 405);
  }

  if (pathname === "/api/health" && req.method === "GET") {
    let imageCount = 0;
    let lastId = null;
    let lastDate = null;
    try {
      const { data } = await readImageInfo();
      imageCount = data.ImageInfo.length;
      const last = data.ImageInfo[data.ImageInfo.length - 1];
      lastId = last ? last.Name : null;
      lastDate = data.ImageInfo.reduce(
        (max, image) =>
          String(image.DateModified || "") > max
            ? String(image.DateModified || "")
            : max,
        ""
      );
    } catch {
      /* keep zeros */
    }
    return sendJson(res, 200, {
      ok: true,
      version: VERSION,
      configured: isConfigured(),
      storageMode: config?.storage?.mode || "local",
      imageCount,
      lastId,
      lastDate,
      gitRepo: gitRepo(),
      lastPublish,
      siteUrl: `http://127.0.0.1:${port}/`,
    });
  }

  if (pathname === "/api/config" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, ...publicConfig() });
  }

  if (pathname === "/api/setup" && req.method === "POST") {
    const body = await readJson(req);
    const mode = body.mode === "b2" ? "b2" : "local";
    const next = {
      ...DEFAULT_CONFIG,
      ...(config || {}),
      port,
      storage: { ...DEFAULT_CONFIG.storage, ...(config?.storage || {}) },
      git: { ...DEFAULT_CONFIG.git, ...(config?.git || {}) },
    };
    next.autoPublish = body.autoPublish !== false;
    if (body.git) {
      next.git = {
        ...next.git,
        enabled: body.git.enabled !== false,
        push: body.git.push !== false,
        remote: String(body.git.remote || "origin"),
        branch: String(body.git.branch || "master"),
      };
    }

    if (mode === "local") {
      next.storage = {
        ...next.storage,
        mode: "local",
        publicBaseUrl:
          normalizeBaseUrl(body.publicBaseUrl) ||
          next.storage.publicBaseUrl ||
          "https://img.lapernum.site",
      };
      await saveConfig(next);
      await mkdir(MEDIA_DIR, { recursive: true });
      return sendJson(res, 200, {
        ok: true,
        mode: "local",
        message: "已切换到本地预览模式。图片只保存在本机，不会部署。",
      });
    }

    const keyId = String(body.keyId || config?.storage?.keyId || "").trim();
    const appKey = String(body.appKey || config?.storage?.appKey || "").trim();
    const bucketName = String(body.bucketName || "").trim();
    const publicBaseUrl = normalizeBaseUrl(body.publicBaseUrl);
    if (!keyId || !appKey) throw httpError("请填写 B2 key ID 和 application key。");
    if (!bucketName) throw httpError("请填写 B2 bucket 名称。");
    if (!/^https?:\/\//i.test(publicBaseUrl)) {
      throw httpError("请填写图片公开访问前缀，例如 https://img.lapernum.site。");
    }

    const auth = await b2Authorize({
      keyId,
      appKey,
      apiBase: body.apiBase || next.storage.apiBase,
    });
    const buckets = await b2ListBuckets(auth);
    const bucket =
      buckets.find((item) => item.bucketName === bucketName) ||
      buckets.find((item) => item.bucketId === bucketName);
    if (!bucket) {
      throw httpError(
        `找不到 bucket "${bucketName}"。可用的 bucket：${buckets
          .map((item) => item.bucketName)
          .join("、") || "（无）"}`,
        400
      );
    }

    next.storage = {
      ...next.storage,
      mode: "b2",
      keyId,
      appKey,
      bucketId: bucket.bucketId,
      bucketName: bucket.bucketName,
      publicBaseUrl,
      thumbPrefix: normalizePrefix(
        body.thumbPrefix || next.storage.thumbPrefix,
        "jpg/"
      ),
      fullPrefix: normalizePrefix(
        body.fullPrefix || next.storage.fullPrefix,
        "full/"
      ),      apiBase: String(
        body.apiBase || next.storage.apiBase || "https://api.backblazeb2.com"
      ).replace(/\/+$/, ""),
    };
    await saveConfig(next);
    return sendJson(res, 200, {
      ok: true,
      mode: "b2",
      bucket: {
        id: bucket.bucketId,
        name: bucket.bucketName,
        type: bucket.bucketType,
      },
      message: `已连接 B2 bucket：${bucket.bucketName}`,
    });
  }

  if (pathname === "/api/test-storage" && req.method === "POST") {
    if (!isConfigured()) throw httpError("尚未配置存储。", 400);
    if (config.storage.mode === "local") {
      await mkdir(MEDIA_DIR, { recursive: true });
      return sendJson(res, 200, {
        ok: true,
        mode: "local",
        message: "本地预览目录可用。",
      });
    }
    const auth = await getB2Auth(true);
    const buckets = await b2ListBuckets(auth);
    const found = buckets.find(
      (item) =>
        item.bucketId === config.storage.bucketId ||
        item.bucketName === config.storage.bucketName
    );
    if (!found) throw httpError("B2 连接成功，但找不到配置的 bucket。", 400);
    return sendJson(res, 200, {
      ok: true,
      mode: "b2",
      bucket: found.bucketName,
      message: `B2 连接正常：${found.bucketName}`,
    });
  }

  if (pathname === "/api/upload" && req.method === "POST") {
    const result = await handleUpload(req, res);
    return sendJson(res, 200, result);
  }

  if (pathname === "/api/recent" && req.method === "GET") {
    const { data } = await readImageInfo();
    const items = data.ImageInfo.slice(-10)
      .reverse()
      .map((entry, offset) => ({
        index: data.ImageInfo.length - 1 - offset,
        name: entry.Name,
        date: entry.DateModified,
        thumbUrl: publicUrlFor(entry, "thumb"),
      }));
    return sendJson(res, 200, { ok: true, items });
  }

  if (pathname === "/api/publish" && req.method === "POST") {
    const body = await readJson(req).catch(() => ({}));
    const count = body.count ? ` · ${body.count} 张新作品` : "";
    const result = await publishChanges(
      `Add photographs${count} (${new Date()
        .toISOString()
        .slice(0, 10)})`
    );
    return sendJson(res, 200, result);
  }

  throw httpError("Not found", 404);
}

/* ------------------------------------------------------------------ */
/* Static files                                                        */
/* ------------------------------------------------------------------ */

const BLOCKED_PATHS = new Set([
  "admin/config.json",
  "admin/.tmp",
  "admin/cache",
  "package.json",
  "package-lock.json",
]);

async function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405).end();
    return;
  }
  let relative = decodeURIComponent(pathname);
  if (relative === "/") relative = "/index.html";
  if (relative === "/admin") {
    res.writeHead(302, { location: "/admin/" }).end();
    return;
  }
  if (relative.endsWith("/")) relative += "index.html";
  relative = relative.replace(/^\/+/, "");

  if (
    relative.split("/").some((part) => part.startsWith(".")) ||
    BLOCKED_PATHS.has(relative)
  ) {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
    return;
  }

  const file =
    relative.startsWith("media/") && req.url.startsWith("/media/")
      ? path.resolve(ADMIN_DIR, relative)
      : path.resolve(ROOT, relative);

  if (!file.startsWith(ROOT + path.sep) && !file.startsWith(ADMIN_DIR + path.sep)) {
    res.writeHead(403).end();
    return;
  }

  let info;
  try {
    info = await stat(file);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end(
      "Not found"
    );
    return;
  }
  if (!info.isFile()) {
    res.writeHead(404).end();
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const cache =
    ext === ".html" || ext === ".json" || ext === ".js" || ext === ".css"
      ? "no-cache"
      : "public, max-age=3600";
  res.writeHead(200, {
    "content-type": MIME[ext] || "application/octet-stream",
    "content-length": info.size,
    "cache-control": cache,
    "x-content-type-options": "nosniff",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
}

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */

async function handler(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await apiRoute(req, res, url.pathname);
      return;
    }
    await serveStatic(req, res, url.pathname);
  } catch (error) {
    if (!error.status) console.error(error);
    if (res.headersSent) {
      res.end();
      return;
    }
    sendJson(res, error.status || 500, {
      ok: false,
      error: error.message || "服务器错误",
    });
  }
}

async function openBrowser(url) {
  try {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } else if (process.platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    }
  } catch {
    /* the URL is printed below anyway */
  }
}

async function start() {
  await mkdir(TMP_DIR, { recursive: true });
  await mkdir(MEDIA_DIR, { recursive: true });
  config = await loadConfig();
  if (config?.port) port = Number(config.port) || port;

  const server = http.createServer((req, res) => {
    handler(req, res).catch((error) => {
      console.error(error);
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: "服务器错误" });
    });
  });

  let attempts = 0;
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && attempts < 5) {
      attempts += 1;
      port += 1;
      log(`端口被占用，尝试 ${port} ...`);
      server.listen(port, "127.0.0.1");
      return;
    }
    console.error(error);
    process.exit(1);
  });

  server.listen(port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${port}/`;
    console.log("");
    console.log("  影記 · LAPERGRAPHY content studio");
    console.log("  ------------------------------------------------");
    console.log(`  管理页面  ${url}admin/`);
    console.log(`  网站预览  ${url}`);
    console.log(
      `  存储模式  ${config?.storage?.mode === "b2" ? "Backblaze B2" : "本地预览"}`
    );
    console.log(`  仓库目录  ${ROOT}`);
    if (!isConfigured()) {
      console.log("  尚未配置，请在管理页面完成设置。");
    }
    console.log("");
    if (!process.argv.includes("--no-open")) openBrowser(`${url}admin/`);
  });

  const shutdown = () => {
    log("关闭管理服务器");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 800).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
