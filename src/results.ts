/**
 * EXIF Viewer Results Page
 *
 * Cross-browser compatible results display for Chrome, Edge, and Firefox.
 */

import { api } from "./lib/browser-api.js";
import { getElement } from "./lib/dom-utils.js";
import type { ImageResult, ImageMetadata, ExifMetadata } from "./types/metadata.js";

const LABEL_MAPPINGS: Record<string, string> = {
  FNumber: "Aperture",
  ExposureTime: "Shutter Speed",
  ISO: "ISO",
  FocalLength: "Focal Length",
  FocalLengthIn35mmFilm: "35mm Equivalent",
  ExposureProgram: "Exposure Program",
  ExposureMode: "Exposure Mode",
  MeteringMode: "Metering",
  WhiteBalance: "White Balance",
  ExifImageWidth: "Width",
  ExifImageHeight: "Height",
  ColorSpace: "Color Space",
  DateTime: "Modified",
  DateTimeOriginal: "Taken",
  DateTimeDigitized: "Digitized",
  LensMake: "Lens Make",
  LensModel: "Lens Model",
  AuthorTitle: "Author Title",
  ProvinceState: "State/Province",
  DateCreated: "Date Created",
  SpecialInstructions: "Instructions",
  CreatorTool: "Software",
  CreateDate: "Created",
  ModifyDate: "Modified",
  SerialNumber: "Serial Number",
  ProfileName: "Profile",
  DeviceClass: "Device Type",
  PCS: "Connection Space",
  ProfileVersion: "Version",
  RenderingIntent: "Rendering Intent",
  CreationDate: "Created",
};

type MetadataType = "exif" | "iptc" | "xmp" | "icc";

document.addEventListener("DOMContentLoaded", async (): Promise<void> => {
  const resultsContainer = getElement<HTMLElement>("results");
  const summaryEl = getElement<HTMLParagraphElement>("summary");
  const noResults = getElement<HTMLDivElement>("no-results");

  if (!resultsContainer || !summaryEl || !noResults) {
    console.error("Required DOM elements not found");
    return;
  }

  const data = await api.storage.local.get("exifResults");
  const results = data.exifResults as ImageResult[] | undefined;

  if (!results || results.length === 0) {
    noResults.classList.remove("hidden");
    return;
  }

  const withMetadata = results.filter((r) => {
    const meta = r.metadata;
    return meta && (meta.exif || meta.iptc || meta.xmp || meta.icc);
  }).length;
  const total = results.length;
  summaryEl.textContent = `${withMetadata} of ${total} image${total !== 1 ? "s" : ""} with metadata`;

  results.forEach((result, index) => {
    const card = createResultCard(result, index);
    resultsContainer.appendChild(card);
  });

  api.storage.local.remove("exifResults");
});

