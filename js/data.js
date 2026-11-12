/* Loads ImageInfo.json and normalises the hand-written records into a stable,
 * read-only view model. The image IDs (Star_Citizen_XXXXX) and array indexes
 * are preserved exactly as they are in the original site. */

import {
  fullUrl,
  parseImageDate,
  thumbUrl,
} from "./config.js";

const NAME_RE = /^Star_Citizen_(\d+)$/;

export async function loadGalleryData(url = "./ImageInfo.json") {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`ImageInfo.json returned ${response.status}`);
  }
  const json = await response.json();
  const rawImages = Array.isArray(json.ImageInfo) ? json.ImageInfo : [];

  const images = rawImages.map((raw, index) => {
    const name = String(raw.Name || `Star_Citizen_${String(index).padStart(5, "0")}`);
    const parsed = parseImageDate(raw.DateModified);
    const ratio =
      Number.isFinite(Number(raw.WHRatio)) && Number(raw.WHRatio) > 0
        ? Number(raw.WHRatio)
        : 1;
    const image = {
      index,
      name,
      id: Number((NAME_RE.exec(name) || [])[1]),
      raw,
      date: raw.DateModified || "",
      parsed,
      year: parsed ? parsed.year : 0,
      month: parsed ? parsed.month : 0,
      monthKey: parsed
        ? `${parsed.year}-${String(parsed.month).padStart(2, "0")}`
        : "unknown",
      flow: Number(raw.Flow) === 2 ? 2 : 1,
      num: Number(raw.Num) || 0,
      ratio,
      title: name.replace(/_/g, " "),
      fullPath: raw.FullPath || "",
      thumbPath: raw.ThumbPath || "",
    };
    image.thumb = thumbUrl(image);
    image.full = fullUrl(image);
    return image;
  });

  const months = buildMonthGroups(images);
  const availableIds = images
    .map((image) => image.id)
    .filter((n) => Number.isFinite(n));

  return {
    meta: json,
    images,
    months,
    total: images.length,
    maxId: availableIds.length ? Math.max(...availableIds) : -1,
    flow1Count: images.filter((image) => image.flow === 1).length,
    flow2Count: images.filter((image) => image.flow === 2).length,
    // Newest first, matching the DOM order (highest index sits on the left).
    visualOrder: images.slice().reverse(),
  };
}

function buildMonthGroups(images) {
  const groups = [];
  let currentKey = null;
  for (let i = images.length - 1; i >= 0; i -= 1) {
    const image = images[i];
    if (image.monthKey !== currentKey) {
      groups.push({
        key: image.monthKey,
        year: image.year,
        month: image.month,
        start: i,
        end: i,
        anchor: i,
      });
      currentKey = image.monthKey;
    }
    groups[groups.length - 1].end = i;
  }
  // The HUD follows the top row. Jump to the first top-row image in the month
  // so the month actually becomes the left-most visible month.
  for (const group of groups) {
    for (let i = group.start; i >= group.end; i -= 1) {
      if (images[i].flow === 1) {
        group.anchor = i;
        break;
      }
    }
  }
  return groups;
}

export function groupForIndex(groups, index) {
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i];
    if (index <= group.start && index >= group.end) return group;
  }
  return groups[groups.length - 1] || null;
}

export function findImageIndexByTarget(data, target) {
  if (target == null || target === "") return -1;
  if (/^\d+$/.test(String(target))) {
    const index = Number(target);
    return index >= 0 && index < data.total ? index : -1;
  }
  const byName = data.images.findIndex((image) => image.name === target);
  if (byName >= 0) return byName;
  const numeric = Number((NAME_RE.exec(String(target)) || [])[1]);
  if (Number.isFinite(numeric)) return numeric < data.total ? numeric : -1;
  return -1;
}
