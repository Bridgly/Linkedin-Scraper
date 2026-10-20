import { fetchVoyager } from '../../linkedin/client';
import {
  LINKEDIN_URL,
  QUERY_IDS,
  VOYAGER_API_URL,
} from '../../linkedin/endpoints';
import { imageViewModelUrl } from '../../linkedin/images';
import { entitiesOfType, indexByUrn } from '../../linkedin/included';
import {
  found,
  unexpectedResponse,
  type ScrapeResult,
} from '../../linkedin/result';
import { compact } from '../../util/array';
import { extractPathSegment } from '../../util/url';
import { extractTrailingId } from '../../util/urn';
import { resolveProfileUrn } from '../profile/scraper';
import {
  DASH_TYPES,
  RawDashSocialCountsSchema,
  RawDashSocialDetailSchema,
  RawDashUpdateSchema,
  RawProfileReactionsResponseSchema,
  type RawDashActor,
} from './raw-schema';
import type { ProfileReaction, ReactionAuthor } from './schema';

/**
 * Resolves the author of a reacted-to post. Whether it is a member or a
 * company is read from the pointer on the name; the slug from the page link.
 */
function buildAuthor(actor: RawDashActor | null | undefined): ReactionAuthor {
  const detail = actor?.name?.attributesV2?.at(0)?.detailData;
  const memberUrn = detail?.['*profileFullName'] ?? null;
  const companyUrn = detail?.['*companyName'] ?? null;
  const authorType =
    memberUrn != null ? 'member' : companyUrn != null ? 'company' : null;

  const pageUrl =
    actor?.navigationContext?.actionTarget?.split('?').at(0) ?? null;
  const publicId =
    extractPathSegment(pageUrl, 'in') ?? extractPathSegment(pageUrl, 'company');
  const section = authorType === 'company' ? 'company' : 'in';

  return {
    authorName: actor?.name?.text ?? null,
    authorType,
    authorUrn: actor?.backendUrn ?? null,
    authorProfileUrn: memberUrn ?? companyUrn,
    authorPublicId: publicId,
    authorUrl:
      publicId == null ? pageUrl : `${LINKEDIN_URL}/${section}/${publicId}`,
    authorHeadline: actor?.description?.text ?? null,
    authorImage: imageViewModelUrl(actor?.image),
  };
}

/**
 * Turns the activity response into the posts the member reacted to, in the
 * order LinkedIn shows them, with each post's like / comment / share totals.
 */
function transformProfileReactions(
  json: unknown,
): ScrapeResult<ProfileReaction[]> {
  const parsed = RawProfileReactionsResponseSchema.safeParse(json);
  if (!parsed.success) {
    return unexpectedResponse('profile reactions', parsed.error);
  }
  const { included } = parsed.data;

  const updates = indexByUrn(
    entitiesOfType(included, DASH_TYPES.update, RawDashUpdateSchema),
  );
  const socialDetails = indexByUrn(
    entitiesOfType(
      included,
      DASH_TYPES.socialDetail,
      RawDashSocialDetailSchema,
    ),
  );
  const socialCounts = indexByUrn(
    entitiesOfType(
      included,
      DASH_TYPES.socialCounts,
      RawDashSocialCountsSchema,
    ),
  );
  const order =
    parsed.data.data.data.feedDashProfileUpdatesByMemberReactions?.[
      '*elements'
    ] ?? [];

  return found(
    compact(order.map((urn) => updates.get(urn))).map((update) => {
      const detailUrn = update['*socialDetail'];
      const countsUrn =
        detailUrn == null
          ? undefined
          : socialDetails.get(detailUrn)?.['*totalSocialActivityCounts'];
      const counts =
        countsUrn == null ? undefined : socialCounts.get(countsUrn);
      const activityUrn = update.metadata?.backendUrn ?? null;
      return {
        urn: update.entityUrn ?? null,
        text: update.commentary ?? null,
        permalink: update.socialContent?.shareUrl ?? null,
        rootActivityUrn: activityUrn,
        activityId: extractTrailingId(activityUrn),
        shareUrn: update.metadata?.shareUrn ?? null,
        numLikes: counts?.numLikes ?? null,
        numComments: counts?.numComments ?? null,
        numShares: counts?.numShares ?? null,
        ...buildAuthor(update.actor),
      };
    }),
  );
}

/**
 * Scrapes the posts a member reacted to (their profile's Reactions tab). The
 * GraphQL query is keyed by profile URN, so the slug is resolved first.
 */
export async function scrapeProfileReactions(
  publicId: string,
  { start, count }: { start: number; count: number },
): Promise<ScrapeResult<ProfileReaction[]>> {
  const urn = await resolveProfileUrn(publicId);
  if (urn.type !== 'found') return urn;

  const variables = `(count:${count},start:${start},profileUrn:${encodeURIComponent(urn.data)})`;
  return fetchVoyager({
    url: `${VOYAGER_API_URL}/graphql?includeWebMetadata=true&variables=${variables}&queryId=${QUERY_IDS.profileReactions}`,
    on404: 'endpointGone',
    transform: transformProfileReactions,
  });
}
