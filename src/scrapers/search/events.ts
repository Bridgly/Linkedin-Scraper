import { z } from 'zod';
import { LINKEDIN_URL } from '../../linkedin/endpoints';
import { imageViewModelUrl } from '../../linkedin/images';
import { mapFound, type ScrapeResult } from '../../linkedin/result';
import { parseLeadingCount, splitOnBullet } from '../../util/text';
import { extractEntityUrn, extractTrailingId } from '../../util/urn';
import { insightLines } from './card-helpers';
import { searchEntities } from './entity-search';
import type { EntityResult } from './raw-schema';
import type { SearchRequest } from './request-schema';

export const SearchEventSchema = z.object({
  eventUrn: z.string(),
  eventId: z.string().nullable(),
  eventUrl: z.string().nullable(),
  name: z.string().nullable(),
  // "Fri, Jun 26, 9:00 AM CDT"
  dateLabel: z.string().nullable(),
  location: z.string().nullable(),
  isOnline: z.boolean(),
  organizer: z.string().nullable(),
  // "31 attendees", and the same as a number.
  attendeesLabel: z.string().nullable(),
  attendeesCount: z.number().nullable(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
});
export type SearchEvent = z.infer<typeof SearchEventSchema>;

export const SearchEventsSchema = z.object({
  events: z.array(SearchEventSchema),
  keyword: z.string(),
  totalResultCount: z.number().nullable(),
});
export type SearchEvents = z.infer<typeof SearchEventsSchema>;

/** Maps an event result card. Its second subtitle reads "<location> • By <organizer>". */
function buildSearchEvent(card: EntityResult): SearchEvent | null {
  const eventUrn = extractEntityUrn(card.entityUrn, 'event');
  if (eventUrn == null) return null;
  const eventId = extractTrailingId(eventUrn);
  const { head: location, tail: organizer } = splitOnBullet(
    card.secondarySubtitle?.text,
  );
  const attendeesLabel =
    insightLines(card).find((line) => /attendee/i.test(line)) ?? null;

  return {
    eventUrn,
    eventId,
    eventUrl: eventId == null ? null : `${LINKEDIN_URL}/events/${eventId}/`,
    name: card.title?.text || null,
    dateLabel: card.primarySubtitle?.text || null,
    location,
    isOnline: location?.toLowerCase() === 'online',
    organizer: organizer?.replace(/^By\s+/, '') || null,
    attendeesLabel,
    attendeesCount: parseLeadingCount(attendeesLabel),
    description: card.summary?.text || null,
    imageUrl: imageViewModelUrl(card.image),
  };
}

/** Searches events by keyword. */
export async function searchEvents(
  request: SearchRequest,
): Promise<ScrapeResult<SearchEvents>> {
  const page = await searchEntities({
    resultType: 'EVENTS',
    request,
    buildCard: buildSearchEvent,
  });
  return mapFound(page, ({ items, totalResultCount }) => ({
    events: items,
    keyword: request.keyword,
    totalResultCount,
  }));
}
