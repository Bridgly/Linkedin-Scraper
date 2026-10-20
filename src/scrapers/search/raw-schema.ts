import { z } from 'zod';
import { IncludedEntitySchema } from '../../linkedin/included';
import {
  ImageViewModelSchema,
  TextViewModelSchema,
} from '../../linkedin/raw-schema';

/**
 * Response of the search GraphQL query (`searchDashClustersByAll`). Every tab
 * except posts renders its results as the same generic card,
 * `EntityResultViewModel`; each scraper reads the slots its tab fills.
 */

export const ENTITY_RESULT_TYPE =
  'com.linkedin.voyager.dash.search.EntityResultViewModel';

/** A line of text under a card, with the companies it mentions. */
const InsightTextSchema = z.object({
  text: z.string().nullish(),
  attributesV2: z
    .array(
      z.object({
        detailData: z
          .object({ '*companyName': z.string().nullish() })
          .nullish(),
      }),
    )
    .nullish(),
});
export type InsightText = z.infer<typeof InsightTextSchema>;

const InsightSchema = z.object({
  // "1 mutual connection", "Top Features: …", "Used by Acme, Globex and 12 others"
  simpleInsight: z.object({ title: InsightTextSchema.nullish() }).nullish(),
  // The categories a service provider offers.
  labelsInsight: z
    .object({ entityLabels: z.array(z.string()).nullish() })
    .nullish(),
  // Job cards: points at the job posting card that holds the listing date.
  '*jobPostingFooterInsight': z.string().nullish(),
});

export const EntityResultSchema = z.object({
  // urn:li:fsd_entityResultViewModel:(urn:li:<type>:<id>,SEARCH_SRP,DEFAULT)
  entityUrn: z.string(),
  // urn:li:member:<id>, or urn:li:member:headless for a private member
  trackingUrn: z.string().nullish(),
  title: TextViewModelSchema.nullish(),
  primarySubtitle: TextViewModelSchema.nullish(),
  secondarySubtitle: TextViewModelSchema.nullish(),
  summary: TextViewModelSchema.nullish(),
  // "• 2nd", "• 3rd+"
  badgeText: TextViewModelSchema.nullish(),
  badgeIcon: ImageViewModelSchema.nullish(),
  navigationUrl: z.string().nullish(),
  entityCustomTrackingInfo: z
    .object({ memberDistance: z.string().nullish() })
    .nullish(),
  image: ImageViewModelSchema.nullish(),
  insightsResolutionResults: z.array(InsightSchema).nullish(),
});
export type EntityResult = z.infer<typeof EntityResultSchema>;

/** The company entity a card points at ("Used by" lines, job logos). */
export const ResolvedCompanySchema = z.object({
  entityUrn: z.string(),
  name: z.string().nullish(),
  url: z.string().nullish(),
});

/** The job posting card a job result points at; LISTED_DATE holds `timeAt`. */
export const JobPostingFooterSchema = z.object({
  footerItems: z
    .array(
      z.object({ type: z.string().nullish(), timeAt: z.number().nullish() }),
    )
    .nullish(),
});

/**
 * The results come in clusters; each item points at its card. The cards
 * themselves are in `included`, in no particular order.
 */
export const SearchResponseSchema = z.object({
  data: z.object({
    data: z.object({
      searchDashClustersByAll: z
        .object({
          metadata: z
            .object({ totalResultCount: z.number().nullish() })
            .nullish(),
          elements: z
            .array(
              z.object({
                items: z
                  .array(
                    z.object({
                      item: z
                        .object({
                          '*entityResult': z.string().nullish(),
                          // Posts tab only: points at a feed update.
                          searchFeedUpdate: z
                            .object({ '*update': z.string().nullish() })
                            .nullish(),
                        })
                        .nullish(),
                    }),
                  )
                  .nullish(),
              }),
            )
            .nullish(),
        })
        .nullish(),
    }),
  }),
  included: z.array(IncludedEntitySchema),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