function createResultCard(result: ImageResult, index: number): HTMLDivElement {
  const meta = result.metadata || ({} as ImageMetadata);
  const hasData = meta.exif || meta.iptc || meta.xmp || meta.icc;

  const card = document.createElement("div");
  card.className = "result-card" + (!hasData ? " error" : "");

  const header = document.createElement("div");
  header.className = "card-header";

  const thumbnail = document.createElement("div");
  thumbnail.className = "card-thumbnail";
  const img = document.createElement("img");
  img.src = result.url;
  img.alt = `Image ${index + 1}`;
  thumbnail.appendChild(img);

  const info = document.createElement("div");
  info.className = "card-info";

  const title = document.createElement("h2");
  title.textContent = getFilename(result.url);
  info.appendChild(title);

  if (hasData) {
    if (meta.exif && (meta.exif.Make || meta.exif.Model)) {
      const camera = document.createElement("div");
      camera.className = "camera";
      camera.textContent = [meta.exif.Make, meta.exif.Model].filter(Boolean).join(" ");
      info.appendChild(camera);
    }

    const quickInfo: string[] = [];
    if (meta.exif) {
      if (meta.exif.FocalLength) quickInfo.push(meta.exif.FocalLength);
      if (meta.exif.FNumber) quickInfo.push(meta.exif.FNumber);
      if (meta.exif.ExposureTime) quickInfo.push(meta.exif.ExposureTime);
      if (meta.exif.ISO) quickInfo.push("ISO " + meta.exif.ISO);
    }

    if (quickInfo.length > 0) {
      const quick = document.createElement("div");
      quick.className = "quick-info";
      quick.textContent = quickInfo.join(" \u2022 ");
      info.appendChild(quick);
    }

    const badges = document.createElement("div");
    badges.className = "metadata-badges";
    if (meta.exif) badges.appendChild(createBadge("EXIF", "exif"));
    if (meta.iptc) badges.appendChild(createBadge("IPTC", "iptc"));
    if (meta.xmp) badges.appendChild(createBadge("XMP", "xmp"));
    if (meta.icc) badges.appendChild(createBadge("ICC", "icc"));
    info.appendChild(badges);

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy JSON";
    copyBtn.title = "Copy metadata as JSON";
    copyBtn.addEventListener("click", () => copyMetadataToClipboard(result, copyBtn));
    info.appendChild(copyBtn);
  } else {
    const errorMsg = document.createElement("div");
    errorMsg.className = "error-message";
    errorMsg.textContent = meta._error || result.error || "No metadata found";
    info.appendChild(errorMsg);
  }

  header.appendChild(thumbnail);
  header.appendChild(info);
  card.appendChild(header);

  if (hasData) {
    const sections = document.createElement("div");
    sections.className = "exif-sections";

    if (meta.exif) {
      const cameraSettings = filterData(meta.exif, [
        "FNumber", "ExposureTime", "ISO", "FocalLength", "FocalLengthIn35mmFilm",
        "ExposureProgram", "ExposureMode", "MeteringMode", "Flash", "WhiteBalance",
      ]);
      if (Object.keys(cameraSettings).length > 0) {
        sections.appendChild(createSection("Camera Settings", cameraSettings, "exif"));
      }

      const imageInfo = filterData(meta.exif, [
        "ExifImageWidth", "ExifImageHeight", "Orientation", "ColorSpace",
        "DateTime", "DateTimeOriginal",
      ]);
      if (Object.keys(imageInfo).length > 0) {
        sections.appendChild(createSection("Image Information", imageInfo, "exif"));
      }

      const equipment = filterData(meta.exif, [
        "Make", "Model", "LensMake", "LensModel", "Software", "Artist", "Copyright",
      ]);
      if (Object.keys(equipment).length > 0) {
        sections.appendChild(createSection("Equipment", equipment, "exif"));
      }

      if (meta.exif.GPSLatitude !== undefined && meta.exif.GPSLongitude !== undefined) {
        sections.appendChild(createGPSSection(meta.exif));
      }
    }

    if (meta.iptc) {
      const iptcContent = filterData(meta.iptc, [
        "Title", "Headline", "Caption", "Keywords", "Author", "AuthorTitle",
        "Credit", "Source", "Copyright", "City", "Sublocation", "ProvinceState",
        "Country", "DateCreated", "SpecialInstructions", "Category", "Urgency",
      ]);
      if (Object.keys(iptcContent).length > 0) {
        sections.appendChild(createSection("IPTC Metadata", iptcContent, "iptc"));
      }
    }

    if (meta.xmp) {
      const xmpContent = filterData(meta.xmp, [
        "Title", "Description", "Creator", "Rights", "Keywords", "Rating", "Label",
        "CreatorTool", "CreateDate", "ModifyDate", "DateCreated",
        "Headline", "Credit", "Source", "City", "State", "Country", "Location",
        "Make", "Model", "Lens", "Software", "SerialNumber",
      ]);
      if (Object.keys(xmpContent).length > 0) {
        sections.appendChild(createSection("XMP Metadata", xmpContent, "xmp"));
      }
    }

    if (meta.icc) {
      const iccContent = filterData(meta.icc, [
        "ProfileName", "Description", "ColorSpace", "DeviceClass", "PCS",
        "ProfileVersion", "Platform", "RenderingIntent", "CreationDate", "Copyright",
      ]);
      if (Object.keys(iccContent).length > 0) {
        sections.appendChild(createSection("Color Profile (ICC)", iccContent, "icc"));
      }
    }

    card.appendChild(sections);
  }

  return card;
}

function createBadge(text: string, type: MetadataType): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.className = `badge badge-${type}`;
  badge.textContent = text;
  return badge;
}

