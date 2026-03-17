import { describe, it, expect } from "vitest";
import { batchProcess } from "../src/lib/batch-process.ts";

describe("batchProcess", () => {
  it("processes all items when count <= concurrency limit", async () => {
    const items = [1, 2, 3];
    const results = await batchProcess(items, async (n) => n * 2, 5);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(results.map((r) => r.value)).toEqual([2, 4, 6]);
  });

  it("batches items correctly when count > concurrency limit", async () => {
    let currentConcurrent = 0;
    let maxConcurrent = 0;
    const batchBoundaries = [];

    const items = [1, 2, 3, 4, 5, 6, 7];
    const concurrencyLimit = 3;

    // Track how many promises are running at the same time within each batch.
    // Between batches the count resets to 0 because Promise.allSettled resolves
    // before the next batch starts.
    const results = await batchProcess(
      items,
      async (n) => {
        currentConcurrent++;
        if (currentConcurrent > maxConcurrent) {
          maxConcurrent = currentConcurrent;
        }
        // Yield to let all promises in the batch start before any resolve
        await new Promise((resolve) => setTimeout(resolve, 10));
        currentConcurrent--;
        if (currentConcurrent === 0) {
          batchBoundaries.push(n);
        }
        return n * 10;
      },
      concurrencyLimit
    );

    // Max concurrency should never exceed the limit
    expect(maxConcurrent).toBeLessThanOrEqual(concurrencyLimit);

    // All 7 items should be processed
    expect(results).toHaveLength(7);
    expect(results.map((r) => r.value)).toEqual([10, 20, 30, 40, 50, 60, 70]);

    // There should be 3 batches: [1,2,3], [4,5,6], [7]
    expect(batchBoundaries).toHaveLength(3);
  });

  it("handles empty input array", async () => {
    const results = await batchProcess([], async (n) => n, 5);
    expect(results).toEqual([]);
  });

  it("handles rejected promises (mixed fulfilled/rejected results)", async () => {
    const items = ["ok-1", "fail", "ok-2", "fail", "ok-3"];

    const results = await batchProcess(
      items,
      async (item) => {
        if (item === "fail") {
          throw new Error(`rejected: ${item}`);
        }
        return item.toUpperCase();
      },
      10
    );

    expect(results).toHaveLength(5);

    expect(results[0].status).toBe("fulfilled");
    expect(results[0].value).toBe("OK-1");

    expect(results[1].status).toBe("rejected");
    expect(results[1].reason.message).toBe("rejected: fail");

    expect(results[2].status).toBe("fulfilled");
    expect(results[2].value).toBe("OK-2");

    expect(results[3].status).toBe("rejected");
    expect(results[3].reason.message).toBe("rejected: fail");

    expect(results[4].status).toBe("fulfilled");
    expect(results[4].value).toBe("OK-3");
  });

  it("preserves order of results matching input order", async () => {
    // Each item resolves after a random-ish delay to shuffle completion order
    const items = [5, 3, 1, 4, 2];

    const results = await batchProcess(
      items,
      async (n) => {
        await new Promise((resolve) => setTimeout(resolve, n * 5));
        return `item-${n}`;
      },
      2
    );

    expect(results).toHaveLength(5);
    expect(results.map((r) => r.value)).toEqual([
      "item-5",
      "item-3",
      "item-1",
      "item-4",
      "item-2",
    ]);
  });
});
