import { buildImageUrl } from '../../linkedin/images';
import {
  entitiesOfType,
  indexByUrn,
  NormalizedResponseSchema,
  type IncludedEntity,
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
  PROFILE_TYPES,
  RawCertificationSchema,
  RawCompanySchema,
  RawCourseSchema,
  RawEducationSchema,
  RawHonorSchema,
  RawNamedEntitySchema,
  RawPositionSchema,
  RawProfileSchema,
  RawProjectSchema,
  RawPublicationSchema,
  RawSchoolSchema,
  RawSkillSchema,
  RawVolunteerExperienceSchema,
  type RawCompany,
  type RawEducation,
  type RawNamedEntity,
  type RawPosition,
  type RawProfile,
  type RawSchool,
} from './raw-schema';
import type { Profile, ProfileEducation, ProfileExperience } from './schema';

/** Companies, schools and labels that positions and degrees point at by URN. */
type ProfileLookups = {
  companies: Map<string, RawCompany>;
  schools: Map<string, RawSchool>;
  labels: Map<string, RawNamedEntity>;
};

/** Indexes the entities that profile sections reference. */
function buildLookups(included: IncludedEntity[]): ProfileLookups {
  const labelTypes = [
    PROFILE_TYPES.geo,
    PROFILE_TYPES.industry,
    PROFILE_TYPES.employmentType,
  ];
  return {
    companies: indexByUrn(
      entitiesOfType(included, PROFILE_TYPES.company, RawCompanySchema),
    ),
    schools: indexByUrn(
      entitiesOfType(included, PROFILE_TYPES.school, RawSchoolSchema),
    ),
    labels: indexByUrn(
      labelTypes.flatMap((type) =>
        entitiesOfType(included, type, RawNamedEntitySchema),
      ),
    ),
  };
}

/** The display name behind a geo / industry / employment-type URN. */
function labelOf(
  lookups: ProfileLookups,
  urn: string | null | undefined,
): string | null {
  const entity = urn == null ? undefined : lookups.labels.get(urn);
  return entity?.defaultLocalizedName ?? entity?.name ?? null;
}

/** Maps one position, resolving its company, logo and employment type. */
function buildExperience(
  position: RawPosition,
  lookups: ProfileLookups,
): ProfileExperience {
  const company =
    position.companyUrn == null
      ? undefined
      : lookups.companies.get(position.companyUrn);
  return {
    title: position.title ?? null,
    company: position.companyName ?? null,
    companyId: extractUrnLastSegment(position.companyUrn),
    companyUrl: company?.url ?? null,
    companyLogoUrl: buildImageUrl(company?.logo?.vectorImage),
    employmentType: labelOf(lookups, position.employmentTypeUrn),
    location: position.locationName ?? null,
    startDate: formatPartialDate(position.dateRange?.start, 'start'),
    endDate: formatPartialDate(position.dateRange?.end, 'end'),
    description: position.description ?? null,
    industries: compact(
      (company?.industryUrns ?? []).map((urn) => labelOf(lookups, urn)),
    ),
  };
}

/** Maps one degree, resolving its school and logo. */
function buildEducation(
  education: RawEducation,
  lookups: ProfileLookups,
): ProfileEducation {
  const school =
    education.schoolUrn == null
      ? undefined
      : lookups.schools.get(education.schoolUrn);
  return {
    school: education.schoolName ?? null,
    schoolId: extractUrnLastSegment(education.schoolUrn),
    schoolUrl: school?.url ?? null,
    schoolLogoUrl: buildImageUrl(school?.logo?.vectorImage),
    degree: education.degreeName ?? null,
    fieldOfStudy: education.fieldOfStudy ?? null,
    startDate: formatPartialDate(education.dateRange?.start, 'start'),
    endDate: formatPartialDate(education.dateRange?.end, 'end'),
    grade: education.grade ?? null,
    activities: education.activities ?? null,
    description: education.description ?? null,
  };
}

/**
 * The birthday as `YYYY-MM-DD`, or `MM-DD` when the member shares the day but
 * not the year.
 */
function formatBirthday(birthDate: RawProfile['birthDateOn']): string | null {
  if (birthDate == null) return null;
  const withYear = formatPartialDate(birthDate, 'start');
  if (withYear != null) return withYear;
  const parts = compact([birthDate.month, birthDate.day]).map((part) =>
    String(part).padStart(2, '0'),
  );
  return parts.length > 0 ? parts.join('-') : null;
}

