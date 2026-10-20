import { z } from 'zod';
import { VectorImageSchema } from '../../linkedin/raw-schema';

/**
 * Entities in the response of
 * GET /voyager/api/identity/dash/profiles?q=memberIdentity&decorationId=…FullProfileWithEntities-85
 */

const PREFIX = 'com.linkedin.voyager.dash';

export const PROFILE_TYPES = {
  profile: `${PREFIX}.identity.profile.Profile`,
  position: `${PREFIX}.identity.profile.Position`,
  education: `${PREFIX}.identity.profile.Education`,
  employmentType: `${PREFIX}.identity.profile.EmploymentType`,
  certification: `${PREFIX}.identity.profile.Certification`,
  skill: `${PREFIX}.identity.profile.Skill`,
  course: `${PREFIX}.identity.profile.Course`,
  honor: `${PREFIX}.identity.profile.Honor`,
  project: `${PREFIX}.identity.profile.Project`,
  publication: `${PREFIX}.identity.profile.Publication`,
  volunteerExperience: `${PREFIX}.identity.profile.VolunteerExperience`,
  company: `${PREFIX}.organization.Company`,
  school: `${PREFIX}.organization.School`,
  geo: `${PREFIX}.common.Geo`,
  industry: `${PREFIX}.common.Industry`,
};

const DateSchema = z.object({
  year: z.number().nullish(),
  month: z.number().nullish(),
  day: z.number().nullish(),
});

const DateRangeSchema = z.object({
  start: DateSchema.nullish(),
  end: DateSchema.nullish(),
});

const PictureSchema = z.object({
  displayImageReference: z
    .object({ vectorImage: VectorImageSchema.nullish() })
    .nullish(),
});

const LogoSchema = z.object({ vectorImage: VectorImageSchema.nullish() });

export const RawProfileSchema = z.object({
  entityUrn: z.string(),
  publicIdentifier: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  headline: z.string().nullish(),
  summary: z.string().nullish(),
  locationName: z.string().nullish(),
  address: z.string().nullish(),
  birthDateOn: DateSchema.nullish(),
  industryUrn: z.string().nullish(),
  geoLocation: z.object({ geoUrn: z.string().nullish() }).nullish(),
  profilePicture: PictureSchema.nullish(),
  backgroundPicture: PictureSchema.nullish(),
});
export type RawProfile = z.infer<typeof RawProfileSchema>;

export const RawPositionSchema = z.object({
  title: z.string().nullish(),
  companyName: z.string().nullish(),
  companyUrn: z.string().nullish(),
  employmentTypeUrn: z.string().nullish(),
  locationName: z.string().nullish(),
  description: z.string().nullish(),
  dateRange: DateRangeSchema.nullish(),
});
export type RawPosition = z.infer<typeof RawPositionSchema>;

export const RawEducationSchema = z.object({
  schoolName: z.string().nullish(),
  schoolUrn: z.string().nullish(),
  degreeName: z.string().nullish(),
  fieldOfStudy: z.string().nullish(),
  grade: z.string().nullish(),
  activities: z.string().nullish(),
  description: z.string().nullish(),
  dateRange: DateRangeSchema.nullish(),
});
export type RawEducation = z.infer<typeof RawEducationSchema>;

export const RawCertificationSchema = z.object({
  name: z.string().nullish(),
  authority: z.string().nullish(),
  licenseNumber: z.string().nullish(),
  url: z.string().nullish(),
  dateRange: DateRangeSchema.nullish(),
});

export const RawSkillSchema = z.object({ name: z.string().nullish() });

export const RawCourseSchema = z.object({
  name: z.string().nullish(),
  number: z.string().nullish(),
});

export const RawHonorSchema = z.object({
  title: z.string().nullish(),
  issuer: z.string().nullish(),
  issuedOn: DateSchema.nullish(),
  description: z.string().nullish(),
});

export const RawProjectSchema = z.object({
  title: z.string().nullish(),
  description: z.string().nullish(),
  url: z.string().nullish(),
  dateRange: DateRangeSchema.nullish(),
});

export const RawPublicationSchema = z.object({
  name: z.string().nullish(),
  publisher: z.string().nullish(),
  publishedOn: DateSchema.nullish(),
  description: z.string().nullish(),
  url: z.string().nullish(),
});

export const RawVolunteerExperienceSchema = z.object({
  role: z.string().nullish(),
  companyName: z.string().nullish(),
  cause: z.string().nullish(),
  description: z.string().nullish(),
  dateRange: DateRangeSchema.nullish(),
});

export const RawCompanySchema = z.object({
  entityUrn: z.string(),
  url: z.string().nullish(),
  industryUrns: z.array(z.string()).nullish(),
  logo: LogoSchema.nullish(),
});
export type RawCompany = z.infer<typeof RawCompanySchema>;

export const RawSchoolSchema = z.object({
  entityUrn: z.string(),
  url: z.string().nullish(),
  logo: LogoSchema.nullish(),
});
export type RawSchool = z.infer<typeof RawSchoolSchema>;

/** Geos, industries and employment types: a URN and a display name. */
export const RawNamedEntitySchema = z.object({
  entityUrn: z.string(),
  name: z.string().nullish(),
  defaultLocalizedName: z.string().nullish(),
});
export type RawNamedEntity = z.infer<typeof RawNamedEntitySchema>;
