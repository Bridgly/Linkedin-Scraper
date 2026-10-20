import { fetchVoyager } from '../../linkedin/client';
import { VOYAGER_API_URL } from '../../linkedin/endpoints';
import type { ScrapeResult } from '../../linkedin/result';
import type { Post, PostsPage } from './schema';
import { transformFeed, transformPostDetail } from './transform';

type Page = { start: number; count: number };

/** Fetches one page of /feed/updates for the given feed query. */
async function scrapeFeed(
  query: Record<string, string>,
  { start, count }: Page,
): Promise<ScrapeResult<PostsPage>> {
  const params = new URLSearchParams({
    ...query,
    moduleKey: 'member-share',
    count: String(count),
    start: String(start),
  });
  return fetchVoyager({
    url: `${VOYAGER_API_URL}/feed/updates?${params}`,
    on404: 'entityMissing',
    transform: transformFeed,
  });
}

/** Scrapes a company's posts, newest first. */
export async function scrapeCompanyPosts(
  universalName: string,
  page: Page,
): Promise<ScrapeResult<PostsPage>> {
  return scrapeFeed(
    { q: 'companyFeedByUniversalName', companyUniversalName: universalName },
    page,
  );
}

/** Scrapes a member's posts and reposts, newest first. */
export async function scrapeProfilePosts(
  publicId: string,
  page: Page,
): Promise<ScrapeResult<PostsPage>> {
  return scrapeFeed({ q: 'memberShareFeed', profileId: publicId }, page);
}

/** Scrapes one post, with its reaction breakdown. */
export async function scrapePostDetail(
  activityUrn: string,
): Promise<ScrapeResult<Post>> {
  return fetchVoyager({
    url: `${VOYAGER_API_URL}/feed/updates/${encodeURIComponent(activityUrn)}?commentsCount=0&likesCount=0`,
    on404: 'entityMissing',
    transform: (json) => transformPostDetail(json, activityUrn),
  });
}
