import { z } from 'zod';
import { PostSocialCountsSchema } from '../../posts/schema';

export const SearchPostAuthorSchema = z.object({
  name: z.string().nullable(),
  headline: z.string().nullable(),
  profileUrl: z.string().nullable(),
  profileUrn: z.string().nullable(),
  memberUrn: z.string().nullable(),
  imageUrl: z.string().nullable(),
});
export type SearchPostAuthor = z.infer<typeof SearchPostAuthorSchema>;

/** What the post links to, told apart by `type`. */
export const SearchPostContentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('article'),
    title: z.string().nullable(),
    subtitle: z.string().nullable(),
    url: z.string().nullable(),
    imageUrl: z.string().nullable(),
  }),
  z.object({
    type: z.literal('entity'),
    title: z.string().nullable(),
    subtitle: z.string().nullable(),
    description: z.string().nullable(),
    url: z.string().nullable(),
    imageUrl: z.string().nullable(),
  }),
  z.object({
    type: z.literal('images'),
    urls: z.array(z.string()),
  }),
]);
export type SearchPostContent = z.infer<typeof SearchPostContentSchema>;

export const SearchPostSchema = z.object({
  urn: z.string(),
  shareUrn: z.string().nullable(),
  url: z.string().nullable(),
  text: z.string().nullable(),
  // "5h", "1d", "2w"
  postedAgo: z.string().nullable(),
  author: SearchPostAuthorSchema.nullable(),
  socialCounts: PostSocialCountsSchema.nullable(),
  content: SearchPostContentSchema.nullable(),
});
export type SearchPost = z.infer<typeof SearchPostSchema>;

export const SearchPostsSchema = z.object({
  posts: z.array(SearchPostSchema),
  keyword: z.string(),
  totalResultCount: z.number().nullable(),
});
export type SearchPosts = z.infer<typeof SearchPostsSchema>;
