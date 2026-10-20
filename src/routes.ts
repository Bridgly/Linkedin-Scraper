import type { FastifyInstance } from 'fastify';
import { match } from 'ts-pattern';
import type { z } from 'zod';
import { found, type ScrapeResult } from './linkedin/result';
import { scrapePostComments } from './scrapers/comments/post-comments';
import { scrapeProfileComments } from './scrapers/comments/profile-comments';
import {
  GetPostCommentsRequestSchema,
  GetProfileCommentsRequestSchema,
} from './scrapers/comments/schema';
import { GetCompanyRequestSchema } from './scrapers/company/schema';
import { scrapeCompany } from './scrapers/company/scraper';
import { GetJobRequestSchema } from './scrapers/job/schema';
import { scrapeJob } from './scrapers/job/scraper';
import {
  GetCompanyPostsRequestSchema,
  GetPostDetailRequestSchema,
  GetProfilePostsRequestSchema,
} from './scrapers/posts/schema';
import {
  scrapeCompanyPosts,
  scrapePostDetail,
  scrapeProfilePosts,
} from './scrapers/posts/scraper';
import { GetProfileRequestSchema } from './scrapers/profile/schema';
import { scrapeProfile } from './scrapers/profile/scraper';
import { scrapePostReactions } from './scrapers/reactions/post-reactions';
import { scrapeProfileReactions } from './scrapers/reactions/profile-reactions';
import {
  GetPostReactionsRequestSchema,
  GetProfileReactionsRequestSchema,
} from './scrapers/reactions/schema';
import { searchAll } from './scrapers/search/all';
import { searchCompanies } from './scrapers/search/companies';
import { searchCourses } from './scrapers/search/courses';
import { searchEvents } from './scrapers/search/events';
import { searchGroups } from './scrapers/search/groups';
import { searchJobs } from './scrapers/search/jobs/scraper';
import { searchPeople } from './scrapers/search/people';
import { searchPosts } from './scrapers/search/posts/scraper';
import { searchProducts } from './scrapers/search/products';
import {
  SearchJobsRequestSchema,
  SearchPostsRequestSchema,
  SearchRequestSchema,
} from './scrapers/search/request-schema';
import { searchSchools } from './scrapers/search/schools';
import { searchServices } from './scrapers/search/services';

type ErrorReply = { error: string };

/**
 * Registers a `POST` route that validates the body with `schema`, runs
 * `scrape` and replies `{ data }`, or `{ error }` with a matching status.
 * List endpoints pass `empty`, which a "not found" turns into.
 */
function scrapeRoute<TInput, TData>(
  app: FastifyInstance,
  {
    path,
    schema,
    scrape,
    empty,
  }: {
    path: string;
    schema: z.ZodType<TInput>;
    scrape: (input: TInput) => Promise<ScrapeResult<TData>>;
    empty?: (input: TInput) => NoInfer<TData>;
  },
): void {
  app.post<{ Reply: { data: TData } | ErrorReply }>(
    path,
    async (request, reply) => {
      const input = schema.safeParse(request.body ?? {});
      if (!input.success) {
        const message =
          input.error.issues.at(0)?.message ?? 'Invalid request body';
        return reply.status(400).send({ error: message });
      }

      const scraped = await scrape(input.data);
      const result =
        scraped.type === 'notFound' && empty != null
          ? found(empty(input.data))
          : scraped;
      return match(result)
        .with({ type: 'found' }, ({ data }) => reply.send({ data }))
        .with({ type: 'notFound' }, ({ message }) =>
          reply.status(404).send({ error: message }),
        )
        .with({ type: 'invalidInput' }, ({ statusCode, message }) =>
          reply.status(statusCode).send({ error: message }),
        )
        .with({ type: 'error' }, ({ message }) =>
          reply.status(500).send({ error: message }),
        )
        .exhaustive();
    },
  );
}

