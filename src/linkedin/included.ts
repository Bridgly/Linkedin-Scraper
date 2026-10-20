import { z } from 'zod';

/**
 * Voyager responses are "normalized": the entities you asked for, and every
 * entity they reference, arrive flattened in one `included` array, each tagged
 * with a `$type` and linked to the others by URN (`"*socialDetail": "urn:li:…"`).
 * The schema is loose so each entity keeps its fields for a second, typed parse.
 */
export const IncludedEntitySchema = z.looseObject({
  $type: z.string(),
  entityUrn: z.string().nullish(),
});
export type IncludedEntity = z.infer<typeof IncludedEntitySchema>;

/** A normalized response, of which only `included` is needed. */
export const NormalizedResponseSchema = z.object({
  included: z.array(IncludedEntitySchema),
});

/**
 * Picks the `included` entities of one `$type` and parses each with `schema`,
 * skipping any that don't match it.
 */
export function entitiesOfType<T>(
  included: IncludedEntity[],
  type: string,
  schema: z.ZodType<T>,
): T[] {
  return included
    .filter((entity) => entity.$type === type)
    .flatMap((entity) => {
      const parsed = schema.safeParse(entity);
      return parsed.success ? [parsed.data] : [];
    });
}

/** Indexes entities by their `entityUrn`, to follow `*reference` fields. */
export function indexByUrn<T extends { entityUrn?: string | null }>(
  entities: T[],
): Map<string, T> {
  return new Map(
    entities.flatMap((entity): [string, T][] =>
      entity.entityUrn == null ? [] : [[entity.entityUrn, entity]],
    ),
  );
}

/** Looks up an `included` entity by URN; null for a missing URN or entity. */
export type ResolveEntity = (urn: string | null | undefined) => unknown;

/** Builds a {@link ResolveEntity} over a response's `included` array. */
export function entityResolver(included: IncludedEntity[]): ResolveEntity {
  const byUrn = indexByUrn(included);
  return (urn) => (urn == null ? null : (byUrn.get(urn) ?? null));
}
