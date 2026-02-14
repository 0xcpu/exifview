/**
 * Metadata parsing using ExifReader library.
 * Extracts EXIF, IPTC, XMP, and ICC metadata from images.
 */

import ExifReader from "exifreader";
import type { ExpandedTags } from "exifreader";
import type {
  ImageMetadata,
  ExifMetadata,
  IptcMetadata,
  XmpMetadata,
  IccMetadata,
} from "../types/metadata.js";

/** Extracts a string value from an ExifReader tag */
function getStringValue(tag: unknown): string | undefined {
  if (tag === null || tag === undefined) return undefined;

  if (typeof tag === "object" && "description" in tag) {
    const desc = (tag as { description: unknown }).description;
    if (typeof desc === "string" && desc.length > 0) {
      return desc;
    }
  }

  if (typeof tag === "object" && "value" in tag) {
    const val = (tag as { value: unknown }).value;
    if (typeof val === "string") return val;
    if (typeof val === "number") return String(val);
    if (Array.isArray(val) && val.every((v) => typeof v === "string")) {
      return val.join(", ");
    }
  }

  return undefined;
}

/** Extracts a numeric value from an ExifReader tag */
function getNumericValue(tag: unknown): number | undefined {
  if (tag === null || tag === undefined) return undefined;

  if (typeof tag === "object" && "value" in tag) {
    const val = (tag as { value: unknown }).value;
    if (typeof val === "number") return val;
  }

  if (typeof tag === "object" && "computed" in tag) {
    const computed = (tag as { computed: unknown }).computed;
    if (typeof computed === "number") return computed;
  }

  return undefined;
}

/** Removes undefined values from an object */
function cleanObject<T extends object>(obj: T): T | null {
  const cleaned = Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined),
  ) as T;
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

/** Extracts EXIF metadata from ExifReader tags */
function extractExif(tags: ExpandedTags): ExifMetadata | null {
  const exif = tags.exif;
  const gps = tags.gps;

  if (!exif && !gps) return null;

  const result: ExifMetadata = {};

  if (exif) {
    result.Make = getStringValue(exif.Make);
    result.Model = getStringValue(exif.Model);
    result.LensMake = getStringValue(exif.LensMake);
    result.LensModel = getStringValue(exif.LensModel);
    result.DateTimeOriginal = getStringValue(exif.DateTimeOriginal);
    result.DateTime = getStringValue(exif.DateTime);
    result.ExposureTime = getStringValue(exif.ExposureTime);
    result.FNumber = getStringValue(exif.FNumber);
    result.ISO = getStringValue(exif.ISOSpeedRatings);
    result.FocalLength = getStringValue(exif.FocalLength);
    result.FocalLengthIn35mmFilm = getStringValue(exif.FocalLengthIn35mmFilm);
    result.ExposureProgram = getStringValue(exif.ExposureProgram);
    result.ExposureMode = getStringValue(exif.ExposureMode);
    result.MeteringMode = getStringValue(exif.MeteringMode);
    result.Flash = getStringValue(exif.Flash);
    result.WhiteBalance = getStringValue(exif.WhiteBalance);
    result.Orientation = getStringValue(exif.Orientation);
    result.ColorSpace = getStringValue(exif.ColorSpace);
    result.ExifImageWidth = getNumericValue(exif.PixelXDimension);
    result.ExifImageHeight = getNumericValue(exif.PixelYDimension);
    result.Artist = getStringValue(exif.Artist);
    result.Copyright = getStringValue(exif.Copyright);
    result.Software = getStringValue(exif.Software);
  }

  if (gps) {
    if (typeof gps.Latitude === "number") result.GPSLatitude = gps.Latitude;
    if (typeof gps.Longitude === "number") result.GPSLongitude = gps.Longitude;
    if (typeof gps.Altitude === "number") result.GPSAltitude = gps.Altitude;
  }

  return cleanObject(result);
}

