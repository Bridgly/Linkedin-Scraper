/** Drops `null` and `undefined` entries from a list. */
export function compact<T>(items: (T | null | undefined)[]): T[] {
  return items.flatMap((item) => (item == null ? [] : [item]));
}
