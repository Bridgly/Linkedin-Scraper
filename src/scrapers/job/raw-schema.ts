import { z } from 'zod';
import { IncludedEntitySchema } from '../../linkedin/included';
import { VectorImageSchema } from '../../linkedin/raw-schema';

/**
 * Response of GET /voyager/api/jobs/jobPostings/<jobId>?decorationId=…WebFullJobPosting-65
 * The posting is the top-level `data`; the hiring company, standardized title
 * and employment status it points at arrive in `included`.
 */

export const JOB_COMPANY_TYPE = 'com.linkedin.voyager.organization.Company';

export const RawJobPostingSchema = z.object({
  entityUrn: z.string(),
  dashEntityUrn: z.string().nullish(),
  title: z.string().nullish(),
  description: z.object({ text: z.string().nullish() }).nullish(),
  companyDescription: z.object({ text: z.string().nullish() }).nullish(),
  formattedLocation: z.string().nullish(),
  locationUrn: z.string().nullish(),
  country: z.string().nullish(),
  workRemoteAllowed: z.boolean().nullish(),
  formattedExperienceLevel: z.string().nullish(),
  jobState: z.string().nullish(),
  sourceDomain: z.string().nullish(),
  listedAt: z.number().nullish(),
  originalListedAt: z.number().nullish(),
  expireAt: z.number().nullish(),
  closedAt: z.number().nullish(),
  applies: z.number().nullish(),
  views: z.number().nullish(),
  '*standardizedTitleResolutionResult': z.string().nullish(),
  '*employmentStatusResolutionResult': z.string().nullish(),
  // Two pairs of parallel arrays: ids with their display names.
  industries: z.array(z.number()).nullish(),
  formattedIndustries: z.array(z.string()).nullish(),
  jobFunctions: z.array(z.string()).nullish(),
  formattedJobFunctions: z.array(z.string()).nullish(),
  inferredBenefits: z.array(z.string()).nullish(),
  applyMethod: z.object({ companyApplyUrl: z.string().nullish() }).nullish(),
  companyDetails: z
    .object({ '*companyResolutionResult': z.string().nullish() })
    .nullish(),
});
export type RawJobPosting = z.infer<typeof RawJobPostingSchema>;

export const RawJobCompanySchema = z.object({
  entityUrn: z.string(),
  name: z.string().nullish(),
  url: z.string().nullish(),
  universalName: z.string().nullish(),
  staffCount: z.number().nullish(),
  logo: z.object({ image: VectorImageSchema.nullish() }).nullish(),
});

/** The standardized title and employment status: a URN and a label. */
export const RawLabelSchema = z.object({
  entityUrn: z.string(),
  localizedName: z.string().nullish(),
});

export const RawJobResponseSchema = z.object({
  data: RawJobPostingSchema,
  included: z.array(IncludedEntitySchema),
});
