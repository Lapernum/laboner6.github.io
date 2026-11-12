/* Local content studio. Talks only to the Node helper on 127.0.0.1. */

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
if (!LOCAL_HOSTS.has(window.location.hostname)) {
  document.body.innerHTML =
    '<main class="local-only-screen"><p class="eyebrow">LOCAL ONLY</p>' +
    "<h1>管理台只在本机运行</h1>" +
    "<p>这个页面需要配合 <code>node admin/server.mjs</code> 使用。" +
    "请在自己的电脑上双击 <code>start-admin.cmd</code>，再打开 " +
    "<code>http://127.0.0.1:8787/admin/</code>。</p></main>";
  throw new Error("The content studio is local-only.");
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const state = {
  health: null,
  config: null,
  queue: [],
  uploading: false,
  nextNumber: null,
};

const els = {
  headerStatus: $("#headerStatus"),
  headerStatusText: $("#headerStatusText"),
  themeBtn: $("#themeBtn"),
  setupPanel: $("#setupPanel"),
  setupForm: $("#setupForm"),
  setupClose: $("#setupClose"),
  setupError: $("#setupError"),
  setupSave: $("#setupSave"),
  modeLocal: $("#modeLocal"),
  b2KeyId: $("#b2KeyId"),
  b2AppKey: $("#b2AppKey"),
  b2Bucket: $("#b2Bucket"),
  b2PublicBase: $("#b2PublicBase"),
  b2ThumbPrefix: $("#b2ThumbPrefix"),
  b2FullPrefix: $("#b2FullPrefix"),
  gitRemote: $("#gitRemote"),
  gitBranch: $("#gitBranch"),
  gitEnabled: $("#gitEnabled"),
  gitPush: $("#gitPush"),
  dropZone: $("#dropZone"),
  fileInput: $("#fileInput"),
  pickBtn: $("#pickBtn"),
  queueHead: $("#queueHead"),
  queue: $("#queue"),
  queueCount: $("#queueCount"),
  clearQueue: $("#clearQueue"),
  sortQueue: $("#sortQueue"),
  uploadBar: $("#uploadBar"),
  autoPublish: $("#autoPublish"),
  uploadBtn: $("#uploadBtn"),
  uploadSummary: $("#uploadSummary"),
  publishResult: $("#publishResult"),
  nextIdHint: $("#nextIdHint"),
  statusStorage: $("#statusStorage"),
  statusBucket: $("#statusBucket"),
  statusCount: $("#statusCount"),
  statusLastId: $("#statusLastId"),
  statusLastDate: $("#statusLastDate"),
  statusGit: $("#statusGit"),
  statusPublish: $("#statusPublish"),
  storageHint: $("#storageHint"),
  refreshStatus: $("#refreshStatus"),
  testStorage: $("#testStorage"),
  reconfigureBtn: $("#reconfigureBtn"),
  recentList: $("#recentList"),
  toast: $("#toast"),
};

let toastTimer = 0;
function toast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.style.background = isError ? "var(--danger)" : "var(--ink)";
  els.toast.style.color = isError ? "#1b1111" : "var(--bg)";
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 3000);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    /* non-JSON error */
  }
  if (!response.ok || (data && data.ok === false)) {
    throw new Error((data && data.error) || `HTTP ${response.status}`);
  }
  return data;
}

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

function initTheme() {
  const root = document.documentElement;
  const apply = (theme, store) => {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    els.themeBtn.setAttribute(
      "aria-label",
      theme === "light" ? "切换到深色模式" : "切换到浅色模式"
    );
    if (store) localStorage.setItem("theme", theme);
  };
  apply(root.dataset.theme === "light" ? "light" : "dark", false);
  els.themeBtn.addEventListener("click", () => {
    apply(root.dataset.theme === "light" ? "dark" : "light", true);
  });
}

/* ------------------------------------------------------------------ */
/* Status / setup                                                      */
/* ------------------------------------------------------------------ */

async function loadAll() {
  try {
    const [health, config] = await Promise.all([
      api("/api/health"),
      api("/api/config"),
    ]);
    state.health = health;
    state.config = config;
    state.nextNumber = nextNumberFromName(health.lastId);
    renderStatus();
    renderConfig();
    await loadRecent();
  } catch (error) {
    setHeaderStatus("error", "管理服务器未响应");
    toast(`无法连接管理服务器：${error.message}`, true);
  }
}

