import { z } from 'zod';

/** One path segment of a LinkedIn URL, never a full URL or a query string. */
const SLUG_PATTERN = /^[^\s/?#&=]+$/;

/** A profile slug, from linkedin.com/in/<slug>. */
export const ProfileSlugSchema = z
  .string()
  .regex(SLUG_PATTERN, 'Pass the profile slug only, e.g. "williamhgates".');

/** A company slug, from linkedin.com/company/<slug>. */
export const CompanySlugSchema = z
  .string()
  .regex(SLUG_PATTERN, 'Pass the company slug only, e.g. "openai".');

/** A post id, as LinkedIn writes it. */
export const ActivityUrnSchema = z
  .string()
  .regex(
    /^urn:li:(activity|ugcPost|share):\d+$/,
    'activityUrn must look like "urn:li:activity:7300000000000000000".',
  );

/** LinkedIn returns at most 10 items per page on these endpoints. */
export const MAX_PAGE_SIZE = 10;

/** Pagination shared by every list endpoint. */
export const PaginationSchema = z.object({
  start: z.number().int().min(0).default(0),
  count: z.number().int().min(1).max(MAX_PAGE_SIZE).default(MAX_PAGE_SIZE),
});
