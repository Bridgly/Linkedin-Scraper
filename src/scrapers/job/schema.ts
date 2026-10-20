import { z } from 'zod';

/** The numeric job id in a posting URL, optionally after a title slug. */
export const JOB_URL_PATTERN = /\/view\/(?:[^/?#]*-)?(\d+)/;

export const GetJobRequestSchema = z.object({
  jobUrl: z
    .string()
    .regex(
      JOB_URL_PATTERN,
      'jobUrl must be a job posting URL, e.g. "https://www.linkedin.com/jobs/view/4417164255/".',
    ),
});

export const JobSchema = z.object({
  jobId: z.string(),
  jobUrn: z.string(),
  dashJobUrn: z.string().nullable(),
  jobUrl: z.string(),
  applyUrl: z.string().nullable(),
  title: z.string().nullable(),
  standardizedTitleUrn: z.string().nullable(),
  standardizedTitleId: z.string().nullable(),
  standardizedTitleName: z.string().nullable(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  geoUrn: z.string().nullable(),
  geoId: z.string().nullable(),
  countryUrn: z.string().nullable(),
  countryCode: z.string().nullable(),
  workRemoteAllowed: z.boolean().nullable(),
  experienceLevel: z.string().nullable(),
  employmentType: z.string().nullable(),
  employmentTypeUrn: z.string().nullable(),
  employmentTypeCode: z.string().nullable(),
  industries: z.array(
    z.object({
      industryId: z.string().nullable(),
      name: z.string().nullable(),
    }),
  ),
  jobFunctions: z.array(
    z.object({ code: z.string().nullable(), name: z.string().nullable() }),
  ),
  inferredBenefits: z.array(z.string()),
  jobState: z.string().nullable(),
  sourceDomain: z.string().nullable(),
  listedAt: z.string().nullable(),
  listedAtEpochMs: z.number().nullable(),
  originalListedAt: z.string().nullable(),
  originalListedAtEpochMs: z.number().nullable(),
  expiresAt: z.string().nullable(),
  expiresAtEpochMs: z.number().nullable(),
  closedAt: z.string().nullable(),
  closedAtEpochMs: z.number().nullable(),
  applies: z.number().nullable(),
  views: z.number().nullable(),
  companyName: z.string().nullable(),
  companyUrn: z.string().nullable(),
  companyId: z.string().nullable(),
  companyUrl: z.string().nullable(),
  companyUniversalName: z.string().nullable(),
  companyStaffCount: z.number().nullable(),
  companyDescription: z.string().nullable(),
  companyLogoUrl: z.string().nullable(),
});
export type Job = z.infer<typeof JobSchema>;
