/**
 * The slug after a path `segment` of a LinkedIn URL:
 * `extractPathSegment('…/company/openai/life', 'company')` -> `openai`.
 */
export function extractPathSegment(
  url: string | null | undefined,
  segment: string,
): string | null {
  return url?.match(new RegExp(`/${segment}/([^/?]+)`))?.at(1) ?? null;
}

/** Removes the query string and hash, which on LinkedIn are tracking params. */
export function stripUrlQuery(url: string | null | undefined): string | null {
  if (url == null) return null;
  if (!URL.canParse(url)) return url;
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
}

/**
 * Encodes a free-text value (a keyword, a location) for LinkedIn's Rest.li
 * `(key:value,…)` query syntax. `encodeURIComponent` leaves `( ) ' ! *` alone,
 * but a bare parenthesis inside a value breaks the syntax and LinkedIn answers
 * 400, so those are escaped too.
 */
export function encodeRestliValue(value: string): string {
  return encodeURIComponent(value).replace(
    /[()'!*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
