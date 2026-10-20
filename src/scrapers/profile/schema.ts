import { z } from 'zod';
import { ProfileSlugSchema } from '../request-schema';

export const GetProfileRequestSchema = z.object({
  memberIdentity: ProfileSlugSchema,
});

const ExperienceSchema = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  companyId: z.string().nullable(),
  companyUrl: z.string().nullable(),
  companyLogoUrl: z.string().nullable(),
  employmentType: z.string().nullable(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  description: z.string().nullable(),
  industries: z.array(z.string()),
});

const EducationSchema = z.object({
  school: z.string().nullable(),
  schoolId: z.string().nullable(),
  schoolUrl: z.string().nullable(),
  schoolLogoUrl: z.string().nullable(),
  degree: z.string().nullable(),
  fieldOfStudy: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  grade: z.string().nullable(),
  activities: z.string().nullable(),
  description: z.string().nullable(),
});

const VolunteeringSchema = z.object({
  role: z.string().nullable(),
  organization: z.string().nullable(),
  cause: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  description: z.string().nullable(),
});

const CertificationSchema = z.object({
  name: z.string().nullable(),
  issuingOrganization: z.string().nullable(),
  issueDate: z.string().nullable(),
  expirationDate: z.string().nullable(),
  credentialId: z.string().nullable(),
  credentialUrl: z.string().nullable(),
});

const PublicationSchema = z.object({
  title: z.string().nullable(),
  publisher: z.string().nullable(),
  publishDate: z.string().nullable(),
  description: z.string().nullable(),
  url: z.string().nullable(),
});

const CourseSchema = z.object({
  name: z.string().nullable(),
  number: z.string().nullable(),
});

const ProjectSchema = z.object({
  name: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  description: z.string().nullable(),
  url: z.string().nullable(),
});

const HonorSchema = z.object({
  title: z.string().nullable(),
  issuer: z.string().nullable(),
  issueDate: z.string().nullable(),
  description: z.string().nullable(),
});

export const ProfileSchema = z.object({
  name: z.string().nullable(),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  profilePhotoUrl: z.string().nullable(),
  bannerPhotoUrl: z.string().nullable(),
  about: z.string().nullable(),
  profileUrl: z.string(),
  industry: z.string().nullable(),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  volunteering: z.array(VolunteeringSchema),
  certifications: z.array(CertificationSchema),
  skills: z.array(z.string()),
  publications: z.array(PublicationSchema),
  courses: z.array(CourseSchema),
  projects: z.array(ProjectSchema),
  honorsAndAwards: z.array(HonorSchema),
  // `YYYY-MM-DD`, or `MM-DD` when the member hides the year.
  birthday: z.string().nullable(),
  address: z.string().nullable(),
});
export type Profile = z.infer<typeof ProfileSchema>;
export type ProfileExperience = z.infer<typeof ExperienceSchema>;
export type ProfileEducation = z.infer<typeof EducationSchema>;
