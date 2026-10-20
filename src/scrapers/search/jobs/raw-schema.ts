import { z } from 'zod';
import { IncludedEntitySchema } from '../../../linkedin/included';
import {
  TextViewModelSchema,
  VectorImageSchema,
} from '../../../linkedin/raw-schema';

/**
 * Response of GET /voyager/api/voyagerJobsDashJobCards?q=jobSearch. Job search
 * has its own REST endpoint instead of the search GraphQL query. `data.elements`
 * lists the cards in order; the cards, companies, postings and verification
 * badges they point at are in `included`.
 */

export const JobPostingCardSchema = z.object({
  jobPostingUrn: z.string().nullish(),
  title: TextViewModelSchema.nullish(),
  // Company name.
  primaryDescription: TextViewModelSchema.nullish(),
  // Location.
  secondaryDescription: TextViewModelSchema.nullish(),
  // Either a salary ("$68K/yr - $75K/yr") or benefits ("401(k), +1 benefit").
  tertiaryDescription: TextViewModelSchema.nullish(),
  footerItems: z
    .array(
      z.object({ type: z.string().nullish(), timeAt: z.number().nullish() }),
    )
    .nullish(),
  '*jobPosting': z.string().nullish(),
  '*jobPostingVerification': z.string().nullish(),
  logo: z
    .object({
      // The company page, e.g. https://www.linkedin.com/company/openai/life
      actionTarget: z.string().nullish(),
      attributes: z
        .array(
          z.object({
            detailData: z
              .object({ '*companyLogo': z.string().nullish() })
              .nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
});
export type JobPostingCard = z.infer<typeof JobPostingCardSchema>;

export const JobCompanySchema = z.object({
  logo: z.object({ vectorImage: VectorImageSchema.nullish() }).nullish(),
});

export const JobPostingSchema = z.object({
  repostedJob: z.boolean().nullish(),
});

export const JobVerificationSchema = z.object({
  badge: z
    .object({
      attributes: z
        .array(
          z.object({
            detailDataUnion: z
              .object({ systemImage: z.string().nullish() })
              .nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
});
export type JobVerification = z.infer<typeof JobVerificationSchema>;

export const JobCardsResponseSchema = z.object({
  data: z.object({
    elements: z
      .array(
        z.object({
          jobCardUnion: z
            .object({ '*jobPostingCard': z.string().nullish() })
            .nullish(),
        }),
      )
      .nullish(),
    paging: z.object({ total: z.number().nullish() }).nullish(),
  }),
  included: z.array(IncludedEntitySchema),
});
