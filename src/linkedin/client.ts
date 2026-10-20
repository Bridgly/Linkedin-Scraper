import { match } from 'ts-pattern';
import { env } from '../env';
import { logger } from '../logger';
import {
  scrapeError,
  upstreamFailure,
  type ScrapeResult,
  type Upstream404,
} from './result';

/** A current desktop Chrome. Ideally, the browser your cookies came from. */
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

/** The headers linkedin.com sends with every Voyager call. */
const VOYAGER_HEADERS = {
  accept: 'application/vnd.linkedin.normalized+json+2.1',
  'x-li-lang': 'en_US',
  'x-restli-protocol-version': '2.0.0',
  'user-agent': USER_AGENT,
};

/** LinkedIn throttles with 429, or with its own non-standard 999. */
const RATE_LIMIT_STATUSES = [429, 999];

/**
 * Voyager authenticates with two cookies. `li_at` is the session itself;
 * `JSESSIONID` doubles as the CSRF token, which must be echoed back without its
 * surrounding quotes in the `csrf-token` header.
 */
function sessionHeaders(): Record<string, string> {
  const csrfToken = env.LINKEDIN_JSESSIONID.replace(/"/g, '');
  return {
    ...VOYAGER_HEADERS,
    'csrf-token': csrfToken,
    cookie: `li_at=${env.LINKEDIN_LI_AT}; JSESSIONID="${csrfToken}"`,
  };
}

/** A redirect (to the login page), 401 or 403 means the cookies no longer work. */
function isSessionRejected(status: number): boolean {
  return (status >= 300 && status < 400) || status === 401 || status === 403;
}

/** Turns an unsuccessful response into a result with a helpful message. */
async function failedResponse<T>({
  url,
  response,
  on404,
}: {
  url: string;
  response: Response;
  on404: Upstream404;
}): Promise<ScrapeResult<T>> {
  const body = await response.text().catch(() => '');
  logger.warn(
    { url, status: response.status, body: body.slice(0, 500) },
    'LinkedIn returned an error',
  );
  return match(response.status)
    .when(isSessionRejected, () =>
      scrapeError<T>(
        'LinkedIn rejected the session. Copy fresh li_at and JSESSIONID cookies into .env and restart.',
      ),
    )
    .when(
      (status) => RATE_LIMIT_STATUSES.includes(status),
      () =>
        scrapeError<T>(
          'LinkedIn is rate limiting this account. Slow down and try again later.',
        ),
    )
    .otherwise((status) => upstreamFailure<T>({ status, on404 }));
}

/**
 * Calls a Voyager URL with the session cookies and hands the JSON to
 * `transform`, which validates it and shapes the output. `on404` says what a
 * 404 means for this URL (see {@link Upstream404}).
 */
export async function fetchVoyager<T>({
  url,
  on404,
  transform,
}: {
  url: string;
  on404: Upstream404;
  transform: (json: unknown) => ScrapeResult<T>;
}): Promise<ScrapeResult<T>> {
  const response = await fetch(url, {
    headers: sessionHeaders(),
    redirect: 'manual',
  }).catch((err: unknown) => {
    logger.error({ err, url }, 'Could not reach LinkedIn');
    return null;
  });
  if (response == null) return scrapeError('Could not reach LinkedIn');
  if (!response.ok) return failedResponse({ url, response, on404 });

  const json: unknown = await response.json().catch(() => null);
  if (json == null) return scrapeError('LinkedIn did not return JSON');
  return transform(json);
}
