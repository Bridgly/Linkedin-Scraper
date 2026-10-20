import { z } from 'zod';
import {
  ActivityUrnSchema,
  CompanySlugSchema,
  PaginationSchema,
  ProfileSlugSchema,
} from '../request-schema';

export const GetCompanyPostsRequestSchema = PaginationSchema.extend({
  universalName: CompanySlugSchema,
});

export const GetProfilePostsRequestSchema = PaginationSchema.extend({
  publicId: ProfileSlugSchema,
});

export const GetPostDetailRequestSchema = z.object({
  activityUrn: ActivityUrnSchema,
});

export const PostSocialCountsSchema = z.object({
  numLikes: z.number().nullable(),
  numComments: z.number().nullable(),
  numShares: z.number().nullable(),
  reactionTypeCounts: z.array(
    z.object({ reactionType: z.string(), count: z.number() }),
  ),
});
export type PostSocialCounts = z.infer<typeof PostSocialCountsSchema>;

export const PostArticleSchema = z.object({
  title: z.string().nullable(),
  subtitle: z.string().nullable(),
  url: z.string().nullable(),
  imageUrl: z.string().nullable(),
});
export type PostArticle = z.infer<typeof PostArticleSchema>;

export const PostEventSchema = z.object({
  title: z.string().nullable(),
  url: z.string().nullable(),
  date: z.string().nullable(),
  location: z.string().nullable(),
});
export type PostEvent = z.infer<typeof PostEventSchema>;

export const PostJobSchema = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  url: z.string().nullable(),
});
export type PostJob = z.infer<typeof PostJobSchema>;

export const PostCommentSchema = z.object({
  urn: z.string().nullable(),
  text: z.string().nullable(),
  commenterName: z.string().nullable(),
  commenterUrn: z.string().nullable(),
  createdTime: z.number().nullable(),
  parentCommentUrn: z.string().nullable(),
});
export type PostComment = z.infer<typeof PostCommentSchema>;

const AuthorFieldsSchema = z.object({
  actorName: z.string().nullable(),
  actorUrn: z.string().nullable(),
  // Profile slug or company slug of the author, and its page URL.
  actorPublicIdentifier: z.string().nullable(),
  actorUrl: z.string().nullable(),
});

export const ResharedPostSchema = AuthorFieldsSchema.extend({
  urn: z.string().nullable(),
  url: z.string().nullable(),
  shareUrn: z.string().nullable(),
  text: z.string().nullable(),
  publishedAt: z.string().nullable(),
});

export const PostSchema = AuthorFieldsSchema.extend({
  urn: z.string().nullable(),
  url: z.string().nullable(),
  shareUrn: z.string().nullable(),
  shareAudience: z.string().nullable(),
  text: z.string().nullable(),
  // Relative label such as "2 days ago".
  publishedAt: z.string().nullable(),
  // Epoch milliseconds, decoded from the post id.
  postedAt: z.number().nullable(),
  actorHeadline: z.string().nullable(),
  images: z.array(z.object({ url: z.string() })),
  article: PostArticleSchema.nullable(),
  event: PostEventSchema.nullable(),
  job: PostJobSchema.nullable(),
  socialCounts: PostSocialCountsSchema.nullable(),
  resharedPost: ResharedPostSchema.nullable(),
  comments: z.array(PostCommentSchema),
});
export type Post = z.infer<typeof PostSchema>;

export const PostsPageSchema = z.object({
  posts: z.array(PostSchema),
  paging: z.object({
    start: z.number().nullable(),
    count: z.number().nullable(),
    total: z.number().nullable(),
  }),
});
export type PostsPage = z.infer<typeof PostsPageSchema>;
