import { z } from 'zod';
import { LINKEDIN_URL } from '../../linkedin/endpoints';
import { imageViewModelUrl } from '../../linkedin/images';
import { mapFound, type ScrapeResult } from '../../linkedin/result';
import { parseLeadingCount } from '../../util/text';
import { extractPathSegment } from '../../util/url';
import { extractEntityUrn, extractTrailingId } from '../../util/urn';
import { searchEntities } from './entity-search';
import type { EntityResult } from './raw-schema';
import type { SearchRequest } from './request-schema';

export const SearchSchoolSchema = z.object({
  // Schools are organizations on LinkedIn, so this is a company URN.
  schoolUrn: z.string(),
  schoolId: z.string().nullable(),
  universalName: z.string().nullable(),
  schoolUrl: z.string().nullable(),
  name: z.string().nullable(),
  location: z.string().nullable(),
  // "4,525 students and alumni on LinkedIn", and the same as a number.
  studentsAndAlumniLabel: z.string().nullable(),
  studentsAndAlumniCount: z.number().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
});
export type SearchSchool = z.infer<typeof SearchSchoolSchema>;

export const SearchSchoolsSchema = z.object({
  schools: z.array(SearchSchoolSchema),
  keyword: z.string(),
  totalResultCount: z.number().nullable(),
});
export type SearchSchools = z.infer<typeof SearchSchoolsSchema>;

/** Maps a school result card. */
function buildSearchSchool(card: EntityResult): SearchSchool | null {
  const schoolUrn = extractEntityUrn(card.entityUrn, 'fsd_company');
  if (schoolUrn == null) return null;
  const universalName = extractPathSegment(card.navigationUrl, 'company');
  const studentsAndAlumniLabel = card.secondarySubtitle?.text || null;

  return {
    schoolUrn,
    schoolId: extractTrailingId(schoolUrn),
    universalName,
    schoolUrl:
      universalName == null
        ? null
        : `${LINKEDIN_URL}/company/${universalName}/`,
    name: card.title?.text || null,
    location: card.primarySubtitle?.text || null,
    studentsAndAlumniLabel,
    studentsAndAlumniCount: parseLeadingCount(studentsAndAlumniLabel),
    description: card.summary?.text || null,
    logoUrl: imageViewModelUrl(card.image),
  };
}

/** Searches schools and universities by keyword. */
export async function searchSchools(
  request: SearchRequest,
): Promise<ScrapeResult<SearchSchools>> {
  const page = await searchEntities({
    resultType: 'SCHOOLS',
    request,
    buildCard: buildSearchSchool,
  });
  return mapFound(page, ({ items, totalResultCount }) => ({
    schools: items,
    keyword: request.keyword,
    totalResultCount,
  }));
}
