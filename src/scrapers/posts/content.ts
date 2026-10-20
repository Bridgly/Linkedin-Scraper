import { LINKEDIN_URL } from '../../linkedin/endpoints';
import { buildImageUrl } from '../../linkedin/images';
import { compact } from '../../util/array';
import { extractPathSegment } from '../../util/url';
import {
  ArticleComponentSchema,
  EntityComponentSchema,
  EventComponentSchema,
  ImageComponentSchema,
  type RawActor,
  type RawContent,
  type RawMiniCompany,
  type RawMiniProfile,
  type RawSocialCounts,
  type RawSocialDetail,
} from './raw-schema';
import type {
  PostArticle,
  PostEvent,
  PostJob,
  PostSocialCounts,
} from './schema';

/** The public permalink of a post. */
export function buildPostUrl(
  activityUrn: string | null | undefined,
): string | null {
  return activityUrn == null
    ? null
    : `${LINKEDIN_URL}/feed/update/${activityUrn}`;
}

/**
 * Decodes the creation time from a post id. LinkedIn ids are snowflakes: the
 * first 41 bits are the epoch milliseconds.
 */
export function extractTimestampFromUrn(
  urn: string | null | undefined,
): number | null {
  const id = urn?.match(/(\d+)/)?.at(1);
  return id == null ? null : Number(BigInt(id) >> 22n);
}

/** The MiniProfile / MiniCompany an actor's name or avatar points at. */
function actorPointer(
  actor: RawActor,
  key: '*miniProfile' | '*miniCompany',
): string | null {
  const attributes = [
    ...(actor.name?.attributes ?? []),
    ...(actor.image?.attributes ?? []),
  ];
  return compact(attributes.map((attribute) => attribute[key])).at(0) ?? null;
}

/** The author's slug, page URL and headline. */
export type ActorLinks = {
  publicIdentifier: string | null;
  url: string | null;
  headline: string | null;
};

/**
 * Resolves a post's author to their profile or company slug by following the
 * actor's pointer to the side-loaded MiniProfile / MiniCompany. Falls back to
 * the slug in the rendered link when the entity isn't in the response.
 */
export function resolveActorLinks({
  actor,
  miniProfiles,
  miniCompanies,
}: {
  actor: RawActor | null | undefined;
  miniProfiles: Map<string, RawMiniProfile>;
  miniCompanies: Map<string, RawMiniCompany>;
}): ActorLinks {
  if (actor == null)
    return { publicIdentifier: null, url: null, headline: null };

  const profileUrn = actorPointer(actor, '*miniProfile');
  const companyUrn = actorPointer(actor, '*miniCompany');
  const profile = profileUrn == null ? undefined : miniProfiles.get(profileUrn);
  const company =
    companyUrn == null ? undefined : miniCompanies.get(companyUrn);
  const headline = actor.description?.text ?? profile?.occupation ?? null;

  if (profile?.publicIdentifier != null) {
    const slug = profile.publicIdentifier;
    return {
      publicIdentifier: slug,
      url: `${LINKEDIN_URL}/in/${slug}`,
      headline,
    };
  }
  if (company?.universalName != null) {
    const slug = company.universalName;
    return {
      publicIdentifier: slug,
      url: `${LINKEDIN_URL}/company/${slug}`,
      headline,
    };
  }

  const url = actor.navigationContext?.actionTarget?.split('?').at(0) ?? null;
  return {
    publicIdentifier:
      extractPathSegment(url, 'in') ?? extractPathSegment(url, 'company'),
    url,
    headline,
  };
}

/** The image URLs of an image post. */
export function extractImages(
  content: RawContent | null | undefined,
): { url: string }[] {
  const parsed = ImageComponentSchema.safeParse(content);
  if (!parsed.success) return [];
  const urls = (parsed.data.images ?? []).flatMap((image) =>
    (image.attributes ?? []).map((attribute) =>
      buildImageUrl(attribute.vectorImage),
    ),
  );
  return compact(urls).map((url) => ({ url }));
}

/** The shared link of an article post. */
export function extractArticle(
  content: RawContent | null | undefined,
): PostArticle | null {
  const parsed = ArticleComponentSchema.safeParse(content);
  if (!parsed.success) return null;
  const article = parsed.data;
  return {
    title: article.title?.text ?? null,
    subtitle: article.subtitle?.text ?? null,
    url: article.navigationContext?.actionTarget ?? null,
    imageUrl: buildImageUrl(article.largeImage?.attributes?.at(0)?.vectorImage),
  };
}

/** The event of an event post. */
export function extractEvent(
  content: RawContent | null | undefined,
): PostEvent | null {
  const parsed = EventComponentSchema.safeParse(content);
  if (!parsed.success) return null;
  const event = parsed.data;
  return {
    title: event.title?.text ?? null,
    url: event.navigationContext?.actionTarget ?? null,
    date: event.titleContext?.text ?? null,
    location: event.description?.text?.trim() ?? null,
  };
}

/** The job of a "we're hiring" post. The company line reads "Job by <company>". */
export function extractJob(
  content: RawContent | null | undefined,
): PostJob | null {
  const parsed = EntityComponentSchema.safeParse(content);
  if (!parsed.success) return null;
  const card = parsed.data;
  return {
    title: card.title?.text ?? null,
    company: card.subtitle?.text?.replace(/^Job by /i, '') ?? null,
    location: card.description?.text ?? null,
    url: card.navigationContext?.actionTarget ?? null,
  };
}

/**
 * A post's likes, comments, shares and per-reaction counts, found by following
 * `*socialDetail` -> SocialDetail -> `*totalSocialActivityCounts`.
 */
export function resolveSocialCounts({
  socialDetailUrn,
  socialDetails,
  socialCounts,
}: {
  socialDetailUrn: string | null | undefined;
  socialDetails: Map<string, RawSocialDetail>;
  socialCounts: Map<string, RawSocialCounts>;
}): PostSocialCounts | null {
  const detail =
    socialDetailUrn == null ? undefined : socialDetails.get(socialDetailUrn);
  if (detail == null) return null;

  const countsUrn = detail['*totalSocialActivityCounts'];
  const counts = countsUrn == null ? undefined : socialCounts.get(countsUrn);
  if (counts == null) {
    return {
      numLikes: detail.likes?.paging?.total ?? null,
      numComments: detail.comments?.paging?.total ?? null,
      numShares: null,
      reactionTypeCounts: [],
    };
  }
  return {
    numLikes: counts.numLikes ?? null,
    numComments: counts.numComments ?? null,
    numShares: counts.numShares ?? null,
    reactionTypeCounts: (counts.reactionTypeCounts ?? []).flatMap(
      ({ reactionType, count }) =>
        reactionType == null || count == null ? [] : [{ reactionType, count }],
    ),
  };
}
