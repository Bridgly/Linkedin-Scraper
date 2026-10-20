import { fetchVoyager } from '../../linkedin/client';
import {
  entitiesOfType,
  entityResolver,
  indexByUrn,
  type ResolveEntity,
} from '../../linkedin/included';
import {
  found,
  unexpectedResponse,
  type ScrapeResult,
} from '../../linkedin/result';
import { compact } from '../../util/array';
import {
  ENTITY_RESULT_TYPE,
  EntityResultSchema,
  SearchResponseSchema,
  type EntityResult,
  type SearchResponse,
} from './raw-schema';
import type { SearchRequest } from './request-schema';
import { buildSearchUrl, type SearchResultType } from './search-url';

/**
 * Maps one result card. Gets a resolver for the entities the card points at,
 * and returns null for cards that don't belong to the tab (ads, banners).
 */
export type BuildCard<T> = (
  card: EntityResult,
  resolve: ResolveEntity,
) => T | null;

/** One page of search results. */
export type SearchPage<T> = { items: T[]; totalResultCount: number | null };

/** The items of every result cluster, in display order. */
export function clusterItems(response: SearchResponse) {
  const clusters = response.data.data.searchDashClustersByAll?.elements ?? [];
  return clusters.flatMap((cluster) =>
    compact((cluster.items ?? []).map((entry) => entry.item)),
  );
}

/** LinkedIn's total number of matches (not the number on this page). */
export function totalResultCount(response: SearchResponse): number | null {
  return (
    response.data.data.searchDashClustersByAll?.metadata?.totalResultCount ??
    null
  );
}

/** Puts the cards back in display order and maps each with `buildCard`. */
function transformEntitySearch<T>(
  json: unknown,
  label: string,
  buildCard: BuildCard<T>,
): ScrapeResult<SearchPage<T>> {
  const parsed = SearchResponseSchema.safeParse(json);
  if (!parsed.success)
    return unexpectedResponse(`${label} search`, parsed.error);
  const { included } = parsed.data;

  const cards = indexByUrn(
    entitiesOfType(included, ENTITY_RESULT_TYPE, EntityResultSchema),
  );
  const resolve = entityResolver(included);
  const orderedCards = compact(
    clusterItems(parsed.data).map((item) => {
      const urn = item['*entityResult'];
      return urn == null ? undefined : cards.get(urn);
    }),
  );

  return found({
    items: compact(orderedCards.map((card) => buildCard(card, resolve))),
    totalResultCount: totalResultCount(parsed.data),
  });
}

/** Runs a search on one tab and maps every result card with `buildCard`. */
export async function searchEntities<T>({
  resultType,
  request,
  buildCard,
}: {
  resultType: SearchResultType;
  request: SearchRequest;
  buildCard: BuildCard<T>;
}): Promise<ScrapeResult<SearchPage<T>>> {
  return fetchVoyager({
    url: buildSearchUrl({ resultType, ...request }),
    on404: 'endpointGone',
    transform: (json) =>
      transformEntitySearch(json, resultType.toLowerCase(), buildCard),
  });
}
