import { z } from 'zod';

export const SearchJobSchema = z.object({
  jobUrn: z.string(),
  jobId: z.string().nullable(),
  jobUrl: z.string().nullable(),
  title: z.string().nullable(),
  companyName: z.string().nullable(),
  companyUrn: z.string().nullable(),
  companyId: z.string().nullable(),
  companySlug: z.string().nullable(),
  companyUrl: z.string().nullable(),
  location: z.string().nullable(),
  // "$68K/yr - $75K/yr", when the card shows pay.
  salary: z.string().nullable(),
  listedAt: z.string().nullable(),
  listedAtEpochMs: z.number().nullable(),
  imageUrl: z.string().nullable(),
  reposted: z.boolean().nullable(),
  // LinkedIn's verified-hiring badge.
  verified: z.boolean().nullable(),
});
export type SearchJob = z.infer<typeof SearchJobSchema>;

export const SearchJobsSchema = z.object({
  jobs: z.array(SearchJobSchema),
  keyword: z.string(),
  totalResultCount: z.number().nullable(),
});
export type SearchJobs = z.infer<typeof SearchJobsSchema>;