function setHeaderStatus(kind, text) {
  els.headerStatus.classList.toggle("is-ok", kind === "ok");
  els.headerStatus.classList.toggle("is-error", kind === "error");
  els.headerStatusText.textContent = text;
}

function nextNumberFromName(name) {
  const match = /^Star_Citizen_(\d+)$/.exec(String(name || ""));
  return match ? Number(match[1]) + 1 : null;
}

function renderStatus() {
  const { health, config } = state;
  if (!health || !config) return;
  const configured = config.configured;
  setHeaderStatus(
    configured ? "ok" : "warn",
    configured
      ? config.mode === "b2"
        ? "B2 已连接"
        : "本地预览模式"
      : "尚未配置"
  );
  els.statusStorage.textContent =
    config.mode === "b2" ? "Backblaze B2" : "本地预览";
  els.statusBucket.textContent = config.bucketName || "—";
  els.statusCount.textContent = String(health.imageCount ?? "—");
  els.statusLastId.textContent = health.lastId || "—";
  els.statusLastDate.textContent = health.lastDate || "—";
  els.statusGit.textContent = health.gitRepo
    ? `${config.git.enabled ? "已启用" : "已关闭"} · ${config.git.branch}`
    : "不是 git 仓库";
  els.statusPublish.textContent = health.lastPublish
    ? new Date(health.lastPublish.at).toLocaleString()
    : "—";
  els.storageHint.textContent =
    config.mode === "local"
      ? "本地预览：图片写入 admin/media/，只在本机可见，不能部署。"
      : `图片公开地址：${config.publicBaseUrl || "未填写"}`;

  els.nextIdHint.textContent = `Star_Citizen_${String(
    state.nextNumber ?? 0
  ).padStart(5, "0")}`;
  els.uploadBtn.disabled =
    !configured || state.uploading || !state.queue.some((item) => item.status === "ready");
  els.autoPublish.disabled =
    !configured || config.mode === "local" || !config.git.enabled;
  if (els.autoPublish.disabled) els.autoPublish.checked = false;

  if (!configured) {
    els.setupPanel.hidden = false;
    els.setupClose.hidden = true;
  } else {
    els.setupClose.hidden = false;
  }
}

function renderConfig() {
  const config = state.config;
  if (!config) return;
  els.b2Bucket.value = config.bucketName || "";
  els.b2PublicBase.value = config.publicBaseUrl || "https://img.lapernum.site";
  els.b2ThumbPrefix.value = config.thumbPrefix || "jpg/";
  els.b2FullPrefix.value = config.fullPrefix || "full/";
  els.gitRemote.value = config.git.remote || "origin";
  els.gitBranch.value = config.git.branch || "master";
  els.gitEnabled.checked = config.git.enabled !== false;
  els.gitPush.checked = config.git.push !== false;
  if (config.configured) {
    els.b2KeyId.placeholder = "已保存，留空沿用";
    els.b2AppKey.placeholder = "已保存，留空沿用";
  }
}

async function loadRecent() {
  try {
    const data = await api("/api/recent");
    els.recentList.innerHTML = "";
    if (!data.items || !data.items.length) {
      els.recentList.innerHTML = '<p class="empty">还没有上传记录。</p>';
      return;
    }
    for (const item of data.items) {
      const link = document.createElement("a");
      link.className = "recent-item";
      link.href = `/?targetId=${item.index}`;
      link.target = "_blank";
      link.rel = "noopener";
      link.title = `${item.name} · ${item.date}`;
      const img = document.createElement("img");
      img.loading = "lazy";
      img.alt = item.name;
      img.src = item.thumbUrl;
      img.addEventListener("error", () => {
        img.remove();
        link.style.background = "var(--bg-soft)";
      });
      const label = document.createElement("span");
      label.textContent = item.name.replace("Star_Citizen_", "#");
      link.appendChild(img);
      link.appendChild(label);
      els.recentList.appendChild(link);
    }
  } catch {
    els.recentList.innerHTML = '<p class="empty">读取失败。</p>';
  }
}

