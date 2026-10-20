import { fetchVoyager } from '../../linkedin/client';
import { LINKEDIN_URL, VOYAGER_API_URL } from '../../linkedin/endpoints';
import { buildImageUrl } from '../../linkedin/images';
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
import { extractPathSegment } from '../../util/url';
import { extractTrailingId } from '../../util/urn';
import { scrapePostDetail } from '../posts/scraper';
import {
  MINI_PROFILE_TYPE,
  RawReactionSchema,
  RawReactorSchema,
  REACTION_TYPE,
  type RawReaction,
  type RawReactor,
} from './raw-schema';
import type { PostReaction } from './schema';

/**
 * Maps one reaction. The reactor's details come from their MiniProfile, with
 * the copy embedded in the reaction itself as a fallback.
 */
function buildReaction(
  reaction: RawReaction,
  reactors: Map<string, RawReactor>,
): PostReaction {
  const reactorUrn = reaction['*actor'] ?? reaction.actorUrn;
  const reactor = reactorUrn == null ? undefined : reactors.get(reactorUrn);
  const publicId =
    reactor?.publicIdentifier ??
    extractPathSegment(reaction.navigationContext?.actionTarget, 'in');
  const fullName = compact([reactor?.firstName, reactor?.lastName]).join(' ');

  return {
    reactionType: reaction.reactionType ?? null,
    reactorName: fullName || (reaction.name?.text ?? null),
    reactorHeadline: reactor?.occupation ?? reaction.description?.text ?? null,
    reactorProfileUrn:
      reactor?.dashEntityUrn ?? reaction.profileUrnForDashConversion ?? null,
    reactorMemberId:
      extractTrailingId(reactor?.objectUrn) ??
      reaction.dashEntityUrn?.match(/urn:li:member:(\d+)/)?.at(1) ??
      null,
    reactorPublicId: publicId,
    reactorProfileUrl:
      publicId == null ? null : `${LINKEDIN_URL}/in/${publicId}`,
    reactorProfileImage: buildImageUrl(reactor?.picture),
  };
}

/** Turns a /feed/reactions response into the list of reactors. */
function transformPostReactions(json: unknown): ScrapeResult<PostReaction[]> {
  const parsed = NormalizedResponseSchema.safeParse(json);
  if (!parsed.success) return unexpectedResponse('reactions', parsed.error);
  const { included } = parsed.data;

  const reactors = indexByUrn(
    entitiesOfType(included, MINI_PROFILE_TYPE, RawReactorSchema),
  );
  return found(
    entitiesOfType(included, REACTION_TYPE, RawReactionSchema).map((reaction) =>
      buildReaction(reaction, reactors),
    ),
  );
}

/**
 * Scrapes who reacted to a post. Reactions are threaded on the post's share
 * URN (urn:li:ugcPost:… / urn:li:share:…), not its activity URN, so the post
 * is fetched first to read it.
 */
export async function scrapePostReactions(
  activityUrn: string,
  { start, count }: { start: number; count: number },
): Promise<ScrapeResult<PostReaction[]>> {
  const post = await scrapePostDetail(activityUrn);
  if (post.type !== 'found') return post;

  const threadUrn = post.data.shareUrn ?? activityUrn;
  return fetchVoyager({
    url: `${VOYAGER_API_URL}/feed/reactions?count=${count}&start=${start}&q=reactionType&threadUrn=${encodeURIComponent(threadUrn)}`,
    on404: 'entityMissing',
    transform: transformPostReactions,
  });
}
