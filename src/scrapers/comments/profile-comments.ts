import { fetchVoyager } from '../../linkedin/client';
import { QUERY_IDS, VOYAGER_API_URL } from '../../linkedin/endpoints';
import {
  entitiesOfType,
  NormalizedResponseSchema,
} from '../../linkedin/included';
import {
  found,
  unexpectedResponse,
  type ScrapeResult,
} from '../../linkedin/result';
import { resolveProfileUrn } from '../profile/scraper';
import {
  DASH_COMMENT_TYPE,
  RawDashCommentSchema,
  type RawDashComment,
} from './raw-schema';
import type { ProfileComment } from './schema';

/**
 * The post a comment was left on. Newer responses drop `rootUrn` but keep the
 * activity id inside the comment URN: `urn:li:comment:(activity:<id>,<cid>)`.
 */
function resolveRootActivityUrn(comment: RawDashComment): string | null {
  const activityId = (comment.urn ?? comment.entityUrn)
    ?.match(/activity:(\d+)/)
    ?.at(1);
  return (
    comment.rootUrn ??
    comment.threadUrn ??
    (activityId == null ? null : `urn:li:activity:${activityId}`)
  );
}

/**
 * Turns the activity response into the member's comments. The response also
 * carries other people's replies around them, so only comments whose author
 * is the member are kept.
 */
function transformProfileComments(
  json: unknown,
  profileUrn: string,
): ScrapeResult<ProfileComment[]> {
  const parsed = NormalizedResponseSchema.safeParse(json);
  if (!parsed.success)
    return unexpectedResponse('profile comments', parsed.error);

  const memberId = profileUrn.split(':').at(-1);
  return found(
    entitiesOfType(
      parsed.data.included,
      DASH_COMMENT_TYPE,
      RawDashCommentSchema,
    )
      .filter((comment) => comment.commenter?.commenterProfileId === memberId)
      .map((comment) => ({
        urn: comment.urn ?? comment.entityUrn ?? null,
        text: comment.commentary ?? null,
        authorName: comment.commenter?.title ?? null,
        createdTime: comment.createdAt ?? null,
        permalink: comment.permalink ?? null,
        rootActivityUrn: resolveRootActivityUrn(comment),
        parentCommentUrn: comment.parentCommentUrn ?? null,
      })),
  );
}

/**
 * Scrapes the comments a member wrote (their profile's Comments tab). The
 * GraphQL query is keyed by profile URN, so the slug is resolved first.
 */
export async function scrapeProfileComments(
  publicId: string,
  { start, count }: { start: number; count: number },
): Promise<ScrapeResult<ProfileComment[]>> {
  const urn = await resolveProfileUrn(publicId);
  if (urn.type !== 'found') return urn;

  const profileUrn = urn.data;
  const variables = `(count:${count},start:${start},profileUrn:${encodeURIComponent(profileUrn)})`;
  return fetchVoyager({
    url: `${VOYAGER_API_URL}/graphql?includeWebMetadata=true&variables=${variables}&queryId=${QUERY_IDS.profileComments}`,
    on404: 'endpointGone',
    transform: (json) => transformProfileComments(json, profileUrn),
  });
}