/** Maps the profile's own fields: name, headline, photos, about, location. */
function buildTopCard(profile: RawProfile, lookups: ProfileLookups) {
  return {
    name: compact([profile.firstName, profile.lastName]).join(' ') || null,
    headline: profile.headline ?? null,
    location:
      labelOf(lookups, profile.geoLocation?.geoUrn) ??
      profile.locationName ??
      null,
    profilePhotoUrl: buildImageUrl(
      profile.profilePicture?.displayImageReference?.vectorImage,
    ),
    bannerPhotoUrl: buildImageUrl(
      profile.backgroundPicture?.displayImageReference?.vectorImage,
    ),
    about: profile.summary ?? null,
    industry: labelOf(lookups, profile.industryUrn),
    birthday: formatBirthday(profile.birthDateOn),
    address: profile.address ?? null,
  };
}

/**
 * Turns the full-profile response into a {@link Profile}. The response holds
 * the profile plus every position, degree, skill, company and school it
 * references, as separate entities.
 */
export function transformProfile(
  json: unknown,
  memberIdentity: string,
): ScrapeResult<Profile> {
  const parsed = NormalizedResponseSchema.safeParse(json);
  if (!parsed.success) return unexpectedResponse('profile', parsed.error);
  const { included } = parsed.data;

  const profile = entitiesOfType(
    included,
    PROFILE_TYPES.profile,
    RawProfileSchema,
  ).find((candidate) => candidate.publicIdentifier === memberIdentity);
  if (profile == null) return notFound('LinkedIn profile not found');

  const lookups = buildLookups(included);

  return found({
    ...buildTopCard(profile, lookups),
    profileUrl: `https://www.linkedin.com/in/${memberIdentity}/`,
    experience: entitiesOfType(
      included,
      PROFILE_TYPES.position,
      RawPositionSchema,
    ).map((position) => buildExperience(position, lookups)),
    education: entitiesOfType(
      included,
      PROFILE_TYPES.education,
      RawEducationSchema,
    ).map((education) => buildEducation(education, lookups)),
    volunteering: entitiesOfType(
      included,
      PROFILE_TYPES.volunteerExperience,
      RawVolunteerExperienceSchema,
    ).map((volunteering) => ({
      role: volunteering.role ?? null,
      organization: volunteering.companyName ?? null,
      cause: volunteering.cause ?? null,
      startDate: formatPartialDate(volunteering.dateRange?.start, 'start'),
      endDate: formatPartialDate(volunteering.dateRange?.end, 'end'),
      description: volunteering.description ?? null,
    })),
    certifications: entitiesOfType(
      included,
      PROFILE_TYPES.certification,
      RawCertificationSchema,
    ).map((certification) => ({
      name: certification.name ?? null,
      issuingOrganization: certification.authority ?? null,
      issueDate: formatPartialDate(certification.dateRange?.start, 'start'),
      expirationDate: formatPartialDate(certification.dateRange?.end, 'end'),
      credentialId: certification.licenseNumber ?? null,
      credentialUrl: certification.url ?? null,
    })),
    skills: compact(
      entitiesOfType(included, PROFILE_TYPES.skill, RawSkillSchema).map(
        (skill) => skill.name,
      ),
    ),
    publications: entitiesOfType(
      included,
      PROFILE_TYPES.publication,
      RawPublicationSchema,
    ).map((publication) => ({
      title: publication.name ?? null,
      publisher: publication.publisher ?? null,
      publishDate: formatPartialDate(publication.publishedOn, 'start'),
      description: publication.description ?? null,
      url: publication.url ?? null,
    })),
    courses: entitiesOfType(
      included,
      PROFILE_TYPES.course,
      RawCourseSchema,
    ).map((course) => ({
      name: course.name ?? null,
      number: course.number ?? null,
    })),
    projects: entitiesOfType(
      included,
      PROFILE_TYPES.project,
      RawProjectSchema,
    ).map((project) => ({
      name: project.title ?? null,
      startDate: formatPartialDate(project.dateRange?.start, 'start'),
      endDate: formatPartialDate(project.dateRange?.end, 'end'),
      description: project.description ?? null,
      url: project.url ?? null,
    })),
    honorsAndAwards: entitiesOfType(
      included,
      PROFILE_TYPES.honor,
      RawHonorSchema,
    ).map((honor) => ({
      title: honor.title ?? null,
      issuer: honor.issuer ?? null,
      issueDate: formatPartialDate(honor.issuedOn, 'start'),
      description: honor.description ?? null,
    })),
  });
}
