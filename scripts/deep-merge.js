/**
 * Deep merge two objects.
 * Special fields (like "background") are completely replaced, not merged.
 *
 * @param {object} target - Target object
 * @param {object} source - Source object to merge into target
 * @returns {object} Merged object
 */
export function deepMerge(target, source) {
  const output = { ...target };

  // Special fields that should be completely replaced, not merged
  const replaceFields = ["background"];

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      // Replace field entirely if in replaceFields list
      if (replaceFields.includes(key)) {
        output[key] = structuredClone(source[key]);
      } else if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        // Recursively merge nested objects
        output[key] = deepMerge(output[key] || {}, source[key]);
      } else if (Array.isArray(source[key])) {
        // Deep clone arrays to prevent mutation leakage
        output[key] = structuredClone(source[key]);
      } else {
        // Overwrite or add primitive property
        output[key] = source[key];
      }
    }
  }

  return output;
}
