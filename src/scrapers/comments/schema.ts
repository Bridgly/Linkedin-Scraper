import { z } from 'zod';
import {
  ActivityUrnSchema,
  MAX_PAGE_SIZE,
  PaginationSchema,
  ProfileSlugSchema,
} from '../request-schema';

export const GetPostCommentsRequestSchema = z.object({
  activityUrn: ActivityUrnSchema,
  count: z.number().int().min(1).max(MAX_PAGE_SIZE).default(MAX_PAGE_SIZE),
});

export const GetProfileCommentsRequestSchema = PaginationSchema.extend({
  publicId: ProfileSlugSchema,
});

/** A comment or a reply on a post. Replies carry their parent's id. */
export const PostCommentSchema = z.object({
  urn: z.string(),
  activityId: z.string(),
  commentId: z.string(),
  parentCommentId: z.string().nullable(),
  text: z.string().nullable(),
  authorName: z.string().nullable(),
  // Epoch milliseconds.
  createdTime: z.number().nullable(),
  numLikes: z.number().nullable(),
  numComments: z.number().nullable(),
});
export type PostComment = z.infer<typeof PostCommentSchema>;

/** A comment a member wrote, from their profile's activity. */
export const ProfileCommentSchema = z.object({
  urn: z.string().nullable(),
  text: z.string().nullable(),
  authorName: z.string().nullable(),
  // Epoch milliseconds.
  createdTime: z.number().nullable(),
  permalink: z.string().nullable(),
  // The post the comment was left on.
  rootActivityUrn: z.string().nullable(),
  parentCommentUrn: z.string().nullable(),
});
export type ProfileComment = z.infer<typeof ProfileCommentSchema>;
