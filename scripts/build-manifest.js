#!/usr/bin/env node

/**
 * Manifest Build Script
 *
 * Merges base manifest with browser-specific overrides to create
 * final manifest.json files for Chrome and Firefox builds.
 *
 * Usage: node scripts/build-manifest.js <browser>
 * Example: node scripts/build-manifest.js chrome
 *          node scripts/build-manifest.js firefox
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get browser target from command line argument
const browser = process.argv[2];

if (!browser || !["chrome", "firefox"].includes(browser)) {
  console.error("Error: Please specify browser target (chrome or firefox)");
  console.error("Usage: node scripts/build-manifest.js <browser>");
  process.exit(1);
}

const rootDir = path.join(__dirname, "..");
const manifestsDir = path.join(rootDir, "manifests");
const buildDir = path.join(rootDir, "build", browser);

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

/**
 * Deep merge two objects
 * @param {object} target - Target object
 * @param {object} source - Source object to merge into target
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
  const output = { ...target };

  // Special fields that should be completely replaced, not merged
  const replaceFields = ["background"];

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      // Replace field entirely if in replaceFields list
      if (replaceFields.includes(key)) {
        output[key] = source[key];
      } else if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        // Recursively merge nested objects
        output[key] = deepMerge(output[key] || {}, source[key]);
      } else {
        // Overwrite or add property
        output[key] = source[key];
      }
    }
  }

  return output;
}

try {
  // Read base manifest
  const basePath = path.join(manifestsDir, "base.json");
  const baseManifest = JSON.parse(fs.readFileSync(basePath, "utf8"));

  // Read browser-specific manifest
  const browserPath = path.join(manifestsDir, `${browser}.json`);
  const browserManifest = JSON.parse(fs.readFileSync(browserPath, "utf8"));

  // Merge manifests (browser-specific overrides base)
  const finalManifest = deepMerge(baseManifest, browserManifest);

  // Remove $comment keys (used for documentation only)
  delete finalManifest.$comment;

  // Write final manifest to build directory
  const outputPath = path.join(buildDir, "manifest.json");
  fs.writeFileSync(outputPath, JSON.stringify(finalManifest, null, 2) + "\n");

  console.log(`✓ Built ${browser} manifest: ${outputPath}`);
} catch (error) {
  console.error(`Error building ${browser} manifest:`, error.message);
  process.exit(1);
}
