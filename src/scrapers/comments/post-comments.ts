import { fetchVoyager } from '../../linkedin/client';
import { VOYAGER_API_URL } from '../../linkedin/endpoints';
import {
  entitiesOfType,
  indexByUrn,
  NormalizedResponseSchema,
} from '../../linkedin/included';
import {
  found,
  unexpectedResponse,
  type ScrapeResult,
} from '../../linkedin/result';
import { compact } from '../../util/array';
import {
  FEED_TYPES,
  RawCommentSchema,
  RawSocialCountsSchema,
  RawSocialDetailSchema,
  type RawComment,
  type RawSocialCounts,
  type RawSocialDetail,
} from '../posts/raw-schema';
import type { PostComment } from './schema';

/** Reads `(activityId, commentId)` from `urn:li:comment:(activity:<a>,<c>)`. */
function parseCommentUrn(
  urn: string | null | undefined,
): { activityId: string; commentId: string } | null {
  const match = urn?.match(/\(activity:(\d+),(\d+)\)/);
  const activityId = match?.at(1);
  const commentId = match?.at(2);
  if (activityId == null || commentId == null) return null;
  return { activityId, commentId };
}

/** Maps one comment, following `*socialDetail` to its like and reply counts. */
function buildComment(
  comment: RawComment,
  socialDetails: Map<string, RawSocialDetail>,
  socialCounts: Map<string, RawSocialCounts>,
): PostComment | null {
  const ids = parseCommentUrn(comment.urn);
  if (ids == null || comment.urn == null) return null;

  const detailUrn = comment['*socialDetail'];
  const detail = detailUrn == null ? undefined : socialDetails.get(detailUrn);
  const countsUrn = detail?.['*totalSocialActivityCounts'];
  const counts = countsUrn == null ? undefined : socialCounts.get(countsUrn);

  return {
    urn: comment.urn,
    ...ids,
    parentCommentId:
      parseCommentUrn(comment.parentCommentUrn)?.commentId ?? null,
    text: comment.commentV2?.text ?? null,
    authorName: comment.commenterForDashConversion?.title?.text ?? null,
    createdTime: comment.createdTime ?? null,
    numLikes: counts?.numLikes ?? detail?.likes?.paging?.total ?? null,
    numComments: counts?.numComments ?? detail?.comments?.paging?.total ?? null,
  };
}

/** Turns a /feed/comments response into a flat list of comments and replies. */
function transformPostComments(json: unknown): ScrapeResult<PostComment[]> {
  const parsed = NormalizedResponseSchema.safeParse(json);
  if (!parsed.success) return unexpectedResponse('comments', parsed.error);
  const { included } = parsed.data;

  const socialDetails = indexByUrn(
    entitiesOfType(included, FEED_TYPES.socialDetail, RawSocialDetailSchema),
  );
  const socialCounts = indexByUrn(
    entitiesOfType(included, FEED_TYPES.socialCounts, RawSocialCountsSchema),
  );
  const comments = entitiesOfType(
    included,
    FEED_TYPES.comment,
    RawCommentSchema,
  );
  return found(
    compact(
      comments.map((comment) =>
        buildComment(comment, socialDetails, socialCounts),
      ),
    ),
  );
}

/**
 * Scrapes the comments on a post, most relevant first. Replies come back in
 * the same list.
 */
export async function scrapePostComments(
  activityUrn: string,
  count: number,
): Promise<ScrapeResult<PostComment[]>> {
  return fetchVoyager({
    url: `${VOYAGER_API_URL}/feed/comments?count=${count}&start=0&q=comments&sortOrder=RELEVANCE&updateId=${encodeURIComponent(activityUrn)}`,
    on404: 'entityMissing',
    transform: transformPostComments,
  });
}