function showSetup() {
  els.setupPanel.hidden = false;
  els.setupPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  const first = els.setupPanel.querySelector("input:not([type=checkbox])");
  if (first) setTimeout(() => first.focus(), 350);
}

async function saveSetup(event) {
  event.preventDefault();
  els.setupError.hidden = true;
  els.setupSave.disabled = true;
  els.setupSave.textContent = "连接中…";
  try {
    const body = {
      mode: "b2",
      keyId: els.b2KeyId.value.trim(),
      appKey: els.b2AppKey.value.trim(),
      bucketName: els.b2Bucket.value.trim(),
      publicBaseUrl: els.b2PublicBase.value.trim(),
      thumbPrefix: els.b2ThumbPrefix.value.trim(),
      fullPrefix: els.b2FullPrefix.value.trim(),
      git: {
        enabled: els.gitEnabled.checked,
        push: els.gitPush.checked,
        remote: els.gitRemote.value.trim() || "origin",
        branch: els.gitBranch.value.trim() || "master",
      },
    };
    if (!body.keyId && !state.config?.configured) {
      throw new Error("请填写 B2 Key ID。");
    }
    if (!body.appKey && !state.config?.configured) {
      throw new Error("请填写 B2 Application Key。");
    }
    const result = await api("/api/setup", {
      method: "POST",
      body: JSON.stringify(body),
    });
    toast(result.message || "B2 已连接");
    await loadAll();
    els.setupPanel.hidden = true;
    els.b2AppKey.value = "";
    els.b2KeyId.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    els.setupError.textContent = error.message;
    els.setupError.hidden = false;
  } finally {
    els.setupSave.disabled = false;
    els.setupSave.textContent = "保存并测试连接";
  }
}

async function useLocalMode() {
  els.setupError.hidden = true;
  try {
    const result = await api("/api/setup", {
      method: "POST",
      body: JSON.stringify({
        mode: "local",
        publicBaseUrl:
          els.b2PublicBase.value.trim() || "https://img.lapernum.site",
        git: {
          enabled: els.gitEnabled.checked,
          push: els.gitPush.checked,
          remote: els.gitRemote.value.trim() || "origin",
          branch: els.gitBranch.value.trim() || "master",
        },
      }),
    });
    toast(result.message || "已切换到本地预览模式");
    await loadAll();
    els.setupPanel.hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    els.setupError.textContent = error.message;
    els.setupError.hidden = false;
  }
}

async function testStorage() {
  els.testStorage.disabled = true;
  els.testStorage.textContent = "测试中…";
  try {
    const result = await api("/api/test-storage", {
      method: "POST",
      body: "{}",
    });
    toast(result.message || "连接正常");
  } catch (error) {
    toast(error.message, true);
  } finally {
    els.testStorage.disabled = false;
    els.testStorage.textContent = "测试存储连接";
  }
}

