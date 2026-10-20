import { z } from 'zod';
import { imageViewModelUrl } from '../../linkedin/images';
import { mapFound, type ScrapeResult } from '../../linkedin/result';
import { compact } from '../../util/array';
import { extractPathSegment } from '../../util/url';
import { extractEntityUrn, resolveMemberUrn } from '../../util/urn';
import { searchEntities } from './entity-search';
import type { EntityResult } from './raw-schema';
import type { SearchRequest } from './request-schema';

export const SearchServiceSchema = z.object({
  profileUrn: z.string(),
  memberUrn: z.string().nullable(),
  servicePageUrl: z.string().nullable(),
  servicePageId: z.string().nullable(),
  name: z.string().nullable(),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  description: z.string().nullable(),
  // e.g. ["Logo Design", "Brand Design"]
  services: z.array(z.string()),
  profilePictureUrl: z.string().nullable(),
});
export type SearchService = z.infer<typeof SearchServiceSchema>;

export const SearchServicesSchema = z.object({
  services: z.array(SearchServiceSchema),
  keyword: z.string(),
  totalResultCount: z.number().nullable(),
});
export type SearchServices = z.infer<typeof SearchServicesSchema>;

/** Maps a service-provider result card. */
function buildSearchService(card: EntityResult): SearchService | null {
  const profileUrn = extractEntityUrn(
    card.entityUrn,
    'fsd_profile',
    '[A-Za-z0-9_-]+',
  );
  if (profileUrn == null) return null;

  return {
    profileUrn,
    memberUrn: resolveMemberUrn(card.trackingUrn),
    servicePageUrl: card.navigationUrl ?? null,
    servicePageId: extractPathSegment(card.navigationUrl, 'services/page'),
    name: card.title?.text || null,
    headline: card.primarySubtitle?.text || null,
    location: card.secondarySubtitle?.text || null,
    description: card.summary?.text || null,
    services: compact(
      (card.insightsResolutionResults ?? []).flatMap(
        (insight) => insight.labelsInsight?.entityLabels ?? [],
      ),
    ),
    profilePictureUrl: imageViewModelUrl(card.image),
  };
}

/** Searches freelancers and agencies on the services marketplace by keyword. */
export async function searchServices(
  request: SearchRequest,
): Promise<ScrapeResult<SearchServices>> {
  const page = await searchEntities({
    resultType: 'SERVICES',
    request,
    buildCard: buildSearchService,
  });
  return mapFound(page, ({ items, totalResultCount }) => ({
    services: items,
    keyword: request.keyword,
    totalResultCount,
  }));
}
