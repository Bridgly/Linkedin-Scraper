import { z } from 'zod';

/**
 * Entities in the profile "Comments" activity tab, the response of the
 * `voyagerFeedDashProfileUpdates` GraphQL query. Post comments
 * (/feed/comments) reuse the feed shapes in ../posts/raw-schema.ts.
 */

export const DASH_COMMENT_TYPE = 'com.linkedin.voyager.dash.social.Comment';

/**
 * LinkedIn's "AttributedText": a string, or `{ text }` / `{ value }` wrapping
 * one, possibly nested. Collapses to the plain string, or null.
 */
export const AttributedTextSchema: z.ZodType<string | null> = z.lazy(() =>
  z
    .union([
      z.string(),
      z.object({
        text: AttributedTextSchema.nullish(),
        value: AttributedTextSchema.nullish(),
      }),
    ])
    .transform((value) =>
      typeof value === 'string'
        ? value || null
        : (value.text ?? value.value ?? null),
    )
    .catch(null),
);

export const RawDashCommentSchema = z.object({
  urn: z.string().nullish(),
  entityUrn: z.string().nullish(),
  permalink: z.string().nullish(),
  createdAt: z.number().nullish(),
  commentary: AttributedTextSchema.nullish(),
  commenter: z
    .object({
      title: AttributedTextSchema.nullish(),
      // The commenter's bare profile id (the part after urn:li:fsd_profile:).
      commenterProfileId: z.string().nullish(),
    })
    .nullish(),
  rootUrn: z.string().nullish(),
  threadUrn: z.string().nullish(),
  parentCommentUrn: z.string().nullish(),
});
export type RawDashComment = z.infer<typeof RawDashCommentSchema>;