/* ------------------------------------------------------------------ */
/* Image inspection                                                    */
/* ------------------------------------------------------------------ */

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatTimestamp(ms) {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )} ${pad2(date.getHours())}-${pad2(date.getMinutes())}-${pad2(
    date.getSeconds()
  )}`;
}

function dateInputValue(dateText) {
  return String(dateText).replace(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2})-(\d{2})-(\d{2})$/,
    "$1T$2:$3:$4"
  );
}

function readAscii(view, start, length) {
  let text = "";
  for (let i = 0; i < length; i += 1) text += String.fromCharCode(view.getUint8(start + i));
  return text;
}

function parseExifDate(view, tiffStart) {
  if (tiffStart + 8 > view.byteLength) return null;
  const endian = view.getUint16(tiffStart) === 0x4949 ? true : false;
  const magic = view.getUint16(tiffStart + 2, endian);
  if (magic !== 42) return null;
  const ifd0 = view.getUint32(tiffStart + 4, endian);
  if (!ifd0 || tiffStart + ifd0 + 2 > view.byteLength) return null;

  const readIfd = (relativeOffset) => {
    const offset = tiffStart + relativeOffset;
    if (offset + 2 > view.byteLength) return new Map();
    const count = view.getUint16(offset, endian);
    const map = new Map();
    for (let i = 0; i < count; i += 1) {
      const entry = offset + 2 + i * 12;
      if (entry + 12 > view.byteLength) break;
      const tag = view.getUint16(entry, endian);
      const type = view.getUint16(entry + 2, endian);
      const length = view.getUint32(entry + 4, endian);
      const valueOffset = view.getUint32(entry + 8, endian);
      map.set(tag, { type, length, valueOffset, entry });
    }
    return map;
  };

  const readString = (item) => {
    if (!item || item.type !== 2 || item.length < 8) return null;
    const start =
      item.length <= 4 ? item.entry + 8 : tiffStart + item.valueOffset;
    if (start + item.length > view.byteLength) return null;
    return readAscii(view, start, item.length).replace(/\0+$/, "");
  };

  let ifdMap = readIfd(ifd0);
  const exifPointer = ifdMap.get(0x8769);
  let dateText = null;
  if (exifPointer) {
    const exifMap = readIfd(exifPointer.valueOffset);
    dateText = readString(exifMap.get(0x9003)) || readString(exifMap.get(0x9004));
  }
  if (!dateText) dateText = readString(ifdMap.get(0x0132));
  if (!dateText) return null;
  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(
    dateText
  );
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 1990 || year > 2100) return null;
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}-${match[5]}-${match[6]}`;
}

async function readExifDate(file) {
  if (!/jpe?g/i.test(file.type)) return null;
  try {
    const buffer = await file.slice(0, 262144).arrayBuffer();
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return null;
    let offset = 2;
    while (offset + 4 < view.byteLength) {
      if (view.getUint8(offset) !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = view.getUint8(offset + 1);
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      if (offset + 4 > view.byteLength) return null;
      const length = view.getUint16(offset + 2, false);
      if (length < 2) return null;
      if (marker === 0xe1) {
        const start = offset + 4;
        if (start + 6 <= view.byteLength && readAscii(view, start, 4) === "Exif") {
          return parseExifDate(view, start + 6);
        }
      }
      offset += 2 + length;
    }
  } catch {
    return null;
  }
  return null;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("无法生成缩略图"));
    }, type, quality);
  });
}

async function inspectImage(file) {
  let source = null;
  let objectUrl = null;
  let width = 0;
  let height = 0;
  try {
    if (typeof createImageBitmap === "function") {
      source = await createImageBitmap(file, { imageOrientation: "from-image" });
      width = source.width;
      height = source.height;
    }
  } catch {
    source = null;
  }
  if (!source) {
    objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;
    await img.decode();
    source = img;
    width = img.naturalWidth;
    height = img.naturalHeight;
  }
  if (!width || !height) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    throw new Error("无法读取图片尺寸");
  }

  const maxEdge = 3200;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const thumbWidth = Math.max(1, Math.round(width * scale));
  const thumbHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = thumbWidth;
  canvas.height = thumbHeight;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#111418";
  context.fillRect(0, 0, thumbWidth, thumbHeight);
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, thumbWidth, thumbHeight);
  const thumbBlob = await canvasToBlob(canvas, "image/jpeg", 0.86);

  if (source && typeof source.close === "function") source.close();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  canvas.width = 0;
  canvas.height = 0;

  const exifDate = await readExifDate(file);
  return {
    width,
    height,
    thumbBlob,
    date: exifDate || formatTimestamp(file.lastModified),
    dateSource: exifDate ? "exif" : "file",
  };
}

/* ------------------------------------------------------------------ */
/* Queue                                                               */
/* ------------------------------------------------------------------ */

async function addFiles(fileList) {
  const files = Array.from(fileList || []).filter((file) =>
    /^image\//.test(file.type)
  );
  if (!files.length) {
    toast("没有可用的图片文件", true);
    return;
  }
  for (const file of files) {
    const duplicate = state.queue.some(
      (item) =>
        item.file &&
        item.file.name === file.name &&
        item.file.size === file.size &&
        item.file.lastModified === file.lastModified
    );
    if (duplicate) {
      toast(`已跳过重复文件：${file.name}`);
      continue;
    }
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      name: file.name,
      size: file.size,
      width: 0,
      height: 0,
      date: formatTimestamp(file.lastModified),
      thumbUrl: "",
      thumbBlob: null,
      status: "reading",
      progress: 0,
      error: "",
      index: null,
      entry: null,
    };
    state.queue.push(item);
    renderQueue();
    processQueueItem(item).catch((error) => {
      item.status = "error";
      item.error = error.message;
      updateCard(item);
    });
  }
}

