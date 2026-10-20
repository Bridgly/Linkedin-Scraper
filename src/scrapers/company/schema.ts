import { z } from 'zod';
import { CompanySlugSchema } from '../request-schema';

export const GetCompanyRequestSchema = z.object({
  universalName: CompanySlugSchema,
});

const LocationSchema = z.object({
  line1: z.string().nullable(),
  city: z.string().nullable(),
  geographicArea: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
  headquarter: z.boolean(),
});
export type CompanyLocation = z.infer<typeof LocationSchema>;

const FundingDataSchema = z.object({
  numFundingRounds: z.number().nullable(),
  companyCrunchbaseUrl: z.string().nullable(),
  lastFundingRound: z
    .object({
      fundingType: z.string().nullable(),
      moneyRaised: z
        .object({
          currencyCode: z.string().nullable(),
          amount: z.string().nullable(),
        })
        .nullable(),
      announcedOn: z.string().nullable(),
      leadInvestors: z.array(
        z.object({
          name: z.string().nullable(),
          crunchbaseUrl: z.string().nullable(),
        }),
      ),
      numOtherInvestors: z.number().nullable(),
      crunchbaseUrl: z.string().nullable(),
    })
    .nullable(),
});
export type CompanyFundingData = z.infer<typeof FundingDataSchema>;

const SimilarCompanySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  url: z.string().nullable(),
  industry: z.string().nullable(),
});

export const CompanySchema = z.object({
  name: z.string().nullable(),
  universalName: z.string().nullable(),
  description: z.string().nullable(),
  tagline: z.string().nullable(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  companyType: z.string().nullable(),
  foundedYear: z.number().nullable(),
  staffCount: z.number().nullable(),
  staffCountRange: z.string().nullable(),
  specialties: z.array(z.string()),
  headquarters: LocationSchema.nullable(),
  confirmedLocations: z.array(LocationSchema),
  logoUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  linkedinUrl: z.string(),
  followerCount: z.number().nullable(),
  affiliatedCompanyIds: z.array(z.string()),
  showcasePageIds: z.array(z.string()),
  fundingData: FundingDataSchema.nullable(),
  similarCompanies: z.array(SimilarCompanySchema),
});
export type Company = z.infer<typeof CompanySchema>;
