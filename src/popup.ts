/**
 * EXIF Viewer Popup Script
 */

import type {
  PageImage,
  ImageResult,
  ImageMetadata,
} from "./types/metadata.js";

interface GetImagesResponse {
  success: boolean;
  images?: PageImage[];
  error?: string;
}

interface ProcessImagesResponse {
  success: boolean;
  results?: ImageResult[];
  error?: string;
}

function getElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

document.addEventListener("DOMContentLoaded", async (): Promise<void> => {
  const loading = getElement<HTMLDivElement>("loading");
  const noImages = getElement<HTMLDivElement>("no-images");
  const imageGrid = getElement<HTMLDivElement>("image-grid");
  const selectionInfo = getElement<HTMLDivElement>("selection-info");
  const selectedCount = getElement<HTMLSpanElement>("selected-count");
  const actions = getElement<HTMLDivElement>("actions");
  const selectAllBtn = getElement<HTMLButtonElement>("select-all");
  const processBtn = getElement<HTMLButtonElement>("process-btn");
  const processing = getElement<HTMLDivElement>("processing");
  const errorDiv = getElement<HTMLDivElement>("error");

  if (
    !loading ||
    !noImages ||
    !imageGrid ||
    !selectionInfo ||
    !selectedCount ||
    !actions ||
    !selectAllBtn ||
    !processBtn ||
    !processing ||
    !errorDiv
  ) {
    console.error("Required DOM elements not found");
    return;
  }

  const grid = imageGrid;
  const selInfo = selectionInfo;
  const actionsEl = actions;
  const countSpan = selectedCount;
  const selectBtn = selectAllBtn;
  const procBtn = processBtn;
  const errDiv = errorDiv;

  let images: PageImage[] = [];
  const selectedImages = new Set<number>();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    showError("Unable to access current tab.");
    return;
  }

  const tabId = tab.id;

  try {
    const response = (await chrome.runtime.sendMessage({
      action: "getImages",
      tabId,
    })) as GetImagesResponse;

    loading.classList.add("hidden");

    if (!response.success) {
      showError(response.error || "Failed to scan page for images.");
      return;
    }

    images = response.images || [];

    if (images.length === 0) {
      noImages.classList.remove("hidden");
      return;
    }

    renderImages(images);
  } catch (error) {
    loading.classList.add("hidden");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    showError("Error scanning page: " + errorMessage);
  }

  function renderImages(imagesToRender: PageImage[]): void {
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }

    imagesToRender.forEach((img, index) => {
      const item = document.createElement("div");
      item.className = "image-item";
      item.dataset.index = String(index);

      const imgEl = document.createElement("img");
      imgEl.src = img.src;
      imgEl.alt = img.alt || `Image ${index + 1}`;
      imgEl.title = `${img.width} x ${img.height}`;

      item.appendChild(imgEl);
      grid.appendChild(item);

      item.addEventListener("click", () => toggleSelection(index));
    });

    grid.classList.remove("hidden");
    selInfo.classList.remove("hidden");
    actionsEl.classList.remove("hidden");
  }

  function toggleSelection(index: number): void {
    const item = grid.querySelector(`[data-index="${index}"]`);
    if (!item) return;

    if (selectedImages.has(index)) {
      selectedImages.delete(index);
      item.classList.remove("selected");
    } else {
      selectedImages.add(index);
      item.classList.add("selected");
    }

    updateSelectionUI();
  }

  function updateSelectionUI(): void {
    const count = selectedImages.size;
    countSpan.textContent = `${count} selected`;
    procBtn.disabled = count === 0;
    selectBtn.textContent =
      count === images.length ? "Deselect All" : "Select All";
  }

  selectBtn.addEventListener("click", (): void => {
    if (selectedImages.size === images.length) {
      selectedImages.clear();
      grid.querySelectorAll(".image-item").forEach((item) => {
        item.classList.remove("selected");
      });
    } else {
      images.forEach((_, index) => {
        selectedImages.add(index);
      });
      grid.querySelectorAll(".image-item").forEach((item) => {
        item.classList.add("selected");
      });
    }
    updateSelectionUI();
  });

  procBtn.addEventListener("click", async (): Promise<void> => {
    if (selectedImages.size === 0) return;

    const selectedUrls = Array.from(selectedImages).map(
      (index) => images[index].src,
    );

    grid.classList.add("hidden");
    selInfo.classList.add("hidden");
    actionsEl.classList.add("hidden");
    processing.classList.remove("hidden");

    try {
      const response = (await chrome.runtime.sendMessage({
        action: "processImages",
        images: selectedUrls,
        tabId,
      })) as ProcessImagesResponse;

      if (!response.success) {
        processing.classList.add("hidden");
        showError(response.error || "Failed to process images.");
        return;
      }

      const results = response.results || [];
      const hasResults = results.some((r) => {
        const meta = r.metadata;
        return meta && (meta.exif || meta.iptc || meta.xmp || meta.icc);
      });

      if (results.length === 1 && hasResults) {
        await chrome.storage.local.set({ exifResults: results });

        const meta = results[0].metadata as ImageMetadata;
        const summary: string[] = [];
        if (meta.exif?.Make) summary.push(meta.exif.Make);
        if (meta.exif?.Model) summary.push(meta.exif.Model);
        if (meta.iptc?.Title) summary.push(meta.iptc.Title);
        if (meta.icc?.ProfileName) summary.push(meta.icc.ProfileName);

        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon-48.png",
          title: "Image Metadata Found",
          message:
            summary.length > 0 ? summary.join(" | ") : "Click to view details",
        });

        chrome.tabs.create({ url: chrome.runtime.getURL("results.html") });
        window.close();
      } else if (results.length >= 2 || (results.length === 1 && !hasResults)) {
        await chrome.storage.local.set({ exifResults: results });
        chrome.tabs.create({ url: chrome.runtime.getURL("results.html") });
        window.close();
      }
    } catch (error) {
      processing.classList.add("hidden");
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      showError("Error processing images: " + errorMessage);
    }
  });

  function showError(message: string): void {
    errDiv.textContent = message;
    errDiv.classList.remove("hidden");
  }
});