async function processQueueItem(item) {
  const result = await inspectImage(item.file);
  item.width = result.width;
  item.height = result.height;
  item.date = result.date;
  item.dateSource = result.dateSource;
  item.thumbBlob = result.thumbBlob;
  item.thumbUrl = URL.createObjectURL(result.thumbBlob);
  item.status = "ready";
  updateCard(item);
  renderQueue();
}

function buildCard(item) {
  const root = document.createElement("div");
  root.className = "queue-item";
  root.dataset.id = item.id;

  const thumbWrap = document.createElement("div");
  thumbWrap.className = "queue-thumb";
  const thumb = document.createElement("img");
  thumb.alt = "";
  thumbWrap.appendChild(thumb);

  const info = document.createElement("div");
  info.className = "queue-info";

  const name = document.createElement("div");
  name.className = "queue-name";
  name.textContent = item.name;

  const meta = document.createElement("div");
  meta.className = "queue-meta";
  const dims = document.createElement("span");
  const size = document.createElement("span");
  const warning = document.createElement("span");
  warning.className = "queue-warn";
  warning.hidden = true;
  warning.textContent = "早于最新作品，会排在最左侧";
  const dateInput = document.createElement("input");
  dateInput.type = "datetime-local";
  dateInput.step = "1";
  dateInput.value = dateInputValue(item.date);
  dateInput.title = "拍摄时间";
  meta.appendChild(dims);
  meta.appendChild(size);
  meta.appendChild(warning);
  meta.appendChild(dateInput);

  const status = document.createElement("div");
  status.className = "queue-status";

  const progress = document.createElement("div");
  progress.className = "progress";
  const progressBar = document.createElement("span");
  progress.appendChild(progressBar);

  info.appendChild(name);
  info.appendChild(meta);
  info.appendChild(status);
  info.appendChild(progress);

  const actions = document.createElement("div");
  const remove = document.createElement("button");
  remove.className = "queue-remove";
  remove.type = "button";
  remove.setAttribute("aria-label", "移除");
  remove.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m6.4 19-1.4-1.4 5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19Z"/></svg>';
  actions.appendChild(remove);

  root.appendChild(thumbWrap);
  root.appendChild(info);
  root.appendChild(actions);

  item.el = {
    root,
    thumb,
    thumbWrap,
    dims,
    size,
    warning,
    dateInput,
    status,
    progressBar,
    remove,
  };

  remove.addEventListener("click", () => removeItem(item));
  dateInput.addEventListener("change", () => {
    const value = dateInput.value;
    if (!value) {
      dateInput.value = dateInputValue(item.date);
      return;
    }
    const normalized = value.replace("T", " ").replace(
      /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
      "$1 $2-$3-$4"
    );
    if (!/^\d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2}$/.test(normalized)) {
      dateInput.value = dateInputValue(item.date);
      toast("时间格式无效", true);
      return;
    }
    item.date = normalized;
    toast(`拍摄时间已更新：${item.name}`);
  });

  updateCard(item);
  return root;
}

