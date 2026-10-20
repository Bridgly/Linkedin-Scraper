import { z } from 'zod';
import { LINKEDIN_URL } from '../../linkedin/endpoints';
import { imageViewModelUrl } from '../../linkedin/images';
import { mapFound, type ScrapeResult } from '../../linkedin/result';
import { parseAbbreviatedCount, splitOnBullet } from '../../util/text';
import { extractPathSegment } from '../../util/url';
import { extractEntityUrn, extractTrailingId } from '../../util/urn';
import { searchEntities } from './entity-search';
import type { EntityResult } from './raw-schema';
import type { SearchRequest } from './request-schema';

export const SearchCompanySchema = z.object({
  companyUrn: z.string(),
  companyId: z.string().nullable(),
  universalName: z.string().nullable(),
  companyUrl: z.string().nullable(),
  name: z.string().nullable(),
  industry: z.string().nullable(),
  location: z.string().nullable(),
  // "31K followers", and the same as a number.
  followersLabel: z.string().nullable(),
  followersCount: z.number().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
});
export type SearchCompany = z.infer<typeof SearchCompanySchema>;

export const SearchCompaniesSchema = z.object({
  companies: z.array(SearchCompanySchema),
  keyword: z.string(),
  totalResultCount: z.number().nullable(),
});
export type SearchCompanies = z.infer<typeof SearchCompaniesSchema>;

/** Maps a company result card. Its subtitle reads "<industry> • <location>". */
export function buildSearchCompany(card: EntityResult): SearchCompany | null {
  const companyUrn = extractEntityUrn(card.entityUrn, 'fsd_company');
  if (companyUrn == null) return null;
  const { head: industry, tail: location } = splitOnBullet(
    card.primarySubtitle?.text,
  );
  const universalName = extractPathSegment(card.navigationUrl, 'company');
  const followersLabel = card.secondarySubtitle?.text || null;

  return {
    companyUrn,
    companyId: extractTrailingId(companyUrn),
    universalName,
    companyUrl:
      universalName == null
        ? null
        : `${LINKEDIN_URL}/company/${universalName}/`,
    name: card.title?.text || null,
    industry,
    location,
    followersLabel,
    followersCount: parseAbbreviatedCount(followersLabel),
    description: card.summary?.text || null,
    logoUrl: imageViewModelUrl(card.image),
  };
}

/** Searches companies by keyword. */
export async function searchCompanies(
  request: SearchRequest,
): Promise<ScrapeResult<SearchCompanies>> {
  const page = await searchEntities({
    resultType: 'COMPANIES',
    request,
    buildCard: buildSearchCompany,
  });
  return mapFound(page, ({ items, totalResultCount }) => ({
    companies: items,
    keyword: request.keyword,
    totalResultCount,
  }));
}
