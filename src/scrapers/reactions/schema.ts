import { z } from 'zod';
import {
  ActivityUrnSchema,
  PaginationSchema,
  ProfileSlugSchema,
} from '../request-schema';

export const GetPostReactionsRequestSchema = PaginationSchema.extend({
  activityUrn: ActivityUrnSchema,
});

export const GetProfileReactionsRequestSchema = PaginationSchema.extend({
  publicId: ProfileSlugSchema,
});

/** A member who reacted to a post. */
export const PostReactionSchema = z.object({
  reactionType: z.string().nullable(),
  reactorName: z.string().nullable(),
  reactorHeadline: z.string().nullable(),
  reactorProfileUrn: z.string().nullable(),
  reactorMemberId: z.string().nullable(),
  reactorPublicId: z.string().nullable(),
  reactorProfileUrl: z.string().nullable(),
  reactorProfileImage: z.string().nullable(),
});
export type PostReaction = z.infer<typeof PostReactionSchema>;

const ReactionAuthorSchema = z.object({
  authorName: z.string().nullable(),
  authorType: z.enum(['member', 'company']).nullable(),
  // urn:li:member:<id> or urn:li:company:<id>
  authorUrn: z.string().nullable(),
  // urn:li:fsd_profile:<token> or urn:li:fsd_company:<id>
  authorProfileUrn: z.string().nullable(),
  authorPublicId: z.string().nullable(),
  authorUrl: z.string().nullable(),
  authorHeadline: z.string().nullable(),
  authorImage: z.string().nullable(),
});
export type ReactionAuthor = z.infer<typeof ReactionAuthorSchema>;

/** A post a member reacted to, from their profile's activity. */
export const ProfileReactionSchema = ReactionAuthorSchema.extend({
  urn: z.string().nullable(),
  text: z.string().nullable(),
  permalink: z.string().nullable(),
  rootActivityUrn: z.string().nullable(),
  activityId: z.string().nullable(),
  shareUrn: z.string().nullable(),
  numLikes: z.number().nullable(),
  numComments: z.number().nullable(),
  numShares: z.number().nullable(),
});
export type ProfileReaction = z.infer<typeof ProfileReactionSchema>;