function updateCard(item) {
  if (!item.el) return;
  const { root, thumb, dims, size, warning, dateInput, status, progressBar, remove } =
    item.el;
  root.classList.toggle("is-done", item.status === "done");
  root.classList.toggle("is-error", item.status === "error");

  if (item.thumbUrl && thumb.src !== item.thumbUrl) {
    thumb.src = item.thumbUrl;
  }
  dims.textContent =
    item.width && item.height ? `${item.width} × ${item.height}` : "读取中…";
  size.textContent = `${(item.size / 1024 / 1024).toFixed(1)} MB`;
  warning.hidden = !(
    item.status === "ready" &&
    state.health?.lastDate &&
    item.date < state.health.lastDate
  );
  progressBar.style.width = `${item.progress || 0}%`;

  let statusHtml = "";
  if (item.status === "reading") statusHtml = '<span class="spinner"></span> 读取中…';
  else if (item.status === "ready") statusHtml = "待上传";
  else if (item.status === "uploading") statusHtml = `<span class="spinner"></span> 上传中 ${Math.round(item.progress)}%`;
  else if (item.status === "done") {
    statusHtml = `已上传 · #${String(item.index).padStart(5, "0")} `;
    if (item.index != null) {
      statusHtml += `<a class="queue-link" href="/?targetId=${item.index}" target="_blank" rel="noopener">查看 →</a>`;
    }
  } else if (item.status === "error") {
    statusHtml = `失败：${item.error || "未知错误"}`;
  }
  status.innerHTML = statusHtml;
  status.style.color =
    item.status === "error" ? "var(--danger)" : item.status === "done" ? "var(--good)" : "";
  dateInput.disabled = item.status === "uploading" || item.status === "done";
  remove.disabled = item.status === "uploading";
  remove.style.opacity = remove.disabled ? "0.3" : "";
}

function renderQueue() {
  els.queue.innerHTML = "";
  if (!state.queue.length) {
    els.queueHead.hidden = true;
    els.uploadBar.hidden = true;
    return;
  }
  els.queueHead.hidden = false;
  els.uploadBar.hidden = false;
  els.queueCount.textContent = String(state.queue.length);
  for (const item of state.queue) {
    els.queue.appendChild(buildCard(item));
  }
  updateUploadButton();
}

function updateUploadButton() {
  const ready = state.queue.filter((item) => item.status === "ready").length;
  els.uploadBtn.disabled = !state.config?.configured || state.uploading || ready === 0;
  els.uploadBtn.textContent = state.uploading ? "上传中…" : `开始上传${ready ? ` (${ready})` : ""}`;
  els.uploadSummary.textContent = state.uploading
    ? ""
    : ready
    ? `${ready} 张待上传 · 按拍摄时间分配 ID`
    : state.queue.length
    ? "没有待上传项"
    : "";
}

function removeItem(item) {
  if (state.uploading) return;
  if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
  state.queue = state.queue.filter((entry) => entry !== item);
  renderQueue();
}

function clearQueue() {
  if (state.uploading) return;
  const pending = state.queue.filter((item) => item.status === "ready");
  if (pending.length && !window.confirm(`清空 ${state.queue.length} 个待处理文件？`)) {
    return;
  }
  for (const item of state.queue) {
    if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
  }
  state.queue = [];
  renderQueue();
}

function sortQueue() {
  state.queue.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  renderQueue();
}

/* ------------------------------------------------------------------ */
/* Upload                                                              */
/* ------------------------------------------------------------------ */

function uploadItem(item) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("date", item.date);
    form.append("width", String(item.width));
    form.append("height", String(item.height));
    form.append("thumb", item.thumbBlob, "thumb.jpg");
    form.append("full", item.file, item.file.name);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.responseType = "text";
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        item.progress = Math.min(98, (event.loaded / event.total) * 100);
        updateCard(item);
      }
    });
    xhr.addEventListener("load", () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data && data.ok) {
        item.progress = 100;
        resolve(data);
      } else {
        reject(new Error((data && data.error) || `上传失败 HTTP ${xhr.status}`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("网络错误，上传中断")));
    xhr.send(form);
  });
}

async function startUpload() {
  if (state.uploading) return;
  const pending = state.queue
    .filter((item) => item.status === "ready")
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!pending.length) {
    toast("没有待上传的照片", true);
    return;
  }
  if (!state.config?.configured) {
    showSetup();
    toast("请先完成存储配置", true);
    return;
  }
  state.uploading = true;
  els.publishResult.hidden = true;
  updateUploadButton();
  let uploaded = 0;
  let lastResult = null;

  for (const item of pending) {
    item.status = "uploading";
    item.progress = 0;
    updateCard(item);
    try {
      const result = await uploadItem(item);
      item.status = "done";
      item.index = result.index;
      item.entry = result.entry;
      lastResult = result;
      uploaded += 1;
      updateCard(item);
      els.uploadSummary.textContent = `${uploaded} / ${pending.length}`;
    } catch (error) {
      item.status = "error";
      item.error = error.message;
      updateCard(item);
      break;
    }
  }

  state.uploading = false;
  updateUploadButton();
  await loadAll();

  if (uploaded === 0) {
    showPublishResult(
      false,
      `没有照片上传成功。${pending.find((item) => item.error)?.error || ""}`
    );
    return;
  }

  const canPublish =
    state.config.mode === "b2" &&
    state.config.git.enabled &&
    els.autoPublish.checked;
  if (canPublish) {
    await publish(uploaded, lastResult?.index);
  } else if (state.config.mode === "local") {
    showPublishResult(
      true,
      `已写入本地预览（${uploaded} 张）。打开网站预览即可看到排版；本地模式不会部署。`
    );
  } else {
    showPublishResult(
      true,
      `${uploaded} 张已上传。自动发布已关闭，可稍后手动发布。`
    );
  }
}