/** Extracts IPTC metadata from ExifReader tags */
function extractIptc(tags: ExpandedTags): IptcMetadata | null {
  const iptc = tags.iptc;
  if (!iptc) return null;

  const result: IptcMetadata = {};

  result.Title = getStringValue(iptc["Object Name"]);
  result.Headline = getStringValue(iptc.Headline);
  result.Caption = getStringValue(iptc["Caption/Abstract"]);
  result.Author = getStringValue(iptc["By-line"]);
  result.AuthorTitle = getStringValue(iptc["By-line Title"]);
  result.Credit = getStringValue(iptc.Credit);
  result.Source = getStringValue(iptc.Source);
  result.Copyright = getStringValue(iptc["Copyright Notice"]);
  result.City = getStringValue(iptc.City);
  result.Sublocation = getStringValue(iptc["Sub-location"]);
  result.ProvinceState = getStringValue(iptc["Province/State"]);
  result.Country = getStringValue(iptc["Country/Primary Location Name"]);
  result.DateCreated = getStringValue(iptc["Date Created"]);
  result.SpecialInstructions = getStringValue(iptc["Special Instructions"]);
  result.Category = getStringValue(iptc.Category);
  result.Urgency = getStringValue(iptc.Urgency);

  const keywords = iptc.Keywords;
  if (keywords) {
    if (Array.isArray(keywords)) {
      result.Keywords = keywords.map((k) => getStringValue(k) || "").filter(Boolean);
    } else {
      const kw = getStringValue(keywords);
      if (kw) result.Keywords = [kw];
    }
  }

  return cleanObject(result);
}

/** Extracts a value from XMP tag (handles nested structures) */
function getXmpValue(tag: unknown): string | undefined {
  if (!tag) return undefined;

  if (typeof tag === "object" && "description" in tag) {
    const desc = (tag as { description: unknown }).description;
    if (typeof desc === "string") return desc;
  }

  if (typeof tag === "object" && "value" in tag) {
    const val = (tag as { value: unknown }).value;
    if (typeof val === "string") return val;

    if (Array.isArray(val)) {
      const strings = val
        .map((v) => {
          if (typeof v === "string") return v;
          if (typeof v === "object" && v && "value" in v) {
            return String((v as { value: unknown }).value);
          }
          return null;
        })
        .filter((s): s is string => s !== null);
      if (strings.length > 0) return strings.join(", ");
    }
  }

  return undefined;
}

/** Extracts XMP metadata from ExifReader tags */
function extractXmp(tags: ExpandedTags): XmpMetadata | null {
  const xmp = tags.xmp;
  if (!xmp) return null;

  const result: XmpMetadata = {};

  // Dublin Core
  result.Title = getXmpValue(xmp["dc:title"]) || getXmpValue(xmp.title);
  result.Description = getXmpValue(xmp["dc:description"]) || getXmpValue(xmp.description);
  result.Creator = getXmpValue(xmp["dc:creator"]) || getXmpValue(xmp.creator);
  result.Rights = getXmpValue(xmp["dc:rights"]) || getXmpValue(xmp.rights);

  // XMP Basic
  result.CreatorTool = getXmpValue(xmp["xmp:CreatorTool"]) || getXmpValue(xmp.CreatorTool);
  result.CreateDate = getXmpValue(xmp["xmp:CreateDate"]) || getXmpValue(xmp.CreateDate);
  result.ModifyDate = getXmpValue(xmp["xmp:ModifyDate"]) || getXmpValue(xmp.ModifyDate);
  result.Label = getXmpValue(xmp["xmp:Label"]) || getXmpValue(xmp.Label);

  const rating = xmp["xmp:Rating"] || xmp.Rating;
  if (rating) {
    const ratingVal = getXmpValue(rating);
    if (ratingVal) {
      const parsed = parseInt(ratingVal, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 5) {
        result.Rating = parsed;
      }
    }
  }

  // Photoshop
  result.Headline = getXmpValue(xmp["photoshop:Headline"]) || getXmpValue(xmp.Headline);
  result.Credit = getXmpValue(xmp["photoshop:Credit"]) || getXmpValue(xmp.Credit);
  result.Source = getXmpValue(xmp["photoshop:Source"]) || getXmpValue(xmp.Source);
  result.City = getXmpValue(xmp["photoshop:City"]) || getXmpValue(xmp.City);
  result.State = getXmpValue(xmp["photoshop:State"]) || getXmpValue(xmp.State);
  result.Country = getXmpValue(xmp["photoshop:Country"]) || getXmpValue(xmp.Country);

  // TIFF namespace
  result.Make = getXmpValue(xmp["tiff:Make"]) || getXmpValue(xmp.Make);
  result.Model = getXmpValue(xmp["tiff:Model"]) || getXmpValue(xmp.Model);

  // EXIF Aux
  result.Lens = getXmpValue(xmp["aux:Lens"]) || getXmpValue(xmp.Lens);
  result.SerialNumber = getXmpValue(xmp["aux:SerialNumber"]) || getXmpValue(xmp.SerialNumber);

  return cleanObject(result);
}

