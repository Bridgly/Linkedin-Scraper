# LinkedIn Scraper

A self-hosted API for LinkedIn data: profiles, companies, jobs, posts, comments, reactions and 11 kinds of search. It calls Voyager, the internal API that linkedin.com itself uses, with the cookies of one logged-in account. No browser, no headless Chrome.

TypeScript, Fastify and Zod.

**Star the repo to keep it handy.** LinkedIn rotates its GraphQL query ids every few weeks, and we update them here when it does.

Need more than one account can handle? [Bridgly Cloud](https://bridgly.app) runs the same endpoints without a LinkedIn account and without a daily cap. See [Bridgly Cloud](#bridgly-cloud).

## Quick start

Requires Node.js 20.6 or newer.

```bash
git clone https://github.com/Bridgly/Linkedin-Scraper.git
cd Linkedin-Scraper
npm install
cp .env.example .env   # then paste your cookies, see below
npm run dev
```

```bash
curl -X POST http://localhost:3000/linkedin/get-profile-from-url \
  -H 'content-type: application/json' \
  -d '{"memberIdentity": "williamhgates"}'
```

Every endpoint answers `{ "data": … }`, or `{ "error": "…" }` with a 400, 404 or 500 status.

### Getting your cookies

1. Log in to linkedin.com in your browser. Use an account you can afford to lose (see [Limits](#limits)).
2. Open DevTools, then **Application** → **Cookies** → `https://www.linkedin.com`.
3. Copy `li_at` into `LINKEDIN_LI_AT` and `JSESSIONID` into `LINKEDIN_JSESSIONID`. With or without the quotes, both work.

The cookies keep working until you log out of that browser session or LinkedIn ends it. If every request fails with "LinkedIn rejected the session", copy them again.

## Endpoints

All endpoints are `POST` with a JSON body. List and search endpoints also take `start` (offset, default `0`) and `count` (1 to 10, default `10`).

| Endpoint                           | Body                                                                                        | Returns                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `/linkedin/get-profile-from-url`   | `memberIdentity`: `"williamhgates"`                                                         | Full profile: experience, education, skills, certifications, projects and more |
| `/linkedin/get-company-from-url`   | `universalName`: `"openai"`                                                                 | Company page, locations, funding, similar companies                            |
| `/linkedin/get-job`                | `jobUrl`: `"https://www.linkedin.com/jobs/view/4417164255/"`                                | Full job posting                                                               |
| `/linkedin/get-posts/from-profile` | `publicId`: `"williamhgates"`                                                               | A member's posts and reposts                                                   |
| `/linkedin/get-posts/from-company` | `universalName`: `"openai"`                                                                 | A company's posts                                                              |
| `/linkedin/get-post-detail`        | `activityUrn`: `"urn:li:activity:7300000000000000000"`                                      | One post with its reaction breakdown                                           |
| `/linkedin/get-activity-comments`  | `activityUrn`                                                                               | Comments and replies on a post                                                 |
| `/linkedin/get-post-reactions`     | `activityUrn`                                                                               | Who reacted to a post, and how                                                 |
| `/linkedin/get-profile-comments`   | `publicId`                                                                                  | Comments a member wrote                                                        |
| `/linkedin/get-profile-reactions`  | `publicId`                                                                                  | Posts a member reacted to                                                      |
| `/linkedin/search/all`             | `keyword`                                                                                   | People, companies, jobs, groups, products and courses, mixed                   |
| `/linkedin/search/people`          | `keyword`                                                                                   | Members                                                                        |
| `/linkedin/search/companies`       | `keyword`                                                                                   | Companies                                                                      |
| `/linkedin/search/jobs`            | `keyword`, optional `location`, `workplaceType`, `experienceLevel`, `jobType`, `datePosted` | Job postings                                                                   |
| `/linkedin/search/posts`           | `keyword`, optional `sortOrder`, `datePosted`                                               | Posts                                                                          |
| `/linkedin/search/schools`         | `keyword`                                                                                   | Schools and universities                                                       |
| `/linkedin/search/groups`          | `keyword`                                                                                   | Groups                                                                         |
| `/linkedin/search/events`          | `keyword`                                                                                   | Events                                                                         |
| `/linkedin/search/products`        | `keyword`                                                                                   | Software products                                                              |
| `/linkedin/search/services`        | `keyword`                                                                                   | Freelancers and agencies                                                       |
| `/linkedin/search/courses`         | `keyword`                                                                                   | LinkedIn Learning courses                                                      |

Filter values:

- `workplaceType`: `on-site`, `remote`, `hybrid`
- `experienceLevel`: `internship`, `entry-level`, `associate`, `mid-senior`, `director`, `executive`
- `jobType`: `full-time`, `part-time`, `contract`, `temporary`, `internship`, `volunteer`, `other`
- `datePosted`: `past-24h`, `past-week`, `past-month`
- `sortOrder`: `relevance`, `date_posted`

## How it talks to LinkedIn

If you would rather call LinkedIn from your own code, this section has everything you need.

### Authentication

There is no bearer token. Voyager checks the session cookie and a CSRF header, and nothing else:

| Header                      | Value                                                                      |
| --------------------------- | -------------------------------------------------------------------------- |
| `cookie`                    | `li_at=<li_at>; JSESSIONID="ajax:<…>"`                                     |
| `csrf-token`                | The `JSESSIONID` value without its quotes, e.g. `ajax:1234567890123456789` |
| `accept`                    | `application/vnd.linkedin.normalized+json+2.1`                             |
| `x-restli-protocol-version` | `2.0.0`                                                                    |
| `x-li-lang`                 | `en_US`                                                                    |
| `user-agent`                | A normal desktop browser user agent                                        |

### Query ids

Last checked on **October 18, 2026**. They live in [`src/linkedin/endpoints.ts`](src/linkedin/endpoints.ts).

| Used by                  | `queryId`                                                        |
| ------------------------ | ---------------------------------------------------------------- |
| Every search except jobs | `voyagerSearchDashClusters.9a78a658089851e133c5b7bb2b4baee5`     |
| Profile comments         | `voyagerFeedDashProfileUpdates.81bef031b9f0920ede4b0c9983e3744c` |
| Profile reactions        | `voyagerFeedDashProfileUpdates.d6bd2ffe955d1ba0d19440ec139f0666` |

REST endpoints take a `decorationId` instead, which picks the fields that come back:

| Used by    | `decorationId`                                                               |
| ---------- | ---------------------------------------------------------------------------- |
| Profile    | `com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-85` |
| Company    | `com.linkedin.voyager.deco.organization.web.WebFullCompanyMain-12`           |
| Job        | `com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-65`             |
| Job search | `com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-220`    |

### Voyager requests

All `GET`, relative to `https://www.linkedin.com/voyager/api`.

```http
# Profile
/identity/dash/profiles?q=memberIdentity&memberIdentity={slug}&decorationId={profile decoration}

# Profile URN (same call without a decoration, returns urn:li:fsd_profile:…)
/identity/dash/profiles?q=memberIdentity&memberIdentity={slug}

# Company
/organization/companies?q=universalName&universalName={slug}&decorationId={company decoration}

# Job
/jobs/jobPostings/{jobId}?decorationId={job decoration}

# A member's posts
/feed/updates?q=memberShareFeed&profileId={slug}&moduleKey=member-share&start=0&count=10

# A company's posts
/feed/updates?q=companyFeedByUniversalName&companyUniversalName={slug}&moduleKey=member-share&start=0&count=10

# One post
/feed/updates/{activityUrn}?commentsCount=0&likesCount=0

# Comments on a post
/feed/comments?q=comments&updateId={activityUrn}&sortOrder=RELEVANCE&start=0&count=10

# Reactions on a post (threadUrn is the post's shareUrn, from the "one post" call)
/feed/reactions?q=reactionType&threadUrn={shareUrn}&start=0&count=10

# Comments a member wrote
/graphql?queryId={profile comments id}&includeWebMetadata=true&variables=(count:10,start:0,profileUrn:{profileUrn})

# Posts a member reacted to
/graphql?queryId={profile reactions id}&includeWebMetadata=true&variables=(count:10,start:0,profileUrn:{profileUrn})

# Search
/graphql?queryId={search id}&variables=(start:0,count:10,origin:GLOBAL_SEARCH_HEADER,query:(keywords:{keyword},flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List({tab})))))

# Job search
/voyagerJobsDashJobCards?decorationId={job search decoration}&q=jobSearch&start=0&count=10&query=(origin:JOB_SEARCH_PAGE_OTHER_ENTRY,keywords:{keyword},spellCorrectionEnabled:true)
```

A few details that are easy to get wrong:

- Variables use Rest.li's `(key:value,…)` syntax, not JSON. Send the parentheses, colons and commas as they are and URL-encode only the values (keywords, locations, URNs). Escape `(`, `)`, `'`, `!` and `*` inside values too, or LinkedIn answers 400.
- Search `{tab}` is one of `ALL`, `PEOPLE`, `COMPANIES`, `CONTENT` (posts), `SCHOOLS`, `GROUPS`, `EVENTS`, `PRODUCTS`, `SERVICES`, `LEARNING` (courses).
- Post search filters go next to `resultType` in `queryParameters`: `(key:sortBy,value:List(date_posted))` and `(key:datePosted,value:List("past-week"))`.
- Job search filters go in `query`: `locationUnion:(seoLocation:(location:India))` and `selectedFilters:(experience:List(2),jobType:List(F),timePostedRange:List(r86400),workplaceType:List(2))`. The codes are in [`src/scrapers/search/jobs/query.ts`](src/scrapers/search/jobs/query.ts). Job search stops at `start` 1000.
- Responses are "normalized": the entities come flattened in an `included` array and point at each other by URN (`"*socialDetail": "urn:li:…"`). [`src/linkedin/included.ts`](src/linkedin/included.ts) has the helpers that put them back together.

### When a query id stops working

The endpoint starts failing with "LinkedIn no longer recognises this endpoint". To get the new id:

1. Open linkedin.com with DevTools on the **Network** tab and filter by `graphql`.
2. Do the action in the page: run a search, or open a profile's **Activity** and pick **Comments** or **Reactions**.
3. Copy the `queryId` parameter of that request into [`src/linkedin/endpoints.ts`](src/linkedin/endpoints.ts).

Or pull this repo. We update the ids when they rotate.

## Limits

This works well for side projects and small batches. It doesn't scale, because LinkedIn watches each account:

- **About 250 requests a day per account.** Past that, LinkedIn shows CAPTCHAs, then restricts the account. Bridgly Cloud has no daily cap.
- **Your account is at risk.** Automated access is against LinkedIn's terms, and a restricted account may not come back. Don't use your main profile.
- **One account means one IP.** Datacenter IPs are flagged quickly. More accounts need their own residential or mobile proxies.
- **Free accounts get less.** People search hits LinkedIn's monthly commercial use limit, and out-of-network members show up as "LinkedIn Member".
- **10 results per page**, and the query ids above change every few weeks.

## Bridgly Cloud

[Bridgly](https://bridgly.app) runs these endpoints as a hosted API. Requests go through our in-house stealth browser, which LinkedIn sees as a real person browsing, so you don't need a LinkedIn account, cookies or proxies.

The paths and request bodies are the same as in this repo. Point your code at `https://api.bridgly.app` and add an API key:

```bash
curl -X POST https://api.bridgly.app/linkedin/get-profile-from-url \
  -H "Authorization: Bearer $BRIDGLY_API_KEY" \
  -H 'content-type: application/json' \
  -d '{"memberIdentity": "williamhgates"}'
```

|                               | This repo                         | Bridgly Cloud                                           |
| ----------------------------- | --------------------------------- | ------------------------------------------------------- |
| Requests per day              | About 250 per LinkedIn account    | No daily cap                                            |
| LinkedIn accounts and proxies | Yours to buy, warm up and replace | Not needed                                              |
| Query ids                     | Update them when they rotate      | Kept up to date for you                                 |
| Platforms                     | LinkedIn                          | LinkedIn, X, Reddit, Instagram, GitHub, YouTube, TikTok |
| Tooling                       | This server                       | SDK, CLI, MCP server, n8n and Make                      |

### Pricing

Each profile, company, job or post costs 1 credit. Lists and searches cost 1 credit per result. You get 100 free credits when you sign up.

- Pay as you go, from $5: **$2 per 1,000** records
- Growth, from $50: about **$1.67 per 1,000**
- Scale, from $300: **$1 per 1,000**

Credits don't expire. See [bridgly.app/pricing](https://bridgly.app/pricing).

### Is running it yourself cheaper?

At small volume, yes: this repo is free. At scale, the account limit decides. Take 10,000 profiles a day:

- 10,000 ÷ 250 = **40 LinkedIn accounts**, each aged and active enough to pass as real
- **40 dedicated residential or mobile IPs**, one per account
- New accounts every time LinkedIn restricts one
- A server, and your time each time a query id rotates or a session logs out

That is about 300,000 profiles a month, which costs **$300 a month** on Bridgly Cloud. Forty accounts and forty residential IPs usually cost about as much before you count the hours spent keeping them alive.

## Project layout

```text
src/
  server.ts               starts Fastify
  routes.ts               one POST route per endpoint
  env.ts                  reads the cookies from .env
  linkedin/
    endpoints.ts          query ids and decoration ids
    client.ts             sends a request with the session headers
    included.ts           helpers for normalized responses
  scrapers/
    profile/  company/  job/  posts/  comments/  reactions/  search/
```

Each scraper folder has a `raw-schema.ts`, the Zod schema of LinkedIn's raw response, and a `schema.ts` with the Zod schemas of the request body and of the cleaned-up output (in `search/`, each tab keeps its output schema at the top of its file). The other files build the Voyager URL and map the raw response to the output.

## License

[MIT](LICENSE). Not affiliated with or endorsed by LinkedIn.
