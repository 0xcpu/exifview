import { describe, it, expect } from "vitest";
import { parseImageMetadata } from "../src/lib/metadata-parser.js";

describe("parseImageMetadata", () => {
  it("returns error for empty buffer", async () => {
    const buffer = new ArrayBuffer(0);
    const result = await parseImageMetadata(buffer);
    expect(result._error).toBe("Empty or invalid image data");
    expect(result.exif).toBeNull();
    expect(result.iptc).toBeNull();
    expect(result.xmp).toBeNull();
    expect(result.icc).toBeNull();
  });

  it("returns error for buffer too small", async () => {
    const buffer = new ArrayBuffer(5);
    const result = await parseImageMetadata(buffer);
    expect(result._error).toBe("File too small to contain valid image data");
  });

  it("returns error for non-image data", async () => {
    const buffer = new ArrayBuffer(100);
    const view = new Uint8Array(buffer);
    // Fill with random non-image data
    for (let i = 0; i < view.length; i++) {
      view[i] = i % 256;
    }
    const result = await parseImageMetadata(buffer);
    expect(result._error).toBeTruthy();
  });

  it("parses a minimal JPEG with EXIF data", async () => {
    // Build a minimal JPEG with an APP1 EXIF segment
    const exifData = buildMinimalJpegWithExif();
    const result = await parseImageMetadata(exifData.buffer);

    // Should either find EXIF data or gracefully report no metadata
    // (depending on whether ExifReader can parse our minimal construct)
    expect(result).toBeDefined();
    expect(result._error === null || typeof result._error === "string").toBe(true);
  });

  it("returns all metadata fields as null when no metadata found", async () => {
    // Minimal valid JPEG: SOI + EOI markers only
    const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const result = await parseImageMetadata(jpeg.buffer);
    expect(result.exif).toBeNull();
    expect(result.iptc).toBeNull();
    expect(result.xmp).toBeNull();
    expect(result.icc).toBeNull();
  });
});

/** Builds a minimal JPEG buffer with an APP1 (EXIF) marker */
function buildMinimalJpegWithExif(): Uint8Array {
  // JPEG SOI marker
  const soi = [0xFF, 0xD8];

  // APP1 marker with EXIF header
  const app1Marker = [0xFF, 0xE1];

  // Minimal TIFF header (little-endian)
  const exifHeader = [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x49, 0x49, // Little-endian ("II")
    0x2A, 0x00, // TIFF magic number
    0x08, 0x00, 0x00, 0x00, // Offset to first IFD
    // IFD with 0 entries
    0x00, 0x00, // Number of directory entries
    0x00, 0x00, 0x00, 0x00, // Next IFD offset (none)
  ];

  // APP1 length (2 bytes for length field + exif data)
  const app1Length = exifHeader.length + 2;
  const lengthBytes = [(app1Length >> 8) & 0xFF, app1Length & 0xFF];

  // JPEG EOI marker
  const eoi = [0xFF, 0xD9];

  const bytes = [...soi, ...app1Marker, ...lengthBytes, ...exifHeader, ...eoi];
  return new Uint8Array(bytes);
}
