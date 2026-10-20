import { z } from 'zod';
import { PaginationSchema } from '../request-schema';

/** The body every search endpoint accepts. */
export const SearchRequestSchema = PaginationSchema.extend({
  keyword: z.string().regex(/\S/, 'keyword must not be empty.'),
});
export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export const DatePostedSchema = z.enum(['past-24h', 'past-week', 'past-month']);
export type DatePosted = z.infer<typeof DatePostedSchema>;

export const SearchPostsRequestSchema = SearchRequestSchema.extend({
  sortOrder: z.enum(['date_posted', 'relevance']).optional(),
  datePosted: DatePostedSchema.optional(),
});
export type SearchPostsRequest = z.infer<typeof SearchPostsRequestSchema>;

export const WorkplaceTypeSchema = z.enum(['on-site', 'remote', 'hybrid']);
export type WorkplaceType = z.infer<typeof WorkplaceTypeSchema>;

export const ExperienceLevelSchema = z.enum([
  'internship',
  'entry-level',
  'associate',
  'mid-senior',
  'director',
  'executive',
]);
export type ExperienceLevel = z.infer<typeof ExperienceLevelSchema>;

export const JobTypeSchema = z.enum([
  'full-time',
  'part-time',
  'contract',
  'temporary',
  'internship',
  'volunteer',
  'other',
]);
export type JobType = z.infer<typeof JobTypeSchema>;

export const SearchJobsRequestSchema = SearchRequestSchema.extend({
  location: z.string().optional(),
  workplaceType: WorkplaceTypeSchema.optional(),
  experienceLevel: ExperienceLevelSchema.optional(),
  jobType: JobTypeSchema.optional(),
  datePosted: DatePostedSchema.optional(),
});
export type SearchJobsRequest = z.infer<typeof SearchJobsRequestSchema>;
