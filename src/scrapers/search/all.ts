import { match } from 'ts-pattern';
import { z } from 'zod';
import { LINKEDIN_URL } from '../../linkedin/endpoints';
import { imageViewModelUrl } from '../../linkedin/images';
import type { ResolveEntity } from '../../linkedin/included';
import { mapFound, type ScrapeResult } from '../../linkedin/result';
import { epochToIso } from '../../util/text';
import { extractEntityUrn, extractTrailingId } from '../../util/urn';
import { companyUrnFromLogo, extractJobListedAt } from './card-helpers';
import { buildSearchCompany, SearchCompanySchema } from './companies';
import { buildSearchCourse, SearchCourseSchema } from './courses';
import { searchEntities } from './entity-search';
import { buildSearchGroup, SearchGroupSchema } from './groups';
import { SearchJobSchema, type SearchJob } from './jobs/schema';
import { buildSearchPerson, SearchPersonSchema } from './people';
import { buildSearchProduct, SearchProductSchema } from './products';
import type { EntityResult } from './raw-schema';
import type { SearchRequest } from './request-schema';

/** A result of any kind, told apart by `type`. */
export const SearchAllItemSchema = z.discriminatedUnion('type', [
  SearchPersonSchema.extend({ type: z.literal('person') }),
  SearchCompanySchema.extend({ type: z.literal('company') }),
  SearchJobSchema.extend({ type: z.literal('job') }),
  SearchGroupSchema.extend({ type: z.literal('group') }),
  SearchProductSchema.extend({ type: z.literal('product') }),
  SearchCourseSchema.extend({ type: z.literal('course') }),
]);
export type SearchAllItem = z.infer<typeof SearchAllItemSchema>;

export const SearchAllSchema = z.object({
  results: z.array(SearchAllItemSchema),
  keyword: z.string(),
  totalResultCount: z.number().nullable(),
});
export type SearchAll = z.infer<typeof SearchAllSchema>;

/** The kind of entity a card shows, read from the URN inside its id. */
const KIND_PATTERN =
  /urn:li:(fsd_profile|fsd_company|fsd_jobPosting|fsd_group|organizationalPage|lyndaCourse):/;

/**
 * Maps a job card from the mixed results. These cards are thinner than the
 * job search ones: no company slug, salary, repost flag or badge.
 */
function buildJobCard(
  card: EntityResult,
  resolve: ResolveEntity,
): SearchJob | null {
  const jobUrn = extractEntityUrn(card.entityUrn, 'fsd_jobPosting');
  if (jobUrn == null) return null;
  const jobId = extractTrailingId(jobUrn);
  const companyUrn = companyUrnFromLogo(card);
  const listedAtEpochMs = extractJobListedAt(card, resolve);

  return {
    jobUrn,
    jobId,
    jobUrl: jobId == null ? null : `${LINKEDIN_URL}/jobs/view/${jobId}/`,
    title: card.title?.text || null,
    companyName: card.primarySubtitle?.text || null,
    companyUrn,
    companyId: extractTrailingId(companyUrn),
    companySlug: null,
    companyUrl: null,
    location: card.secondarySubtitle?.text || null,
    salary: null,
    listedAt: epochToIso(listedAtEpochMs),
    listedAtEpochMs,
    imageUrl: imageViewModelUrl(card.image),
    reposted: null,
    verified: null,
  };
}

/** Maps a card with the mapper of its own tab, and tags it with its kind. */
function buildItem(
  card: EntityResult,
  resolve: ResolveEntity,
): SearchAllItem | null {
  const kind = card.entityUrn.match(KIND_PATTERN)?.at(1);
  const tag = <T extends object, K extends SearchAllItem['type']>(
    item: T | null,
    type: K,
  ) => (item == null ? null : { ...item, type });

  return match(kind)
    .returnType<SearchAllItem | null>()
    .with('fsd_profile', () => tag(buildSearchPerson(card), 'person'))
    .with('fsd_company', () => tag(buildSearchCompany(card), 'company'))
    .with('fsd_jobPosting', () => tag(buildJobCard(card, resolve), 'job'))
    .with('fsd_group', () => tag(buildSearchGroup(card), 'group'))
    .with('organizationalPage', () =>
      tag(buildSearchProduct(card, resolve), 'product'),
    )
    .with('lyndaCourse', () => tag(buildSearchCourse(card), 'course'))
    .otherwise(() => null);
}

/**
 * Searches everything at once: people, companies, jobs, groups, products and
 * courses, mixed the way LinkedIn ranks them.
 */
export async function searchAll(
  request: SearchRequest,
): Promise<ScrapeResult<SearchAll>> {
  const page = await searchEntities({
    resultType: 'ALL',
    request,
    buildCard: buildItem,
  });
  return mapFound(page, ({ items, totalResultCount }) => ({
    results: items,
    keyword: request.keyword,
    totalResultCount,
  }));
}
