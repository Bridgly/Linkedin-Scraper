import { fetchVoyager } from '../../linkedin/client';
import { DECORATION_IDS, VOYAGER_API_URL } from '../../linkedin/endpoints';
import { buildImageUrl } from '../../linkedin/images';
import { entitiesOfType } from '../../linkedin/included';
import {
  found,
  invalidInput,
  unexpectedResponse,
  type ScrapeResult,
} from '../../linkedin/result';
import { epochToIso } from '../../util/text';
import { extractTrailingId, extractUrnLastSegment } from '../../util/urn';
import {
  JOB_COMPANY_TYPE,
  RawJobCompanySchema,
  RawJobResponseSchema,
  RawLabelSchema,
} from './raw-schema';
import { JOB_URL_PATTERN, type Job } from './schema';

/**
 * Zips two parallel arrays (`industries` + `formattedIndustries`, …) into
 * `[id, name]` pairs. Either side may be shorter.
 */
function zipPairs<A, B>(
  ids: A[] | null | undefined,
  names: B[] | null | undefined,
): [A | null, B | null][] {
  const length = Math.max(ids?.length ?? 0, names?.length ?? 0);
  return Array.from({ length }, (_, index) => [
    ids?.at(index) ?? null,
    names?.at(index) ?? null,
  ]);
}

/** Turns the job posting response into a {@link Job}. */
function transformJob(json: unknown, jobId: string): ScrapeResult<Job> {
  const parsed = RawJobResponseSchema.safeParse(json);
  if (!parsed.success) return unexpectedResponse('job', parsed.error);
  const { data: posting, included } = parsed.data;

  const companies = entitiesOfType(
    included,
    JOB_COMPANY_TYPE,
    RawJobCompanySchema,
  );
  const companyUrn = posting.companyDetails?.['*companyResolutionResult'];
  const company =
    companies.find((candidate) => candidate.entityUrn === companyUrn) ??
    companies.at(0);

  const labelOf = (urn: string | null | undefined): string | null => {
    const label = included.find((entity) => entity.entityUrn === urn);
    const parsedLabel = RawLabelSchema.safeParse(label);
    return parsedLabel.success
      ? (parsedLabel.data.localizedName ?? null)
      : null;
  };
  const titleUrn = posting['*standardizedTitleResolutionResult'] ?? null;
  const employmentUrn = posting['*employmentStatusResolutionResult'] ?? null;

  return found({
    jobId,
    jobUrn: posting.entityUrn,
    dashJobUrn: posting.dashEntityUrn ?? null,
    jobUrl: `https://www.linkedin.com/jobs/view/${jobId}/`,
    applyUrl: posting.applyMethod?.companyApplyUrl ?? null,
    title: posting.title ?? null,
    standardizedTitleUrn: titleUrn,
    standardizedTitleId: extractTrailingId(titleUrn),
    standardizedTitleName: labelOf(titleUrn),
    description: posting.description?.text ?? null,
    location: posting.formattedLocation ?? null,
    geoUrn: posting.locationUrn ?? null,
    geoId: extractTrailingId(posting.locationUrn),
    countryUrn: posting.country ?? null,
    countryCode: extractUrnLastSegment(posting.country),
    workRemoteAllowed: posting.workRemoteAllowed ?? null,
    experienceLevel: posting.formattedExperienceLevel || null,
    employmentType: labelOf(employmentUrn),
    employmentTypeUrn: employmentUrn,
    employmentTypeCode: extractUrnLastSegment(employmentUrn),
    industries: zipPairs(posting.industries, posting.formattedIndustries).map(
      ([id, name]) => ({ industryId: id == null ? null : String(id), name }),
    ),
    jobFunctions: zipPairs(
      posting.jobFunctions,
      posting.formattedJobFunctions,
    ).map(([code, name]) => ({ code, name })),
    inferredBenefits: posting.inferredBenefits ?? [],
    jobState: posting.jobState ?? null,
    sourceDomain: posting.sourceDomain ?? null,
    listedAt: epochToIso(posting.listedAt),
    listedAtEpochMs: posting.listedAt ?? null,
    originalListedAt: epochToIso(posting.originalListedAt),
    originalListedAtEpochMs: posting.originalListedAt ?? null,
    expiresAt: epochToIso(posting.expireAt),
    expiresAtEpochMs: posting.expireAt ?? null,
    closedAt: epochToIso(posting.closedAt),
    closedAtEpochMs: posting.closedAt ?? null,
    applies: posting.applies ?? null,
    views: posting.views ?? null,
    companyName: company?.name ?? null,
    companyUrn: company?.entityUrn ?? null,
    companyId: extractTrailingId(company?.entityUrn),
    companyUrl: company?.url ?? null,
    companyUniversalName: company?.universalName ?? null,
    companyStaffCount: company?.staffCount ?? null,
    companyDescription: posting.companyDescription?.text ?? null,
    companyLogoUrl: buildImageUrl(company?.logo?.image),
  });
}

/**
 * Scrapes a job posting from its URL. The id is read from the `/jobs/view/<id>`
 * part, which may carry a title slug before the id.
 */
export async function scrapeJob(jobUrl: string): Promise<ScrapeResult<Job>> {
  const jobId = jobUrl.match(JOB_URL_PATTERN)?.at(1);
  if (jobId == null) {
    return invalidInput('Could not read a job id from the URL');
  }
  return fetchVoyager({
    url: `${VOYAGER_API_URL}/jobs/jobPostings/${jobId}?decorationId=${DECORATION_IDS.job}`,
    on404: 'entityMissing',
    transform: (json) => transformJob(json, jobId),
  });
}