async function publish(count, newestIndex) {
  els.publishResult.hidden = false;
  els.publishResult.classList.remove("is-error");
  els.publishResult.textContent = "正在提交并推送 ImageInfo.json…";
  try {
    const result = await api("/api/publish", {
      method: "POST",
      body: JSON.stringify({ count }),
    });
    showPublishResult(true, result.message || "发布完成", newestIndex);
    await loadAll();
  } catch (error) {
    showPublishResult(false, error.message);
  }
}

function showPublishResult(ok, message, newestIndex) {
  els.publishResult.hidden = false;
  els.publishResult.classList.toggle("is-error", !ok);
  els.publishResult.innerHTML = "";
  const text = document.createElement("p");
  text.style.margin = "0";
  text.textContent = message;
  els.publishResult.appendChild(text);
  if (ok && newestIndex != null) {
    const link = document.createElement("a");
    link.href = `/?targetId=${newestIndex}`;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "打开刚上传的作品 →";
    link.style.display = "inline-block";
    link.style.marginTop = "6px";
    els.publishResult.appendChild(link);
  }
}

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

function wireDropZone() {
  const openPicker = () => els.fileInput.click();
  els.pickBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    openPicker();
  });
  els.dropZone.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    openPicker();
  });
  els.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  });
  els.fileInput.addEventListener("change", () => {
    addFiles(els.fileInput.files);
    els.fileInput.value = "";
  });

  let dragDepth = 0;
  for (const type of ["dragenter", "dragover"]) {
    els.dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (type === "dragenter") dragDepth += 1;
      els.dropZone.classList.add("is-over");
    });
  }
  els.dropZone.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dragDepth -= 1;
    if (dragDepth <= 0) {
      dragDepth = 0;
      els.dropZone.classList.remove("is-over");
    }
  });
  els.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth = 0;
    els.dropZone.classList.remove("is-over");
    addFiles(event.dataTransfer?.files);
  });

  window.addEventListener("paste", (event) => {
    const files = Array.from(event.clipboardData?.files || []);
    if (files.length) addFiles(files);
  });

  window.addEventListener("dragover", (event) => event.preventDefault());
  window.addEventListener("drop", (event) => {
    if (!els.dropZone.contains(event.target)) event.preventDefault();
  });
}

function wire() {
  initTheme();
  wireDropZone();
  els.setupForm.addEventListener("submit", saveSetup);
  els.modeLocal.addEventListener("click", useLocalMode);
  els.setupClose.addEventListener("click", () => {
    els.setupPanel.hidden = true;
  });
  els.reconfigureBtn.addEventListener("click", showSetup);
  els.testStorage.addEventListener("click", testStorage);
  els.refreshStatus.addEventListener("click", loadAll);
  els.uploadBtn.addEventListener("click", startUpload);
  els.clearQueue.addEventListener("click", clearQueue);
  els.sortQueue.addEventListener("click", sortQueue);
  els.autoPublish.addEventListener("change", () => {
    if (!els.autoPublish.checked) return;
    if (state.config?.mode === "local") {
      els.autoPublish.checked = false;
      toast("本地预览模式不会发布", true);
    }
  });
  window.addEventListener("beforeunload", (event) => {
    if (state.uploading) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
}

wire();
loadAll().then(() => {
  if (!state.config?.configured) showSetup();
});
