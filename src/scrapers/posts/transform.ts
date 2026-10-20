import {
  entitiesOfType,
  indexByUrn,
  type IncludedEntity,
} from '../../linkedin/included';
import {
  found,
  notFound,
  unexpectedResponse,
  type ScrapeResult,
} from '../../linkedin/result';
import { compact } from '../../util/array';
import {
  buildPostUrl,
  extractArticle,
  extractEvent,
  extractImages,
  extractJob,
  extractTimestampFromUrn,
  resolveActorLinks,
  resolveSocialCounts,
} from './content';
import {
  FEED_TYPES,
  RawCommentSchema,
  RawFeedItemSchema,
  RawFeedResponseSchema,
  RawMiniCompanySchema,
  RawMiniProfileSchema,
  RawPostDetailResponseSchema,
  RawSocialCountsSchema,
  RawSocialDetailSchema,
  RawUpdateSchema,
  type RawComment,
  type RawMiniCompany,
  type RawMiniProfile,
  type RawSocialCounts,
  type RawSocialDetail,
  type RawUpdate,
} from './raw-schema';
import type { Post, PostComment, PostsPage } from './schema';

/** The side-loaded entities a post points at, indexed by URN. */
type FeedLookups = {
  updates: Map<string, RawUpdate>;
  socialDetails: Map<string, RawSocialDetail>;
  socialCounts: Map<string, RawSocialCounts>;
  miniProfiles: Map<string, RawMiniProfile>;
  miniCompanies: Map<string, RawMiniCompany>;
  // Comments keyed by thread, e.g. `activity:7300000000000000000`.
  comments: Map<string, PostComment[]>;
};

/** Maps a raw comment that came along with a feed page. */
function buildComment(comment: RawComment): PostComment {
  return {
    urn: comment.urn ?? null,
    text: comment.commentV2?.text ?? null,
    commenterName: comment.commenterForDashConversion?.title?.text ?? null,
    commenterUrn: comment.commenterForDashConversion?.urn ?? null,
    createdTime: comment.createdTime ?? null,
    parentCommentUrn: comment.parentCommentUrn ?? null,
  };
}

/** Groups comments by the post thread they belong to. */
function groupCommentsByThread(
  comments: RawComment[],
): Map<string, PostComment[]> {
  const threads = new Set(compact(comments.map((comment) => comment.threadId)));
  return new Map(
    [...threads].map((thread) => [
      thread,
      comments
        .filter((comment) => comment.threadId === thread)
        .map((comment) => buildComment(comment)),
    ]),
  );
}

/** Parses and indexes every entity a post can point at. */
function buildFeedLookups(
  included: IncludedEntity[],
  updates: RawUpdate[],
): FeedLookups {
  return {
    updates: indexByUrn(updates),
    socialDetails: indexByUrn(
      entitiesOfType(included, FEED_TYPES.socialDetail, RawSocialDetailSchema),
    ),
    socialCounts: indexByUrn(
      entitiesOfType(included, FEED_TYPES.socialCounts, RawSocialCountsSchema),
    ),
    miniProfiles: indexByUrn(
      entitiesOfType(included, FEED_TYPES.miniProfile, RawMiniProfileSchema),
    ),
    miniCompanies: indexByUrn(
      entitiesOfType(included, FEED_TYPES.miniCompany, RawMiniCompanySchema),
    ),
    comments: groupCommentsByThread(
      entitiesOfType(included, FEED_TYPES.comment, RawCommentSchema),
    ),
  };
}

