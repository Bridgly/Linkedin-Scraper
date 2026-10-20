import { z } from 'zod';
import { IncludedEntitySchema } from '../../linkedin/included';
import {
  ImageViewModelSchema,
  NavigationContextSchema,
  TextViewModelSchema,
  VectorImageSchema,
} from '../../linkedin/raw-schema';
import { AttributedTextSchema } from '../comments/raw-schema';

/** Entities in GET /voyager/api/feed/reactions (who reacted to a post). */

export const REACTION_TYPE = 'com.linkedin.voyager.feed.social.Reaction';
export const MINI_PROFILE_TYPE =
  'com.linkedin.voyager.identity.shared.MiniProfile';

export const RawReactionSchema = z.object({
  // LIKE, PRAISE, EMPATHY, INTEREST, APPRECIATION, ENTERTAINMENT
  reactionType: z.string().nullish(),
  // Points at the reactor's MiniProfile in `included`.
  '*actor': z.string().nullish(),
  actorUrn: z.string().nullish(),
  // urn:li:fsd_reaction:(urn:li:member:<memberId>,urn:li:ugcPost:<id>,0)
  dashEntityUrn: z.string().nullish(),
  // urn:li:fsd_profile:<token>
  profileUrnForDashConversion: z.string().nullish(),
  name: TextViewModelSchema.nullish(),
  description: TextViewModelSchema.nullish(),
  navigationContext: NavigationContextSchema.nullish(),
});
export type RawReaction = z.infer<typeof RawReactionSchema>;

export const RawReactorSchema = z.object({
  entityUrn: z.string().nullish(),
  // urn:li:fsd_profile:<token>
  dashEntityUrn: z.string().nullish(),
  // urn:li:member:<memberId>
  objectUrn: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  occupation: z.string().nullish(),
  publicIdentifier: z.string().nullish(),
  picture: VectorImageSchema.nullish(),
});
export type RawReactor = z.infer<typeof RawReactorSchema>;

/**
 * Entities in the profile "Reactions" activity tab, the response of the
 * `voyagerFeedDashProfileUpdates` GraphQL query. Each item is a post the
 * member reacted to; LinkedIn doesn't say which reaction they left.
 */

export const DASH_TYPES = {
  update: 'com.linkedin.voyager.dash.feed.Update',
  socialDetail: 'com.linkedin.voyager.dash.social.SocialDetail',
  socialCounts: 'com.linkedin.voyager.dash.feed.SocialActivityCounts',
};

/**
 * The author of a reacted-to post. The name's `detailData` points at a
 * `*profileFullName` (urn:li:fsd_profile:…) for a member or a `*companyName`
 * (urn:li:fsd_company:…) for a company.
 */
export const RawDashActorSchema = z.object({
  name: z
    .object({
      text: z.string().nullish(),
      attributesV2: z
        .array(
          z.object({
            detailData: z
              .object({
                '*profileFullName': z.string().nullish(),
                '*companyName': z.string().nullish(),
              })
              .nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
  description: TextViewModelSchema.nullish(),
  // urn:li:member:<id> or urn:li:company:<id>
  backendUrn: z.string().nullish(),
  navigationContext: NavigationContextSchema.nullish(),
  image: ImageViewModelSchema.nullish(),
});
export type RawDashActor = z.infer<typeof RawDashActorSchema>;

export const RawDashUpdateSchema = z.object({
  entityUrn: z.string().nullish(),
  '*socialDetail': z.string().nullish(),
  commentary: AttributedTextSchema.nullish(),
  actor: RawDashActorSchema.nullish(),
  socialContent: z.object({ shareUrl: z.string().nullish() }).nullish(),
  metadata: z
    .object({
      // urn:li:activity:<id>
      backendUrn: z.string().nullish(),
      shareUrn: z.string().nullish(),
    })
    .nullish(),
});
export type RawDashUpdate = z.infer<typeof RawDashUpdateSchema>;

export const RawDashSocialDetailSchema = z.object({
  entityUrn: z.string().nullish(),
  '*totalSocialActivityCounts': z.string().nullish(),
});

export const RawDashSocialCountsSchema = z.object({
  entityUrn: z.string().nullish(),
  numLikes: z.number().nullish(),
  numComments: z.number().nullish(),
  numShares: z.number().nullish(),
});

/** `*elements` lists the reacted-to posts in display order. */
export const RawProfileReactionsResponseSchema = z.object({
  data: z.object({
    data: z.object({
      feedDashProfileUpdatesByMemberReactions: z
        .object({ '*elements': z.array(z.string()).nullish() })
        .nullish(),
    }),
  }),
  included: z.array(IncludedEntitySchema),
});
