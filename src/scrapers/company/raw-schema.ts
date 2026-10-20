import { z } from 'zod';
import { VectorImageSchema } from '../../linkedin/raw-schema';

/**
 * Entities in the response of
 * GET /voyager/api/organization/companies?q=universalName&decorationId=…WebFullCompanyMain-12
 */

export const COMPANY_TYPES = {
  company: 'com.linkedin.voyager.organization.Company',
  industry: 'com.linkedin.voyager.common.Industry',
  followingInfo: 'com.linkedin.voyager.common.FollowingInfo',
};

/** The recipe that marks the requested company, as opposed to "similar pages" cards. */
export const FULL_COMPANY_RECIPE =
  'com.linkedin.voyager.deco.organization.web.WebFullCompanyMain';

const DateSchema = z.object({
  year: z.number().nullish(),
  month: z.number().nullish(),
  day: z.number().nullish(),
});

export const RawLocationSchema = z.object({
  line1: z.string().nullish(),
  city: z.string().nullish(),
  geographicArea: z.string().nullish(),
  postalCode: z.string().nullish(),
  country: z.string().nullish(),
  headquarter: z.boolean().nullish(),
});
export type RawLocation = z.infer<typeof RawLocationSchema>;

const RawFundingRoundSchema = z.object({
  fundingType: z.string().nullish(),
  moneyRaised: z
    .object({
      currencyCode: z.string().nullish(),
      amount: z.string().nullish(),
    })
    .nullish(),
  announcedOn: DateSchema.nullish(),
  leadInvestors: z
    .array(
      z.object({
        name: z.object({ text: z.string().nullish() }).nullish(),
        investorCrunchbaseUrl: z.string().nullish(),
      }),
    )
    .nullish(),
  numOtherInvestors: z.number().nullish(),
  fundingRoundCrunchbaseUrl: z.string().nullish(),
});

export const RawFundingDataSchema = z.object({
  numFundingRounds: z.number().nullish(),
  lastFundingRound: RawFundingRoundSchema.nullish(),
  companyCrunchbaseUrl: z.string().nullish(),
});
export type RawFundingData = z.infer<typeof RawFundingDataSchema>;

const ImageSchema = z.object({ image: VectorImageSchema.nullish() });

export const RawCompanySchema = z.object({
  entityUrn: z.string(),
  $recipeTypes: z.array(z.string()).nullish(),
  name: z.string().nullish(),
  universalName: z.string().nullish(),
  description: z.string().nullish(),
  tagline: z.string().nullish(),
  companyPageUrl: z.string().nullish(),
  url: z.string().nullish(),
  staffCount: z.number().nullish(),
  staffCountRange: z.object({ start: z.number().nullish() }).nullish(),
  companyType: z.object({ localizedName: z.string().nullish() }).nullish(),
  foundedOn: z.object({ year: z.number().nullish() }).nullish(),
  specialities: z.array(z.string()).nullish(),
  headquarter: RawLocationSchema.nullish(),
  confirmedLocations: z.array(RawLocationSchema).nullish(),
  logo: ImageSchema.nullish(),
  backgroundCoverImage: ImageSchema.nullish(),
  '*companyIndustries': z.array(z.string()).nullish(),
  affiliatedCompanies: z.array(z.string()).nullish(),
  showcasePages: z.array(z.string()).nullish(),
  fundingData: RawFundingDataSchema.nullish(),
});
export type RawCompany = z.infer<typeof RawCompanySchema>;

export const RawIndustrySchema = z.object({
  entityUrn: z.string(),
  localizedName: z.string().nullish(),
});

export const RawFollowingInfoSchema = z.object({
  entityUrn: z.string(),
  followerCount: z.number().nullish(),
});
