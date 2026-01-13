# EXIF Viewer

A browser extension that extracts and displays image metadata from web pages.

Supports Chrome, Edge, and Firefox.

## Supported Formats

- EXIF (camera settings, GPS, dates)
- IPTC (title, keywords, copyright)
- XMP (Adobe metadata, ratings)
- ICC (color profiles)

## Build

```bash
npm install
npm run build              # Build both Chrome and Firefox
npm run build:chrome       # Chrome only
npm run build:firefox      # Firefox only
```

## Install

**Chrome/Edge:**
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select the `build/chrome/` folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `build/firefox/manifest.json`

## License

MIT
