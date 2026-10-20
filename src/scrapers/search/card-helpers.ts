import type { ResolveEntity } from '../../linkedin/included';
import { compact } from '../../util/array';
import { extractTrailingId } from '../../util/urn';
import {
  JobPostingFooterSchema,
  ResolvedCompanySchema,
  type EntityResult,
} from './raw-schema';

/** Every insight line under a card. */
export function insightLines(card: EntityResult): string[] {
  return compact(
    (card.insightsResolutionResults ?? []).map(
      (insight) => insight.simpleInsight?.title?.text,
    ),
  );
}

/** The text after `prefix` on the first insight line that starts with it. */
export function insightAfterPrefix(
  lines: string[],
  prefix: string,
): string | null {
  const line = lines.find((candidate) => candidate.startsWith(prefix));
  return line?.slice(prefix.length).trim() || null;
}

/** A company the card mentions, looked up by URN. */
export type MentionedCompany = {
  companyUrn: string;
  companyId: string | null;
  name: string | null;
  companyUrl: string | null;
};

/** Resolves a company URN to its name and page. */
function resolveCompany(
  resolve: ResolveEntity,
  urn: string | null | undefined,
): MentionedCompany | null {
  const parsed = ResolvedCompanySchema.safeParse(resolve(urn));
  if (!parsed.success) return null;
  return {
    companyUrn: parsed.data.entityUrn,
    companyId: extractTrailingId(parsed.data.entityUrn),
    name: parsed.data.name ?? null,
    companyUrl: parsed.data.url ?? null,
  };
}

/**
 * Reads a product's "Used by Acme, Globex and 12 others" line: the named
 * companies (each name points at a company URN) and the "others" count.
 */
export function extractUsedBy(
  card: EntityResult,
  resolve: ResolveEntity,
): { companies: MentionedCompany[]; othersCount: number | null } {
  const line = compact(
    (card.insightsResolutionResults ?? []).map(
      (insight) => insight.simpleInsight?.title,
    ),
  ).find((title) => (title.text ?? '').startsWith('Used by '));
  if (line == null) return { companies: [], othersCount: null };

  const companies = compact(
    (line.attributesV2 ?? []).map((attribute) =>
      resolveCompany(resolve, attribute.detailData?.['*companyName']),
    ),
  );
  const others = line.text?.match(/and ([\d,]+)\s+others?/)?.at(1);
  return {
    companies,
    othersCount: others == null ? null : Number(others.replace(/,/g, '')),
  };
}

/** A job card's listing time, from the job posting card it points at. */
export function extractJobListedAt(
  card: EntityResult,
  resolve: ResolveEntity,
): number | null {
  const footerUrn = compact(
    (card.insightsResolutionResults ?? []).map(
      (insight) => insight['*jobPostingFooterInsight'],
    ),
  ).at(0);
  const footer = JobPostingFooterSchema.safeParse(resolve(footerUrn));
  if (!footer.success) return null;
  const listed = (footer.data.footerItems ?? []).find(
    (item) => item.type === 'LISTED_DATE',
  );
  return listed?.timeAt ?? null;
}

/** The hiring company of a job card, which rides on its logo. */
export function companyUrnFromLogo(card: EntityResult): string | null {
  return (
    compact(
      (card.image?.attributes ?? []).map(
        (attribute) => attribute.detailData?.nonEntityCompanyLogo?.['*company'],
      ),
    ).at(0) ?? null
  );
}
