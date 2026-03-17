import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { deepMerge } from "../scripts/deep-merge.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestsDir = path.join(__dirname, "..", "manifests");

describe("deepMerge", () => {
  it("merges flat objects", () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    expect(deepMerge(target, source)).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("recursively merges nested objects", () => {
    const target = { nested: { a: 1, b: 2 } };
    const source = { nested: { b: 3, c: 4 } };
    expect(deepMerge(target, source)).toEqual({ nested: { a: 1, b: 3, c: 4 } });
  });

  it("replaces 'background' field entirely instead of merging", () => {
    const target = { background: { service_worker: "sw.js" } };
    const source = { background: { scripts: ["sw.js"] } };
    const result = deepMerge(target, source);
    expect(result.background).toEqual({ scripts: ["sw.js"] });
    expect(result.background.service_worker).toBeUndefined();
  });

  it("overwrites arrays instead of merging them", () => {
    const target = { permissions: ["a", "b"] };
    const source = { permissions: ["c"] };
    expect(deepMerge(target, source)).toEqual({ permissions: ["c"] });
  });

  it("does not mutate the target object", () => {
    const target = { a: 1, nested: { b: 2 } };
    const source = { a: 99, nested: { c: 3 } };
    const original = JSON.parse(JSON.stringify(target));
    deepMerge(target, source);
    expect(target).toEqual(original);
  });

  it("does not mutate the source object", () => {
    const target = { background: { service_worker: "sw.js" } };
    const source = { background: { scripts: ["sw.js"] } };
    const originalSource = JSON.parse(JSON.stringify(source));
    const result = deepMerge(target, source);
    result.background.scripts.push("extra.js");
    expect(source).toEqual(originalSource);
  });

  it("deep clones arrays to prevent mutation leakage", () => {
    const target = {};
    const source = { permissions: ["a", "b"] };
    const result = deepMerge(target, source);
    result.permissions.push("c");
    expect(source.permissions).toEqual(["a", "b"]);
  });

  it("handles empty source", () => {
    const target = { a: 1 };
    expect(deepMerge(target, {})).toEqual({ a: 1 });
  });

  it("handles empty target", () => {
    const source = { a: 1 };
    expect(deepMerge({}, source)).toEqual({ a: 1 });
  });

  it("adds new nested keys from source", () => {
    const target = { icons: { "16": "icon-16.png" } };
    const source = { icons: { "32": "icon-32.png" } };
    expect(deepMerge(target, source)).toEqual({
      icons: { "16": "icon-16.png", "32": "icon-32.png" },
    });
  });
});

describe("manifest build integration", () => {
  function buildManifest(browser) {
    const base = JSON.parse(fs.readFileSync(path.join(manifestsDir, "base.json"), "utf8"));
    const overrides = JSON.parse(fs.readFileSync(path.join(manifestsDir, `${browser}.json`), "utf8"));
    const merged = deepMerge(base, overrides);
    delete merged.$comment;
    return merged;
  }

  it("removes $comment from chrome manifest", () => {
    const manifest = buildManifest("chrome");
    expect(manifest.$comment).toBeUndefined();
  });

  it("chrome manifest has service_worker background", () => {
    const manifest = buildManifest("chrome");
    expect(manifest.background.service_worker).toBe("service-worker.js");
  });

  it("firefox manifest has scripts background instead of service_worker", () => {
    const manifest = buildManifest("firefox");
    expect(manifest.background.scripts).toEqual(["service-worker.js"]);
    expect(manifest.background.service_worker).toBeUndefined();
  });

  it("firefox manifest has gecko settings", () => {
    const manifest = buildManifest("firefox");
    expect(manifest.browser_specific_settings.gecko.id).toBeDefined();
  });

  it("both manifests have required fields", () => {
    for (const browser of ["chrome", "firefox"]) {
      const manifest = buildManifest(browser);
      expect(manifest.manifest_version).toBe(3);
      expect(manifest.name).toBeDefined();
      expect(manifest.version).toBeDefined();
      expect(manifest.permissions).toContain("activeTab");
      expect(manifest.action).toBeDefined();
    }
  });
});
