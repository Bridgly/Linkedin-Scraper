/**
 * LinkedIn identifies everything with URNs such as `urn:li:fsd_company:1441`
 * or `urn:li:activity:7300000000000000000`. These helpers pull ids out of them.
 */

/** The numeric id at the end of a URN: `urn:li:event:123` -> `123`. */
export function extractTrailingId(
  urn: string | null | undefined,
): string | null {
  return urn?.match(/(\d+)$/)?.at(1) ?? null;
}

/**
 * The last colon-separated segment of a URN, numeric or not:
 * `urn:li:fs_employmentStatus:FULL_TIME` -> `FULL_TIME`.
 */
export function extractUrnLastSegment(
  urn: string | null | undefined,
): string | null {
  return urn?.split(':').at(-1) ?? null;
}

/**
 * Finds a URN of one `type` inside a compound URN. Numeric ids match by
 * default; pass `idPattern` for opaque ids such as profile tokens.
 * `extractEntityUrn('urn:li:x:(urn:li:fsd_company:1441,…)', 'fsd_company')`
 * -> `urn:li:fsd_company:1441`.
 */
export function extractEntityUrn(
  urn: string,
  type: string,
  idPattern = '\\d+',
): string | null {
  return urn.match(new RegExp(`urn:li:${type}:${idPattern}`))?.at(0) ?? null;
}

/** Search results for private members carry this placeholder instead of a member URN. */
const HEADLESS_MEMBER_SUFFIX = ':headless';

/** A member URN, or null when LinkedIn hides the member behind a placeholder. */
export function resolveMemberUrn(
  urn: string | null | undefined,
): string | null {
  if (urn == null || urn.endsWith(HEADLESS_MEMBER_SUFFIX)) return null;
  return urn;
}
