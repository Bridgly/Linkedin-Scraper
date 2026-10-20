import { DECORATION_IDS, VOYAGER_API_URL } from '../../../linkedin/endpoints';
import { compact } from '../../../util/array';
import { encodeRestliValue } from '../../../util/url';
import type {
  DatePosted,
  ExperienceLevel,
  JobType,
  SearchJobsRequest,
  WorkplaceType,
} from '../request-schema';

/** How LinkedIn encodes each filter value in `selectedFilters`. */
const WORKPLACE_TYPE_FILTER: Record<WorkplaceType, string> = {
  'on-site': '1',
  remote: '2',
  hybrid: '3',
};

const EXPERIENCE_FILTER: Record<ExperienceLevel, string> = {
  internship: '1',
  'entry-level': '2',
  associate: '3',
  'mid-senior': '4',
  director: '5',
  executive: '6',
};

const JOB_TYPE_FILTER: Record<JobType, string> = {
  'full-time': 'F',
  'part-time': 'P',
  contract: 'C',
  temporary: 'T',
  internship: 'I',
  volunteer: 'V',
  other: 'O',
};

/** Seconds since posting: `r86400` is "past 24 hours". */
const DATE_POSTED_FILTER: Record<DatePosted, string> = {
  'past-24h': 'r86400',
  'past-week': 'r604800',
  'past-month': 'r2592000',
};

/** The `selectedFilters:(…)` clause, or null without filters. */
function selectedFilters(request: SearchJobsRequest): string | null {
  const { experienceLevel, jobType, datePosted, workplaceType } = request;
  const filters = compact([
    experienceLevel == null
      ? null
      : `experience:List(${EXPERIENCE_FILTER[experienceLevel]})`,
    jobType == null ? null : `jobType:List(${JOB_TYPE_FILTER[jobType]})`,
    datePosted == null
      ? null
      : `timePostedRange:List(${DATE_POSTED_FILTER[datePosted]})`,
    workplaceType == null
      ? null
      : `workplaceType:List(${WORKPLACE_TYPE_FILTER[workplaceType]})`,
  ]);
  return filters.length === 0 ? null : `selectedFilters:(${filters.join(',')})`;
}

/**
 * Builds the job search URL. `query` uses Rest.li's `(key:value,…)` syntax;
 * only the keyword and the location are encoded.
 */
export function buildJobSearchUrl(request: SearchJobsRequest): string {
  const query = compact([
    'origin:JOB_SEARCH_PAGE_OTHER_ENTRY',
    `keywords:${encodeRestliValue(request.keyword)}`,
    request.location == null
      ? null
      : `locationUnion:(seoLocation:(location:${encodeRestliValue(request.location)}))`,
    selectedFilters(request),
    'spellCorrectionEnabled:true',
  ]).join(',');
  return (
    `${VOYAGER_API_URL}/voyagerJobsDashJobCards` +
    `?decorationId=${DECORATION_IDS.jobSearchCards}` +
    `&count=${request.count}&q=jobSearch&query=(${query})&start=${request.start}`
  );
}
