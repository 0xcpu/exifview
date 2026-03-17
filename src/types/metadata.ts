/**
 * Type definitions for image metadata
 */

export interface ExifMetadata {
  Make?: string;
  Model?: string;
  Orientation?: string;
  DateTimeOriginal?: string;
  DateTime?: string;
  ExposureTime?: string;
  FNumber?: string;
  ISO?: string;
  FocalLength?: string;
  FocalLengthIn35mmFilm?: string;
  ExposureProgram?: string;
  ExposureMode?: string;
  MeteringMode?: string;
  Flash?: string;
  WhiteBalance?: string;
  LensMake?: string;
  LensModel?: string;
  ExifImageWidth?: number;
  ExifImageHeight?: number;
  ColorSpace?: string;
  Artist?: string;
  Copyright?: string;
  Software?: string;
  GPSLatitude?: number;
  GPSLongitude?: number;
  GPSAltitude?: number;
  [key: string]: string | number | undefined;
}

export interface IptcMetadata {
  Title?: string;
  Headline?: string;
  Caption?: string;
  Keywords?: string[];
  Author?: string;
  AuthorTitle?: string;
  Credit?: string;
  Source?: string;
  Copyright?: string;
  City?: string;
  Sublocation?: string;
  ProvinceState?: string;
  Country?: string;
  DateCreated?: string;
  SpecialInstructions?: string;
  Category?: string;
  Urgency?: string;
  [key: string]: string | string[] | undefined;
}

export interface XmpMetadata {
  Title?: string;
  Description?: string;
  Creator?: string;
  Rights?: string;
  Keywords?: string[];
  Rating?: number;
  Label?: string;
  CreatorTool?: string;
  CreateDate?: string;
  ModifyDate?: string;
  Headline?: string;
  Credit?: string;
  Source?: string;
  City?: string;
  State?: string;
  Country?: string;
  Location?: string;
  Make?: string;
  Model?: string;
  Lens?: string;
  SerialNumber?: string;
  [key: string]: string | string[] | number | undefined;
}

export interface IccMetadata {
  ProfileName?: string;
  Description?: string;
  ColorSpace?: string;
  DeviceClass?: string;
  PCS?: string;
  ProfileVersion?: string;
  Platform?: string;
  RenderingIntent?: string;
  CreationDate?: string;
  Copyright?: string;
  CMMType?: string;
  [key: string]: string | undefined;
}

export interface ImageMetadata {
  exif: ExifMetadata | null;
  iptc: IptcMetadata | null;
  xmp: XmpMetadata | null;
  icc: IccMetadata | null;
  /** Internal error message when metadata extraction fails. Excluded from clipboard copy. */
  _error: string | null;
}

export interface ImageResult {
  url: string;
  metadata: ImageMetadata | null;
  error: string | null;
}

export interface PageImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface GetImagesResponse {
  success: boolean;
  images?: PageImage[];
  error?: string;
}

export interface ProcessImagesResponse {
  success: boolean;
  results?: ImageResult[];
  error?: string;
}
