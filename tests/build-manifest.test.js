import { describe, it, expect } from "vitest";
import { deepMerge } from "../scripts/deep-merge.js";

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
