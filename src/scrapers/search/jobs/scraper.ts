import { fetchVoyager } from '../../../linkedin/client';
import { LINKEDIN_URL } from '../../../linkedin/endpoints';
import { buildImageUrl } from '../../../linkedin/images';
import { entityResolver, type ResolveEntity } from '../../../linkedin/included';
import {
  found,
  invalidInput,
  unexpectedResponse,
  type ScrapeResult,
} from '../../../linkedin/result';
import { compact } from '../../../util/array';
import { epochToIso } from '../../../util/text';
import { extractPathSegment } from '../../../util/url';
import { extractTrailingId } from '../../../util/urn';
import type { SearchJobsRequest } from '../request-schema';
import { buildJobSearchUrl } from './query';
import {
  JobCardsResponseSchema,
  JobCompanySchema,
  JobPostingCardSchema,
  JobPostingSchema,
  JobVerificationSchema,
  type JobPostingCard,
  type JobVerification,
} from './raw-schema';
import type { SearchJob, SearchJobs } from './schema';

/** LinkedIn only serves the first 1000 job results and answers 400 beyond. */
const MAX_JOB_SEARCH_START = 1000;

/** The card's third line is a salary only when it reads like pay. */
function salaryLabel(text: string | null | undefined): string | null {
  const trimmed = text?.trim();
  if (trimmed == null || trimmed.length === 0) return null;
  return /[$€£¥]|\/(yr|hr|wk|mo)\b/i.test(trimmed) ? trimmed : null;
}

/** Whether the verification badge is LinkedIn's verified icon. */
function isVerified(verification: JobVerification): boolean {
  return (verification.badge?.attributes ?? []).some((attribute) =>
    (attribute.detailDataUnion?.systemImage ?? '').includes('VERIFIED'),
  );
}

/** Maps one job card, resolving its company logo, repost flag and badge. */
function buildJobCard(
  card: JobPostingCard,
  resolve: ResolveEntity,
): SearchJob | null {
  const jobUrn = card.jobPostingUrn;
  if (jobUrn == null) return null;

  const jobId = extractTrailingId(jobUrn);
  const companyUrn =
    card.logo?.attributes?.at(0)?.detailData?.['*companyLogo'] ?? null;
  const companySlug = extractPathSegment(card.logo?.actionTarget, 'company');
  const listedAtEpochMs =
    (card.footerItems ?? []).find((item) => item.type === 'LISTED_DATE')
      ?.timeAt ?? null;
  const company = JobCompanySchema.safeParse(resolve(companyUrn));
  const posting = JobPostingSchema.safeParse(resolve(card['*jobPosting']));
  const verification = JobVerificationSchema.safeParse(
    resolve(card['*jobPostingVerification']),
  );

  return {
    jobUrn,
    jobId,
    jobUrl: jobId == null ? null : `${LINKEDIN_URL}/jobs/view/${jobId}/`,
    title: card.title?.text?.trim() || null,
    companyName: card.primaryDescription?.text || null,
    companyUrn,
    companyId: extractTrailingId(companyUrn),
    companySlug,
    companyUrl:
      companySlug == null ? null : `${LINKEDIN_URL}/company/${companySlug}/`,
    location: card.secondaryDescription?.text || null,
    salary: salaryLabel(card.tertiaryDescription?.text),
    listedAt: epochToIso(listedAtEpochMs),
    listedAtEpochMs,
    imageUrl: company.success
      ? buildImageUrl(company.data.logo?.vectorImage)
      : null,
    reposted: posting.success ? (posting.data.repostedJob ?? null) : null,
    verified: verification.success ? isVerified(verification.data) : null,
  };
}

/** Turns a job search response into {@link SearchJobs}, in display order. */
function transformJobSearch(
  json: unknown,
  keyword: string,
): ScrapeResult<SearchJobs> {
  const parsed = JobCardsResponseSchema.safeParse(json);
  if (!parsed.success) return unexpectedResponse('job search', parsed.error);
  const { data, included } = parsed.data;
  const resolve = entityResolver(included);

  const cardUrns = compact(
    (data.elements ?? []).map(
      (element) => element.jobCardUnion?.['*jobPostingCard'],
    ),
  );
  const jobs = cardUrns.flatMap((urn) => {
    const card = JobPostingCardSchema.safeParse(resolve(urn));
    return card.success ? [buildJobCard(card.data, resolve)] : [];
  });

  return found({
    jobs: compact(jobs),
    keyword,
    totalResultCount: data.paging?.total ?? null,
  });
}

/**
 * Searches jobs by keyword, optionally filtered by location, workplace type,
 * seniority, employment type and posting date.
 */
export async function searchJobs(
  request: SearchJobsRequest,
): Promise<ScrapeResult<SearchJobs>> {
  if (request.start > MAX_JOB_SEARCH_START) {
    return invalidInput(
      `LinkedIn only returns the first ${MAX_JOB_SEARCH_START} jobs, so start must be ${MAX_JOB_SEARCH_START} or less`,
    );
  }
  return fetchVoyager({
    url: buildJobSearchUrl(request),
    on404: 'endpointGone',
    transform: (json) => transformJobSearch(json, request.keyword),
  });
}