/** Maps one raw post, resolving its author, counts, repost and comments. */
function buildPost(update: RawUpdate, lookups: FeedLookups): Post {
  const activityUrn = update.updateMetadata?.urn ?? null;
  const resharedUrn = update['*resharedUpdate'];
  const reshared =
    update.resharedUpdate ??
    (resharedUrn == null ? undefined : lookups.updates.get(resharedUrn));
  // A plain repost has no attachment of its own; show the original's.
  const content = update.content ?? reshared?.content;

  const actor = resolveActorLinks({ actor: update.actor, ...lookups });
  const resharedActor = resolveActorLinks({
    actor: reshared?.actor,
    ...lookups,
  });

  return {
    urn: activityUrn,
    url: buildPostUrl(activityUrn),
    shareUrn: update.updateMetadata?.shareUrn ?? null,
    shareAudience: update.updateMetadata?.shareAudience ?? null,
    text: update.commentary?.text?.text ?? null,
    publishedAt: update.actor?.subDescription?.accessibilityText ?? null,
    postedAt: extractTimestampFromUrn(activityUrn),
    actorName: update.actor?.name?.text ?? null,
    actorUrn: update.actor?.urn ?? null,
    actorPublicIdentifier: actor.publicIdentifier,
    actorUrl: actor.url,
    actorHeadline: actor.headline,
    images: extractImages(content),
    article: extractArticle(content),
    event: extractEvent(content),
    job: extractJob(content),
    socialCounts: resolveSocialCounts({
      socialDetailUrn: update['*socialDetail'],
      ...lookups,
    }),
    resharedPost:
      reshared == null
        ? null
        : {
            urn: reshared.updateMetadata?.urn ?? null,
            url: buildPostUrl(reshared.updateMetadata?.urn),
            shareUrn: reshared.updateMetadata?.shareUrn ?? null,
            text: reshared.commentary?.text?.text ?? null,
            publishedAt:
              reshared.actor?.subDescription?.accessibilityText ?? null,
            actorName: reshared.actor?.name?.text ?? null,
            actorUrn: reshared.actor?.urn ?? null,
            actorPublicIdentifier: resharedActor.publicIdentifier,
            actorUrl: resharedActor.url,
          },
    comments:
      activityUrn == null
        ? []
        : (lookups.comments.get(activityUrn.replace('urn:li:', '')) ?? []),
  };
}

/**
 * Turns a page of company or member posts into a {@link PostsPage}. The page's
 * own posts are listed by the feed items; the other updates in `included` are
 * reposted originals, which must not show up as posts of their own.
 */
export function transformFeed(json: unknown): ScrapeResult<PostsPage> {
  const parsed = RawFeedResponseSchema.safeParse(json);
  if (!parsed.success) return unexpectedResponse('posts', parsed.error);
  const { included, data } = parsed.data;

  const updates = entitiesOfType(included, FEED_TYPES.update, RawUpdateSchema);
  const pageUrns = new Set(
    compact(
      entitiesOfType(included, FEED_TYPES.feedItem, RawFeedItemSchema).map(
        (item) => item['*value'],
      ),
    ),
  );
  const pagePosts =
    pageUrns.size === 0
      ? updates
      : updates.filter(
          (update) =>
            update.entityUrn != null && pageUrns.has(update.entityUrn),
        );
  const lookups = buildFeedLookups(included, updates);

  return found({
    posts: pagePosts.map((update) => buildPost(update, lookups)),
    paging: {
      start: data.paging?.start ?? null,
      count: data.paging?.count ?? null,
      total: data.paging?.total ?? null,
    },
  });
}

/** Turns a single-post response into a {@link Post}. */
export function transformPostDetail(
  json: unknown,
  activityUrn: string,
): ScrapeResult<Post> {
  const parsed = RawPostDetailResponseSchema.safeParse(json);
  if (!parsed.success) return unexpectedResponse('post', parsed.error);
  const { included, data } = parsed.data;

  const primary = RawUpdateSchema.safeParse(data);
  const updates = [
    ...(primary.success ? [primary.data] : []),
    ...entitiesOfType(included, FEED_TYPES.update, RawUpdateSchema),
  ];
  const post =
    updates.find((update) => update.updateMetadata?.urn === activityUrn) ??
    updates.at(0);
  if (post == null) return notFound('LinkedIn post not found');

  return found(buildPost(post, buildFeedLookups(included, updates)));
}
