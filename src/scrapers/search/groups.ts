import { z } from 'zod';
import { LINKEDIN_URL } from '../../linkedin/endpoints';
import { imageViewModelUrl } from '../../linkedin/images';
import { mapFound, type ScrapeResult } from '../../linkedin/result';
import { parseAbbreviatedCount } from '../../util/text';
import { extractEntityUrn, extractTrailingId } from '../../util/urn';
import { searchEntities } from './entity-search';
import type { EntityResult } from './raw-schema';
import type { SearchRequest } from './request-schema';

export const SearchGroupSchema = z.object({
  groupUrn: z.string(),
  groupId: z.string().nullable(),
  groupUrl: z.string().nullable(),
  name: z.string().nullable(),
  // "629K members", and the same as a number.
  membersLabel: z.string().nullable(),
  membersCount: z.number().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
});
export type SearchGroup = z.infer<typeof SearchGroupSchema>;

export const SearchGroupsSchema = z.object({
  groups: z.array(SearchGroupSchema),
  keyword: z.string(),
  totalResultCount: z.number().nullable(),
});
export type SearchGroups = z.infer<typeof SearchGroupsSchema>;

/** Maps a group result card. */
export function buildSearchGroup(card: EntityResult): SearchGroup | null {
  const groupUrn = extractEntityUrn(card.entityUrn, 'fsd_group');
  if (groupUrn == null) return null;
  const groupId = extractTrailingId(groupUrn);
  const membersLabel = card.primarySubtitle?.text || null;

  return {
    groupUrn,
    groupId,
    groupUrl: groupId == null ? null : `${LINKEDIN_URL}/groups/${groupId}`,
    name: card.title?.text || null,
    membersLabel,
    membersCount: parseAbbreviatedCount(membersLabel),
    description: card.summary?.text || null,
    logoUrl: imageViewModelUrl(card.image),
  };
}

/** Searches groups by keyword. */
export async function searchGroups(
  request: SearchRequest,
): Promise<ScrapeResult<SearchGroups>> {
  const page = await searchEntities({
    resultType: 'GROUPS',
    request,
    buildCard: buildSearchGroup,
  });
  return mapFound(page, ({ items, totalResultCount }) => ({
    groups: items,
    keyword: request.keyword,
    totalResultCount,
  }));
}
