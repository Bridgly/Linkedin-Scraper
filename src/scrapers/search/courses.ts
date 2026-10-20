import { z } from 'zod';
import { imageViewModelUrl } from '../../linkedin/images';
import { mapFound, type ScrapeResult } from '../../linkedin/result';
import {
  parseDurationMinutes,
  parseMonthDayYear,
  splitOnBullet,
} from '../../util/text';
import { extractPathSegment, stripUrlQuery } from '../../util/url';
import { extractEntityUrn, extractTrailingId } from '../../util/urn';
import { searchEntities } from './entity-search';
import type { EntityResult } from './raw-schema';
import type { SearchRequest } from './request-schema';

export const SearchCourseSchema = z.object({
  courseUrn: z.string(),
  courseId: z.string().nullable(),
  universalName: z.string().nullable(),
  courseUrl: z.string().nullable(),
  name: z.string().nullable(),
  format: z.string().nullable(),
  // "3h 43m", and the same in minutes.
  duration: z.string().nullable(),
  durationMinutes: z.number().nullable(),
  author: z.string().nullable(),
  // "Jan 9, 2025", and the same split into numbers.
  releasedDate: z.string().nullable(),
  releasedYear: z.number().nullable(),
  releasedMonth: z.number().nullable(),
  releasedDay: z.number().nullable(),
  thumbnailUrl: z.string().nullable(),
});
export type SearchCourse = z.infer<typeof SearchCourseSchema>;

export const SearchCoursesSchema = z.object({
  courses: z.array(SearchCourseSchema),
  keyword: z.string(),
  totalResultCount: z.number().nullable(),
});
export type SearchCourses = z.infer<typeof SearchCoursesSchema>;

/**
 * Maps a LinkedIn Learning result card. Its subtitles read
 * "<format> • <duration>" and "By: <author> • Released <date>".
 */
export function buildSearchCourse(card: EntityResult): SearchCourse | null {
  const courseUrn = extractEntityUrn(card.entityUrn, 'lyndaCourse');
  if (courseUrn == null) return null;
  const { head: format, tail: duration } = splitOnBullet(
    card.primarySubtitle?.text,
  );
  const { head: byline, tail: released } = splitOnBullet(
    card.secondarySubtitle?.text,
  );
  const releasedDate = released?.replace(/^Released\s*/, '') || null;
  const { year, month, day } = parseMonthDayYear(releasedDate);

  return {
    courseUrn,
    courseId: extractTrailingId(courseUrn),
    universalName: extractPathSegment(card.navigationUrl, 'learning'),
    courseUrl: stripUrlQuery(card.navigationUrl),
    name: card.title?.text || null,
    format,
    duration,
    durationMinutes: parseDurationMinutes(duration),
    author: byline?.replace(/^By:\s*/, '') || null,
    releasedDate,
    releasedYear: year,
    releasedMonth: month,
    releasedDay: day,
    thumbnailUrl: imageViewModelUrl(card.image),
  };
}

/** Searches LinkedIn Learning courses by keyword. */
export async function searchCourses(
  request: SearchRequest,
): Promise<ScrapeResult<SearchCourses>> {
  const page = await searchEntities({
    resultType: 'LEARNING',
    request,
    buildCard: buildSearchCourse,
  });
  return mapFound(page, ({ items, totalResultCount }) => ({
    courses: items,
    keyword: request.keyword,
    totalResultCount,
  }));
}