function createSection(
  title: string,
  data: Record<string, unknown>,
  type: MetadataType
): HTMLDivElement {
  const section = document.createElement("div");
  section.className = `exif-section section-${type}`;

  const heading = document.createElement("h3");
  heading.textContent = title;
  section.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "exif-grid";

  for (const key of Object.keys(data)) {
    const value = data[key];
    const item = document.createElement("div");
    item.className = "exif-item";

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = formatLabel(key);

    const valueSpan = document.createElement("span");
    valueSpan.className = "value";

    if (Array.isArray(value)) {
      valueSpan.textContent = value.join(", ");
    } else {
      valueSpan.textContent = formatValue(value);
    }

    item.appendChild(label);
    item.appendChild(valueSpan);
    grid.appendChild(item);
  }

  section.appendChild(grid);
  return section;
}

function createGPSSection(exif: ExifMetadata): HTMLDivElement {
  const section = document.createElement("div");
  section.className = "exif-section section-exif";

  const heading = document.createElement("h3");
  heading.textContent = "Location";
  section.appendChild(heading);

  const gpsBox = document.createElement("div");
  gpsBox.className = "gps-section";

  const coords = document.createElement("div");
  coords.className = "gps-coords";

  const lat = exif.GPSLatitude;
  const lon = exif.GPSLongitude;
  const alt = exif.GPSAltitude;

  const latDiv = document.createElement("div");
  latDiv.className = "gps-coord";
  const latLabel = document.createElement("div");
  latLabel.className = "label";
  latLabel.textContent = "Latitude";
  const latValue = document.createElement("div");
  latValue.className = "value";
  latValue.textContent = `${lat}\u00B0`;
  latDiv.appendChild(latLabel);
  latDiv.appendChild(latValue);

  const lonDiv = document.createElement("div");
  lonDiv.className = "gps-coord";
  const lonLabel = document.createElement("div");
  lonLabel.className = "label";
  lonLabel.textContent = "Longitude";
  const lonValue = document.createElement("div");
  lonValue.className = "value";
  lonValue.textContent = `${lon}\u00B0`;
  lonDiv.appendChild(lonLabel);
  lonDiv.appendChild(lonValue);

  coords.appendChild(latDiv);
  coords.appendChild(lonDiv);

  if (alt !== undefined) {
    const altDiv = document.createElement("div");
    altDiv.className = "gps-coord";
    const altLabel = document.createElement("div");
    altLabel.className = "label";
    altLabel.textContent = "Altitude";
    const altValue = document.createElement("div");
    altValue.className = "value";
    altValue.textContent = `${alt} m`;
    altDiv.appendChild(altLabel);
    altDiv.appendChild(altValue);
    coords.appendChild(altDiv);
  }

  gpsBox.appendChild(coords);

  const mapLink = document.createElement("a");
  mapLink.className = "gps-link";
  mapLink.href = `https://www.google.com/maps?q=${lat},${lon}`;
  mapLink.target = "_blank";
  mapLink.rel = "noopener noreferrer";
  mapLink.textContent = "View on Google Maps";
  gpsBox.appendChild(mapLink);

  section.appendChild(gpsBox);
  return section;
}

function filterData<T extends Record<string, unknown>>(
  data: T,
  keys: string[]
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && value !== "") {
      filtered[key] = value;
    }
  }
  return filtered;
}

function formatLabel(key: string): string {
  return LABEL_MAPPINGS[key] || key.replace(/([A-Z])/g, " $1").trim();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  return String(value);
}

function getFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop();
    if (filename && filename.length > 0 && filename.length < 50) {
      return decodeURIComponent(filename);
    }
    return `Image from ${urlObj.hostname}`;
  } catch {
    return "Image";
  }
}

function copyMetadataToClipboard(result: ImageResult, button: HTMLButtonElement): void {
  const metadata = result.metadata ? { ...result.metadata } : null;
  if (metadata) {
    delete (metadata as Record<string, unknown>)._error;
  }

  const data = {
    url: result.url,
    filename: getFilename(result.url),
    metadata,
  };

  const json = JSON.stringify(data, null, 2);

  navigator.clipboard.writeText(json).then(() => {
    const originalText = button.textContent;
    button.textContent = "Copied!";
    button.classList.add("copied");
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("copied");
    }, 1500);
  }).catch((err) => {
    console.error("Failed to copy:", err);
    button.textContent = "Failed";
    setTimeout(() => {
      button.textContent = "Copy JSON";
    }, 1500);
  });
}
