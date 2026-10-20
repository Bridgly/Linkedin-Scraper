import { z } from 'zod';
import {
  ImageViewModelSchema,
  NavigationContextSchema,
  TextViewModelSchema,
} from '../../../linkedin/raw-schema';

/**
 * The posts tab of the search GraphQL query returns feed updates instead of
 * result cards. Each update reaches its counts through its social detail.
 */

export const POST_SEARCH_TYPES = {
  update: 'com.linkedin.voyager.dash.feed.Update',
  socialDetail: 'com.linkedin.voyager.dash.social.SocialDetail',
  socialCounts: 'com.linkedin.voyager.dash.feed.SocialActivityCounts',
};

export const SearchActorSchema = z.object({
  name: z
    .object({
      text: z.string().nullish(),
      attributesV2: z
        .array(
          z.object({
            detailData: z
              .object({ '*profileFullName': z.string().nullish() })
              .nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
  description: TextViewModelSchema.nullish(),
  // "5h •", "4h • Edited •"
  subDescription: TextViewModelSchema.nullish(),
  navigationContext: NavigationContextSchema.nullish(),
  image: ImageViewModelSchema.nullish(),
  // urn:li:member:<id>
  backendUrn: z.string().nullish(),
});
export type SearchActor = z.infer<typeof SearchActorSchema>;

const CardSchema = z.object({
  title: TextViewModelSchema.nullish(),
  subtitle: TextViewModelSchema.nullish(),
  navigationContext: NavigationContextSchema.nullish(),
});

export const SearchUpdateSchema = z.object({
  entityUrn: z.string(),
  metadata: z
    .object({
      // urn:li:activity:<id>
      backendUrn: z.string().nullish(),
      shareUrn: z.string().nullish(),
    })
    .nullish(),
  '*socialDetail': z.string().nullish(),
  socialContent: z.object({ shareUrl: z.string().nullish() }).nullish(),
  commentary: z.object({ text: TextViewModelSchema.nullish() }).nullish(),
  actor: SearchActorSchema.nullish(),
  content: z
    .object({
      articleComponent: CardSchema.extend({
        largeImage: ImageViewModelSchema.nullish(),
      }).nullish(),
      entityComponent: CardSchema.extend({
        description: TextViewModelSchema.nullish(),
        image: ImageViewModelSchema.nullish(),
      }).nullish(),
      imageComponent: z
        .object({ images: z.array(ImageViewModelSchema).nullish() })
        .nullish(),
    })
    .nullish(),
});
export type SearchUpdate = z.infer<typeof SearchUpdateSchema>;

export const SearchSocialDetailSchema = z.object({
  entityUrn: z.string(),
  '*totalSocialActivityCounts': z.string().nullish(),
});

export const SearchSocialCountsSchema = z.object({
  entityUrn: z.string(),
  numLikes: z.number().nullish(),
  numComments: z.number().nullish(),
  numShares: z.number().nullish(),
  reactionTypeCounts: z
    .array(z.object({ reactionType: z.string(), count: z.number() }))
    .nullish(),
});
export type SearchSocialCounts = z.infer<typeof SearchSocialCountsSchema>;
