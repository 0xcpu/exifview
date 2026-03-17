/**
 * Generic batched concurrency utility.
 *
 * Processes an array of items through an async function in sequential batches
 * of a given size, limiting the number of concurrent promises to avoid
 * resource exhaustion.
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrencyLimit: number
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += concurrencyLimit) {
    const batch = items.slice(i, i + concurrencyLimit);
    const settled = await Promise.allSettled(batch.map(processor));
    results.push(...settled);
  }
  return results;
}
