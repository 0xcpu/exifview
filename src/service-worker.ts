/**
 * EXIF Viewer Extension Service Worker
 *
 * Cross-browser compatible service worker for Chrome, Edge, and Firefox.
 * Uses unified browser API for compatibility.
 */

import { api } from "./lib/browser-api.js";
import { parseImageMetadata } from "./lib/metadata-parser.js";
import type { ImageMetadata, ImageResult, PageImage } from "./types/metadata.js";

api.runtime.onInstalled.addListener((): void => {
  api.contextMenus.create({
    id: "viewExif",
    title: "View Image Metadata",
    contexts: ["image"],
  });
});

api.contextMenus.onClicked.addListener(
  async (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> => {
    if (info.menuItemId === "viewExif" && info.srcUrl) {
      try {
        const metadata = await fetchAndParseMetadata(info.srcUrl);
        await displayResults([{ url: info.srcUrl, metadata, error: null }], tab);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        api.notifications.create({
          type: "basic",
          iconUrl: "icons/icon-48.png",
          title: "Metadata Viewer",
          message: `Error: ${errorMessage}`,
        });
      }
    }
  }
);

interface ProcessImagesMessage {
  action: "processImages";
  images: string[];
  tabId: number;
}

interface GetImagesMessage {
  action: "getImages";
  tabId: number;
}

type ExtensionMessage = ProcessImagesMessage | GetImagesMessage;

interface ProcessImagesResponse {
  success: boolean;
  results?: ImageResult[];
  error?: string;
}

interface GetImagesResponse {
  success: boolean;
  images?: PageImage[];
  error?: string;
}

api.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ProcessImagesResponse | GetImagesResponse) => void
  ): boolean => {
    if (message.action === "processImages") {
      processMultipleImages(message.images)
        .then((results) => sendResponse({ success: true, results }))
        .catch((error: Error) => sendResponse({ success: false, error: error.message }));
      return true;
    }

    if (message.action === "getImages") {
      getImagesFromTab(message.tabId)
        .then((images) => sendResponse({ success: true, images }))
        .catch((error: Error) => sendResponse({ success: false, error: error.message }));
      return true;
    }

    return false;
  }
);

async function getImagesFromTab(tabId: number): Promise<PageImage[]> {
  const results = await api.scripting.executeScript({
    target: { tabId },
    func: (): PageImage[] => {
      const images = document.querySelectorAll("img");
      return Array.from(images)
        .filter((img): img is HTMLImageElement =>
          Boolean(img.src && img.naturalWidth > 50 && img.naturalHeight > 50)
        )
        .map((img) => ({
          src: img.src,
          alt: img.alt || "",
          width: img.naturalWidth,
          height: img.naturalHeight,
        }));
    },
  });

  return results[0]?.result || [];
}

async function processMultipleImages(imageUrls: string[]): Promise<ImageResult[]> {
  const results: ImageResult[] = [];

  for (const url of imageUrls) {
    try {
      const metadata = await fetchAndParseMetadata(url);
      results.push({ url, metadata, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      results.push({ url, metadata: null, error: errorMessage });
    }
  }

  return results;
}

async function fetchAndParseMetadata(imageUrl: string): Promise<ImageMetadata> {
  try {
    new URL(imageUrl);
  } catch {
    throw new Error("Invalid image URL");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return parseImageMetadata(arrayBuffer);
}

async function displayResults(
  results: ImageResult[],
  _tab?: chrome.tabs.Tab
): Promise<void> {
  const hasData = results.some((r) => {
    if (!r.metadata) return false;
    return r.metadata.exif || r.metadata.iptc || r.metadata.xmp || r.metadata.icc;
  });

  if (results.length === 1) {
    const result = results[0];
    const meta = result.metadata;

    if (hasData && meta) {
      const summary: string[] = [];
      if (meta.exif?.Make) summary.push(meta.exif.Make);
      if (meta.exif?.Model) summary.push(meta.exif.Model);
      if (meta.iptc?.Title) summary.push(`"${meta.iptc.Title}"`);
      if (meta.xmp?.CreatorTool) summary.push(meta.xmp.CreatorTool);
      if (meta.icc?.ProfileName) summary.push(meta.icc.ProfileName);

      const message =
        summary.length > 0
          ? summary.slice(0, 3).join(" | ")
          : "Metadata found. Click to view details.";

      await api.storage.local.set({ exifResults: results });

      // Browser-specific behavior note:
      // Firefox: Notification buttons are supported but may have reduced interactivity
      // Chrome/Edge: Full notification button support with interactive callbacks
      api.notifications.create(
        {
          type: "basic",
          iconUrl: "icons/icon-48.png",
          title: "Image Metadata Found",
          message,
          buttons: [{ title: "View Details" }],
        },
        (notificationId) => {
          const buttonListener = (id: string, buttonIndex: number): void => {
            if (id === notificationId && buttonIndex === 0) {
              openResultsTab();
              api.notifications.onButtonClicked.removeListener(buttonListener);
            }
          };

          const clickListener = (id: string): void => {
            if (id === notificationId) {
              openResultsTab();
              api.notifications.onClicked.removeListener(clickListener);
            }
          };

          api.notifications.onButtonClicked.addListener(buttonListener);
          api.notifications.onClicked.addListener(clickListener);
        }
      );
    } else {
      api.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-48.png",
        title: "Metadata Viewer",
        message: meta?._error || result.error || "No metadata found in this image.",
      });
    }
  } else {
    await api.storage.local.set({ exifResults: results });
    openResultsTab();
  }
}

function openResultsTab(): void {
  api.tabs.create({
    url: api.runtime.getURL("results.html"),
  });
}
