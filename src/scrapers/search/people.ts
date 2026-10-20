import { match } from 'ts-pattern';
import { z } from 'zod';
import { LINKEDIN_URL } from '../../linkedin/endpoints';
import { imageViewModelUrl } from '../../linkedin/images';
import { mapFound, type ScrapeResult } from '../../linkedin/result';
import { extractPathSegment } from '../../util/url';
import { extractEntityUrn, resolveMemberUrn } from '../../util/urn';
import { insightLines } from './card-helpers';
import { searchEntities } from './entity-search';
import type { EntityResult } from './raw-schema';
import type { SearchRequest } from './request-schema';

const NetworkDistanceSchema = z.enum([
  'self',
  '1st',
  '2nd',
  '3rd',
  'out_of_network',
]);
type NetworkDistance = z.infer<typeof NetworkDistanceSchema>;

export const SearchPersonSchema = z.object({
  profileUrn: z.string(),
  // Null for private members, who show up as "LinkedIn Member".
  publicIdentifier: z.string().nullable(),
  profileUrl: z.string().nullable(),
  memberUrn: z.string().nullable(),
  name: z.string().nullable(),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  summary: z.string().nullable(),
  profilePictureUrl: z.string().nullable(),
  // Connection degree from the account whose cookies you use.
  networkDistance: NetworkDistanceSchema.nullable(),
  degreeBadge: z.string().nullable(),
  verified: z.boolean(),
  // "1 mutual connection", "28K followers"
  insight: z.string().nullable(),
});
export type SearchPerson = z.infer<typeof SearchPersonSchema>;

export const SearchPeopleSchema = z.object({
  people: z.array(SearchPersonSchema),
  keyword: z.string(),
  totalResultCount: z.number().nullable(),
});
export type SearchPeople = z.infer<typeof SearchPeopleSchema>;

const VERIFIED_ICON = 'SYS_ICN_VERIFIED_SMALL';

/** Maps LinkedIn's `memberDistance` to a degree. */
function toNetworkDistance(
  memberDistance: string | null | undefined,
): NetworkDistance | null {
  return match(memberDistance)
    .returnType<NetworkDistance | null>()
    .with('SELF', () => 'self')
    .with('DISTANCE_1', () => '1st')
    .with('DISTANCE_2', () => '2nd')
    .with('DISTANCE_3', () => '3rd')
    .with('OUT_OF_NETWORK', () => 'out_of_network')
    .otherwise(() => null);
}

/** Maps a people result card. */
export function buildSearchPerson(card: EntityResult): SearchPerson | null {
  const profileUrn = extractEntityUrn(
    card.entityUrn,
    'fsd_profile',
    '[A-Za-z0-9_-]+',
  );
  if (profileUrn == null) return null;
  const publicIdentifier = extractPathSegment(card.navigationUrl, 'in');

  return {
    profileUrn,
    publicIdentifier,
    profileUrl:
      publicIdentifier == null
        ? null
        : `${LINKEDIN_URL}/in/${publicIdentifier}`,
    memberUrn: resolveMemberUrn(card.trackingUrn),
    name: card.title?.text ?? null,
    headline: card.primarySubtitle?.text ?? null,
    location: card.secondarySubtitle?.text ?? null,
    summary: card.summary?.text ?? null,
    profilePictureUrl: imageViewModelUrl(card.image),
    networkDistance: toNetworkDistance(
      card.entityCustomTrackingInfo?.memberDistance,
    ),
    degreeBadge: card.badgeText?.text?.replace(/^[•\s]+/, '').trim() || null,
    verified:
      card.badgeIcon?.attributes?.at(0)?.detailData?.systemImage ===
      VERIFIED_ICON,
    insight: insightLines(card).at(0) ?? null,
  };
}

/** Searches members by keyword. */
export async function searchPeople(
  request: SearchRequest,
): Promise<ScrapeResult<SearchPeople>> {
  const page = await searchEntities({
    resultType: 'PEOPLE',
    request,
    buildCard: buildSearchPerson,
  });
  return mapFound(page, ({ items, totalResultCount }) => ({
    people: items,
    keyword: request.keyword,
    totalResultCount,
  }));
}
