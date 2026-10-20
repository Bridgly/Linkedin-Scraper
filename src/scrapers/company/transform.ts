import { buildImageUrl } from '../../linkedin/images';
import {
  entitiesOfType,
  indexByUrn,
  NormalizedResponseSchema,
} from '../../linkedin/included';
import {
  found,
  notFound,
  unexpectedResponse,
  type ScrapeResult,
} from '../../linkedin/result';
import { compact } from '../../util/array';
import { formatPartialDate } from '../../util/text';
import { extractUrnLastSegment } from '../../util/urn';
import {
  COMPANY_TYPES,
  FULL_COMPANY_RECIPE,
  RawCompanySchema,
  RawFollowingInfoSchema,
  RawIndustrySchema,
  type RawCompany,
  type RawFundingData,
  type RawLocation,
} from './raw-schema';
import type { Company, CompanyFundingData, CompanyLocation } from './schema';

/** Maps a raw address; `isHeadquarters` overrides the address's own flag. */
function buildLocation(
  location: RawLocation,
  isHeadquarters = location.headquarter ?? false,
): CompanyLocation {
  return {
    line1: location.line1 ?? null,
    city: location.city ?? null,
    geographicArea: location.geographicArea ?? null,
    postalCode: location.postalCode ?? null,
    country: location.country ?? null,
    headquarter: isHeadquarters,
  };
}

/** Confirmed locations, headquarters first. */
function buildConfirmedLocations(company: RawCompany): CompanyLocation[] {
  const locations = company.confirmedLocations ?? [];
  const headquarters = locations.find((location) => location.headquarter);
  const others = locations.filter((location) => !location.headquarter);
  return compact([headquarters, ...others]).map((location) =>
    buildLocation(location),
  );
}

/** LinkedIn only gives the lower bound of the staff range, e.g. `51+`. */
function formatStaffCountRange(
  start: number | null | undefined,
): string | null {
  if (start == null || start === 0) return null;
  return start >= 10001 ? '10,001+' : `${start}+`;
}

/** Maps the Crunchbase funding block. */
function buildFundingData(
  funding: RawFundingData | null | undefined,
): CompanyFundingData | null {
  if (funding == null) return null;
  const round = funding.lastFundingRound;
  return {
    numFundingRounds: funding.numFundingRounds ?? null,
    companyCrunchbaseUrl: funding.companyCrunchbaseUrl ?? null,
    lastFundingRound:
      round == null
        ? null
        : {
            fundingType: round.fundingType ?? null,
            moneyRaised:
              round.moneyRaised == null
                ? null
                : {
                    currencyCode: round.moneyRaised.currencyCode ?? null,
                    amount: round.moneyRaised.amount ?? null,
                  },
            announcedOn: formatPartialDate(round.announcedOn, 'start'),
            leadInvestors: (round.leadInvestors ?? []).map((investor) => ({
              name: investor.name?.text ?? null,
              crunchbaseUrl: investor.investorCrunchbaseUrl ?? null,
            })),
            numOtherInvestors: round.numOtherInvestors ?? null,
            crunchbaseUrl: round.fundingRoundCrunchbaseUrl ?? null,
          },
  };
}

/**
 * Turns the company response into a {@link Company}. Besides the requested
 * company the response carries "similar pages" companies, its industries
 * and its follower counts, each as separate entities.
 */
export function transformCompany(
  json: unknown,
  universalName: string,
): ScrapeResult<Company> {
  const parsed = NormalizedResponseSchema.safeParse(json);
  if (!parsed.success) return unexpectedResponse('company', parsed.error);
  const { included } = parsed.data;

  const companies = entitiesOfType(
    included,
    COMPANY_TYPES.company,
    RawCompanySchema,
  );
  const company =
    companies.find((candidate) =>
      candidate.$recipeTypes?.includes(FULL_COMPANY_RECIPE),
    ) ?? companies.at(0);
  if (company == null) return notFound('LinkedIn company not found');

  const industries = indexByUrn(
    entitiesOfType(included, COMPANY_TYPES.industry, RawIndustrySchema),
  );
  const industryOf = (candidate: RawCompany): string | null => {
    const urn = candidate['*companyIndustries']?.at(0);
    return urn == null ? null : (industries.get(urn)?.localizedName ?? null);
  };

  const companyId = extractUrnLastSegment(company.entityUrn);
  const followingInfo = indexByUrn(
    entitiesOfType(
      included,
      COMPANY_TYPES.followingInfo,
      RawFollowingInfoSchema,
    ),
  ).get(`urn:li:fs_followingInfo:urn:li:company:${companyId}`);

  return found({
    name: company.name ?? null,
    universalName: company.universalName ?? null,
    description: company.description ?? null,
    tagline: company.tagline ?? null,
    website: company.companyPageUrl ?? null,
    industry: industryOf(company),
    companyType: company.companyType?.localizedName ?? null,
    foundedYear: company.foundedOn?.year ?? null,
    staffCount: company.staffCount ?? null,
    staffCountRange: formatStaffCountRange(company.staffCountRange?.start),
    specialties: company.specialities ?? [],
    headquarters:
      company.headquarter == null
        ? null
        : buildLocation(company.headquarter, true),
    confirmedLocations: buildConfirmedLocations(company),
    logoUrl: buildImageUrl(company.logo?.image),
    bannerUrl: buildImageUrl(company.backgroundCoverImage?.image),
    linkedinUrl: `https://www.linkedin.com/company/${universalName}/`,
    followerCount: followingInfo?.followerCount ?? null,
    affiliatedCompanyIds: (company.affiliatedCompanies ?? []).map(
      (urn) => extractUrnLastSegment(urn) ?? urn,
    ),
    showcasePageIds: (company.showcasePages ?? []).map(
      (urn) => extractUrnLastSegment(urn) ?? urn,
    ),
    fundingData: buildFundingData(company.fundingData),
    similarCompanies: companies
      .filter((candidate) => candidate.entityUrn !== company.entityUrn)
      .map((similar) => ({
        id: extractUrnLastSegment(similar.entityUrn) ?? similar.entityUrn,
        name: similar.name ?? null,
        description: similar.description ?? null,
        logoUrl: buildImageUrl(similar.logo?.image),
        url: similar.url ?? null,
        industry: industryOf(similar),
      })),
  });
}