/** Registers every endpoint. Paths and bodies match the Bridgly Cloud API. */
export function registerRoutes(app: FastifyInstance): void {
  app.get('/health', async () => ({ status: 'ok' }));

  scrapeRoute(app, {
    path: '/linkedin/get-profile-from-url',
    schema: GetProfileRequestSchema,
    scrape: ({ memberIdentity }) => scrapeProfile(memberIdentity),
  });
  scrapeRoute(app, {
    path: '/linkedin/get-company-from-url',
    schema: GetCompanyRequestSchema,
    scrape: ({ universalName }) => scrapeCompany(universalName),
  });
  scrapeRoute(app, {
    path: '/linkedin/get-job',
    schema: GetJobRequestSchema,
    scrape: ({ jobUrl }) => scrapeJob(jobUrl),
  });

  const emptyPostsPage = () => ({
    posts: [],
    paging: { start: null, count: null, total: null },
  });
  scrapeRoute(app, {
    path: '/linkedin/get-posts/from-company',
    schema: GetCompanyPostsRequestSchema,
    scrape: ({ universalName, ...page }) =>
      scrapeCompanyPosts(universalName, page),
    empty: emptyPostsPage,
  });
  scrapeRoute(app, {
    path: '/linkedin/get-posts/from-profile',
    schema: GetProfilePostsRequestSchema,
    scrape: ({ publicId, ...page }) => scrapeProfilePosts(publicId, page),
    empty: emptyPostsPage,
  });
  scrapeRoute(app, {
    path: '/linkedin/get-post-detail',
    schema: GetPostDetailRequestSchema,
    scrape: ({ activityUrn }) => scrapePostDetail(activityUrn),
  });

  scrapeRoute(app, {
    path: '/linkedin/get-activity-comments',
    schema: GetPostCommentsRequestSchema,
    scrape: ({ activityUrn, count }) => scrapePostComments(activityUrn, count),
    empty: () => [],
  });
  scrapeRoute(app, {
    path: '/linkedin/get-profile-comments',
    schema: GetProfileCommentsRequestSchema,
    scrape: ({ publicId, ...page }) => scrapeProfileComments(publicId, page),
    empty: () => [],
  });
  scrapeRoute(app, {
    path: '/linkedin/get-post-reactions',
    schema: GetPostReactionsRequestSchema,
    scrape: ({ activityUrn, ...page }) =>
      scrapePostReactions(activityUrn, page),
    empty: () => [],
  });
  scrapeRoute(app, {
    path: '/linkedin/get-profile-reactions',
    schema: GetProfileReactionsRequestSchema,
    scrape: ({ publicId, ...page }) => scrapeProfileReactions(publicId, page),
    empty: () => [],
  });

  const emptySearch = ({ keyword }: { keyword: string }) => ({
    keyword,
    totalResultCount: null,
  });
  scrapeRoute(app, {
    path: '/linkedin/search/all',
    schema: SearchRequestSchema,
    scrape: searchAll,
    empty: (input) => ({ ...emptySearch(input), results: [] }),
  });
  scrapeRoute(app, {
    path: '/linkedin/search/people',
    schema: SearchRequestSchema,
    scrape: searchPeople,
    empty: (input) => ({ ...emptySearch(input), people: [] }),
  });
  scrapeRoute(app, {
    path: '/linkedin/search/companies',
    schema: SearchRequestSchema,
    scrape: searchCompanies,
    empty: (input) => ({ ...emptySearch(input), companies: [] }),
  });
  scrapeRoute(app, {
    path: '/linkedin/search/jobs',
    schema: SearchJobsRequestSchema,
    scrape: searchJobs,
    empty: (input) => ({ ...emptySearch(input), jobs: [] }),
  });
  scrapeRoute(app, {
    path: '/linkedin/search/posts',
    schema: SearchPostsRequestSchema,
    scrape: searchPosts,
    empty: (input) => ({ ...emptySearch(input), posts: [] }),
  });
  scrapeRoute(app, {
    path: '/linkedin/search/schools',
    schema: SearchRequestSchema,
    scrape: searchSchools,
    empty: (input) => ({ ...emptySearch(input), schools: [] }),
  });
  scrapeRoute(app, {
    path: '/linkedin/search/groups',
    schema: SearchRequestSchema,
    scrape: searchGroups,
    empty: (input) => ({ ...emptySearch(input), groups: [] }),
  });
  scrapeRoute(app, {
    path: '/linkedin/search/events',
    schema: SearchRequestSchema,
    scrape: searchEvents,
    empty: (input) => ({ ...emptySearch(input), events: [] }),
  });
  scrapeRoute(app, {
    path: '/linkedin/search/products',
    schema: SearchRequestSchema,
    scrape: searchProducts,
    empty: (input) => ({ ...emptySearch(input), products: [] }),
  });
  scrapeRoute(app, {
    path: '/linkedin/search/services',
    schema: SearchRequestSchema,
    scrape: searchServices,
    empty: (input) => ({ ...emptySearch(input), services: [] }),
  });
  scrapeRoute(app, {
    path: '/linkedin/search/courses',
    schema: SearchRequestSchema,
    scrape: searchCourses,
    empty: (input) => ({ ...emptySearch(input), courses: [] }),
  });
}
