import { fetchVoyager } from '../../linkedin/client';
import { DECORATION_IDS, VOYAGER_API_URL } from '../../linkedin/endpoints';
import {
  entitiesOfType,
  NormalizedResponseSchema,
} from '../../linkedin/included';
import {
  found,
  notFound,
  unexpectedResponse,
  type ScrapeResult,
} from '../../linkedin/result';
import { PROFILE_TYPES, RawProfileSchema } from './raw-schema';
import type { Profile } from './schema';
import { transformProfile } from './transform';

/** Base URL of the profile lookup; the decoration decides how much comes back. */
function profilesUrl(memberIdentity: string): string {
  return `${VOYAGER_API_URL}/identity/dash/profiles?q=memberIdentity&memberIdentity=${memberIdentity}`;
}

/** Scrapes a full profile by its slug (linkedin.com/in/<slug>). */
export async function scrapeProfile(
  memberIdentity: string,
): Promise<ScrapeResult<Profile>> {
  return fetchVoyager({
    url: `${profilesUrl(memberIdentity)}&decorationId=${DECORATION_IDS.profile}`,
    on404: 'entityMissing',
    transform: (json) => transformProfile(json, memberIdentity),
  });
}

/**
 * Resolves a profile slug to its profile URN (`urn:li:fsd_profile:ACoAA…`),
 * which the activity endpoints are keyed by. Without a decoration the lookup
 * returns only the bare profile, so it is cheap.
 */
export async function resolveProfileUrn(
  memberIdentity: string,
): Promise<ScrapeResult<string>> {
  return fetchVoyager({
    url: profilesUrl(memberIdentity),
    on404: 'entityMissing',
    transform: (json) => {
      const parsed = NormalizedResponseSchema.safeParse(json);
      if (!parsed.success) return unexpectedResponse('profile', parsed.error);
      const profile = entitiesOfType(
        parsed.data.included,
        PROFILE_TYPES.profile,
        RawProfileSchema,
      ).find((candidate) => candidate.publicIdentifier === memberIdentity);
      return profile == null
        ? notFound('LinkedIn profile not found')
        : found(profile.entityUrn);
    },
  });
}
