import { fetchVoyager } from '../../../linkedin/client';
import { imageViewModelUrl } from '../../../linkedin/images';
import { entitiesOfType, indexByUrn } from '../../../linkedin/included';
import {
  found,
  unexpectedResponse,
  type ScrapeResult,
} from '../../../linkedin/result';
import { compact } from '../../../util/array';
import { stripUrlQuery } from '../../../util/url';
import { clusterItems, totalResultCount } from '../entity-search';
import { SearchResponseSchema } from '../raw-schema';
import type { SearchPostsRequest } from '../request-schema';
import { buildSearchUrl } from '../search-url';
import {
  POST_SEARCH_TYPES,
  SearchSocialCountsSchema,
  SearchSocialDetailSchema,
  SearchUpdateSchema,
  type SearchActor,
  type SearchSocialCounts,
  type SearchUpdate,
} from './raw-schema';
import type {
  SearchPost,
  SearchPostAuthor,
  SearchPostContent,
  SearchPosts,
} from './schema';

/** Maps a post's author. The name points at the author's profile URN. */
function buildAuthor(
  actor: SearchActor | null | undefined,
): SearchPostAuthor | null {
  if (actor == null) return null;
  return {
    name: actor.name?.text ?? null,
    headline: actor.description?.text ?? null,
    profileUrl: stripUrlQuery(actor.navigationContext?.actionTarget),
    profileUrn:
      compact(
        (actor.name?.attributesV2 ?? []).map(
          (attribute) => attribute.detailData?.['*profileFullName'],
        ),
      ).at(0) ?? null,
    memberUrn: actor.backendUrn ?? null,
    imageUrl: imageViewModelUrl(actor.image),
  };
}

/** What the post links to: an article, a card (job, event…) or images. */
function buildContent(update: SearchUpdate): SearchPostContent | null {
  const { articleComponent, entityComponent, imageComponent } =
    update.content ?? {};
  if (articleComponent != null) {
    return {
      type: 'article',
      title: articleComponent.title?.text ?? null,
      subtitle: articleComponent.subtitle?.text ?? null,
      url: stripUrlQuery(articleComponent.navigationContext?.actionTarget),
      imageUrl: imageViewModelUrl(articleComponent.largeImage),
    };
  }
  if (entityComponent != null) {
    return {
      type: 'entity',
      title: entityComponent.title?.text ?? null,
      subtitle: entityComponent.subtitle?.text ?? null,
      description: entityComponent.description?.text ?? null,
      url: stripUrlQuery(entityComponent.navigationContext?.actionTarget),
      imageUrl: imageViewModelUrl(entityComponent.image),
    };
  }
  const urls = compact(
    (imageComponent?.images ?? []).map((image) => imageViewModelUrl(image)),
  );
  return urls.length === 0 ? null : { type: 'images', urls };
}

/** Maps one post. */
function buildSearchPost(
  update: SearchUpdate,
  counts: SearchSocialCounts | undefined,
): SearchPost | null {
  const activityUrn = update.metadata?.backendUrn;
  if (activityUrn == null) return null;
  return {
    urn: activityUrn,
    shareUrn: update.metadata?.shareUrn ?? null,
    url: stripUrlQuery(update.socialContent?.shareUrl),
    text: update.commentary?.text?.text ?? null,
    postedAgo:
      update.actor?.subDescription?.text?.split('•').at(0)?.trim() || null,
    author: buildAuthor(update.actor),
    socialCounts:
      counts == null
        ? null
        : {
            numLikes: counts.numLikes ?? null,
            numComments: counts.numComments ?? null,
            numShares: counts.numShares ?? null,
            reactionTypeCounts: counts.reactionTypeCounts ?? [],
          },
    content: buildContent(update),
  };
}

/**
 * Turns a posts-tab response into {@link SearchPosts}. Counts are reached
 * through the social detail, because they may be keyed by the ugcPost URN
 * rather than the activity URN.
 */
function transformSearchPosts(
  json: unknown,
  keyword: string,
): ScrapeResult<SearchPosts> {
  const parsed = SearchResponseSchema.safeParse(json);
  if (!parsed.success) return unexpectedResponse('posts search', parsed.error);
  const { included } = parsed.data;

  const updates = indexByUrn(
    entitiesOfType(included, POST_SEARCH_TYPES.update, SearchUpdateSchema),
  );
  const socialDetails = indexByUrn(
    entitiesOfType(
      included,
      POST_SEARCH_TYPES.socialDetail,
      SearchSocialDetailSchema,
    ),
  );
  const socialCounts = indexByUrn(
    entitiesOfType(
      included,
      POST_SEARCH_TYPES.socialCounts,
      SearchSocialCountsSchema,
    ),
  );
  const countsOf = (update: SearchUpdate): SearchSocialCounts | undefined => {
    const detailUrn = update['*socialDetail'];
    const countsUrn =
      detailUrn == null
        ? undefined
        : socialDetails.get(detailUrn)?.['*totalSocialActivityCounts'];
    return countsUrn == null ? undefined : socialCounts.get(countsUrn);
  };

  const orderedUpdates = compact(
    clusterItems(parsed.data).map((item) => {
      const urn = item.searchFeedUpdate?.['*update'];
      return urn == null ? undefined : updates.get(urn);
    }),
  );
  return found({
    posts: compact(
      orderedUpdates.map((update) => buildSearchPost(update, countsOf(update))),
    ),
    keyword,
    totalResultCount: totalResultCount(parsed.data),
  });
}

/** Searches posts by keyword, optionally sorted by date or filtered by age. */
export async function searchPosts(
  request: SearchPostsRequest,
): Promise<ScrapeResult<SearchPosts>> {
  const { sortOrder, datePosted } = request;
  const filters = compact([
    sortOrder == null ? null : `(key:sortBy,value:List(${sortOrder}))`,
    datePosted == null ? null : `(key:datePosted,value:List("${datePosted}"))`,
  ]);
  return fetchVoyager({
    url: buildSearchUrl({
      resultType: 'CONTENT',
      ...request,
      extraQueryParameters: filters,
    }),
    on404: 'endpointGone',
    transform: (json) => transformSearchPosts(json, request.keyword),
  });
}
