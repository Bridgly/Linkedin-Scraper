import { z } from 'zod';
import { IncludedEntitySchema } from '../../linkedin/included';
import { VectorImageSchema } from '../../linkedin/raw-schema';

/**
 * Entities in feed responses: GET /voyager/api/feed/updates (a company's or a
 * member's posts), /feed/updates/<activityUrn> (one post) and /feed/comments.
 */

export const FEED_TYPES = {
  update: 'com.linkedin.voyager.feed.render.UpdateV2',
  feedItem: 'com.linkedin.voyager.feed.Update',
  socialDetail: 'com.linkedin.voyager.feed.SocialDetail',
  socialCounts: 'com.linkedin.voyager.feed.shared.SocialActivityCounts',
  comment: 'com.linkedin.voyager.feed.Comment',
  miniProfile: 'com.linkedin.voyager.identity.shared.MiniProfile',
  miniCompany: 'com.linkedin.voyager.entities.shared.MiniCompany',
};

/** Content component types a post can carry. */
export const CONTENT_TYPES = {
  article: 'com.linkedin.voyager.feed.render.ArticleComponent',
  image: 'com.linkedin.voyager.feed.render.ImageComponent',
  event: 'com.linkedin.voyager.feed.render.EventComponent',
  entity: 'com.linkedin.voyager.feed.render.EntityComponent',
};

const NavigationSchema = z.object({ actionTarget: z.string().nullish() });

/** Points from a rendered name or avatar to the member or company behind it. */
const EntityPointerSchema = z.object({
  '*miniProfile': z.string().nullish(),
  '*miniCompany': z.string().nullish(),
});

const TextSchema = z.object({
  text: z.string().nullish(),
  accessibilityText: z.string().nullish(),
  attributes: z.array(EntityPointerSchema).nullish(),
});

const ImageAttributesSchema = z.object({
  attributes: z
    .array(z.object({ vectorImage: VectorImageSchema.nullish() }))
    .nullish(),
});

export const RawActorSchema = z.object({
  urn: z.string().nullish(),
  name: TextSchema.nullish(),
  description: TextSchema.nullish(),
  // Renders as "2d • Edited •"; `accessibilityText` reads "2 days ago".
  subDescription: TextSchema.nullish(),
  image: z
    .object({ attributes: z.array(EntityPointerSchema).nullish() })
    .nullish(),
  navigationContext: NavigationSchema.nullish(),
});
export type RawActor = z.infer<typeof RawActorSchema>;

/** A post's attachment; parsed further by the component schemas below. */
const ContentSchema = z.looseObject({ $type: z.string() });
export type RawContent = z.infer<typeof ContentSchema>;

const UpdateMetadataSchema = z.object({
  urn: z.string().nullish(),
  shareUrn: z.string().nullish(),
  shareAudience: z.string().nullish(),
});

const UpdateBodySchema = z.object({
  actor: RawActorSchema.nullish(),
  commentary: z.object({ text: TextSchema.nullish() }).nullish(),
  content: ContentSchema.nullish(),
  updateMetadata: UpdateMetadataSchema.nullish(),
});

/** One post. A repost carries the original either inline or by reference. */
export const RawUpdateSchema = UpdateBodySchema.extend({
  entityUrn: z.string().nullish(),
  '*socialDetail': z.string().nullish(),
  '*resharedUpdate': z.string().nullish(),
  resharedUpdate: UpdateBodySchema.nullish(),
});
export type RawUpdate = z.infer<typeof RawUpdateSchema>;
export type RawUpdateBody = z.infer<typeof UpdateBodySchema>;

export const ArticleComponentSchema = z.object({
  $type: z.literal(CONTENT_TYPES.article),
  title: TextSchema.nullish(),
  subtitle: TextSchema.nullish(),
  navigationContext: NavigationSchema.nullish(),
  largeImage: ImageAttributesSchema.nullish(),
});

export const ImageComponentSchema = z.object({
  $type: z.literal(CONTENT_TYPES.image),
  images: z.array(ImageAttributesSchema).nullish(),
});

export const EventComponentSchema = z.object({
  $type: z.literal(CONTENT_TYPES.event),
  title: TextSchema.nullish(),
  titleContext: TextSchema.nullish(),
  description: TextSchema.nullish(),
  navigationContext: NavigationSchema.nullish(),
});

/** Job postings shared in a post render as an entity card. */
export const EntityComponentSchema = z.object({
  $type: z.literal(CONTENT_TYPES.entity),
  title: TextSchema.nullish(),
  subtitle: TextSchema.nullish(),
  description: TextSchema.nullish(),
  navigationContext: NavigationSchema.nullish(),
});

/** Bridges a post or comment to its counts via `*totalSocialActivityCounts`. */
export const RawSocialDetailSchema = z.object({
  entityUrn: z.string().nullish(),
  '*totalSocialActivityCounts': z.string().nullish(),
  likes: z
    .object({ paging: z.object({ total: z.number().nullish() }).nullish() })
    .nullish(),
  comments: z
    .object({ paging: z.object({ total: z.number().nullish() }).nullish() })
    .nullish(),
});
export type RawSocialDetail = z.infer<typeof RawSocialDetailSchema>;

export const RawSocialCountsSchema = z.object({
  entityUrn: z.string().nullish(),
  numLikes: z.number().nullish(),
  numComments: z.number().nullish(),
  numShares: z.number().nullish(),
  reactionTypeCounts: z
    .array(
      z.object({
        reactionType: z.string().nullish(),
        count: z.number().nullish(),
      }),
    )
    .nullish(),
});
export type RawSocialCounts = z.infer<typeof RawSocialCountsSchema>;

/** Which posts belong to the requested feed page (`*value` -> an update URN). */
export const RawFeedItemSchema = z.object({
  '*value': z.string().nullish(),
});

export const RawMiniProfileSchema = z.object({
  entityUrn: z.string().nullish(),
  publicIdentifier: z.string().nullish(),
  occupation: z.string().nullish(),
});
export type RawMiniProfile = z.infer<typeof RawMiniProfileSchema>;

export const RawMiniCompanySchema = z.object({
  entityUrn: z.string().nullish(),
  universalName: z.string().nullish(),
});
export type RawMiniCompany = z.infer<typeof RawMiniCompanySchema>;

export const RawCommentSchema = z.object({
  // urn:li:comment:(activity:<activityId>,<commentId>)
  urn: z.string().nullish(),
  threadId: z.string().nullish(),
  parentCommentUrn: z.string().nullish(),
  createdTime: z.number().nullish(),
  commentV2: z.object({ text: z.string().nullish() }).nullish(),
  commenterForDashConversion: z
    .object({
      title: z.object({ text: z.string().nullish() }).nullish(),
      urn: z.string().nullish(),
    })
    .nullish(),
  '*socialDetail': z.string().nullish(),
});
export type RawComment = z.infer<typeof RawCommentSchema>;

/** A page of a feed, with LinkedIn's paging block. */
export const RawFeedResponseSchema = z.object({
  data: z.object({
    paging: z
      .object({
        start: z.number().nullish(),
        count: z.number().nullish(),
        total: z.number().nullish(),
      })
      .nullish(),
  }),
  included: z.array(IncludedEntitySchema),
});

/** A single post. The post itself may arrive as `data` or inside `included`. */
export const RawPostDetailResponseSchema = z.object({
  data: z.unknown(),
  included: z.array(IncludedEntitySchema),
});