/** Returns a friendly profile name from the ICC description */
function getProfileName(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes("srgb")) return "sRGB";
  if (desc.includes("adobe rgb")) return "Adobe RGB";
  if (desc.includes("prophoto")) return "ProPhoto RGB";
  if (desc.includes("display p3")) return "Display P3";
  if (desc.includes("rec.2020") || desc.includes("rec2020")) return "Rec. 2020";
  return description;
}

/** Extracts ICC profile metadata from ExifReader tags */
function extractIcc(tags: ExpandedTags): IccMetadata | null {
  const icc = tags.icc;
  if (!icc) return null;

  const result: IccMetadata = {};

  result.Description = getStringValue(icc["Profile Description"]) || getStringValue(icc.description);
  result.Copyright = getStringValue(icc["Profile Copyright"]) || getStringValue(icc.copyright);
  result.ColorSpace = getStringValue(icc["Color Space"]) || getStringValue(icc.colorSpace);
  result.DeviceClass = getStringValue(icc["Device Class"]) || getStringValue(icc.deviceClass);
  result.ProfileVersion = getStringValue(icc["Profile Version"]) || getStringValue(icc.profileVersion);
  result.RenderingIntent = getStringValue(icc["Rendering Intent"]) || getStringValue(icc.renderingIntent);
  result.Platform = getStringValue(icc["Primary Platform"]) || getStringValue(icc.platform);
  result.PCS = getStringValue(icc["Connection Space"]) || getStringValue(icc.pcs);
  result.CMMType = getStringValue(icc["CMM Type"]) || getStringValue(icc.cmmType);
  result.CreationDate = getStringValue(icc["Profile Date/Time"]) || getStringValue(icc.creationDate);

  if (result.Description) {
    result.ProfileName = getProfileName(result.Description);
  }

  return cleanObject(result);
}

/**
 * Parses metadata from an image buffer.
 *
 * @example
 * const response = await fetch(imageUrl);
 * const buffer = await response.arrayBuffer();
 * const metadata = await parseImageMetadata(buffer);
 */
export async function parseImageMetadata(buffer: ArrayBuffer): Promise<ImageMetadata> {
  const metadata: ImageMetadata = {
    exif: null,
    iptc: null,
    xmp: null,
    icc: null,
    _error: null,
  };

  try {
    if (!buffer || buffer.byteLength === 0) {
      metadata._error = "Empty or invalid image data";
      return metadata;
    }

    if (buffer.byteLength < 12) {
      metadata._error = "File too small to contain valid image data";
      return metadata;
    }

    const tags = ExifReader.load(buffer, {
      expanded: true,
      includeUnknown: false,
    });

    metadata.exif = extractExif(tags);
    metadata.iptc = extractIptc(tags);
    metadata.xmp = extractXmp(tags);
    metadata.icc = extractIcc(tags);

    const hasData = metadata.exif || metadata.iptc || metadata.xmp || metadata.icc;
    if (!hasData) {
      metadata._error = "No metadata found in this image";
    }
  } catch (error) {
    if (error instanceof ExifReader.errors.MetadataMissingError) {
      metadata._error = "No metadata found in this image";
    } else if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("unsupported") || msg.includes("invalid")) {
        metadata._error = "Unsupported image format";
      } else {
        metadata._error = "Failed to parse image metadata";
      }
    } else {
      metadata._error = "An unexpected error occurred";
    }
  }

  return metadata;
}
