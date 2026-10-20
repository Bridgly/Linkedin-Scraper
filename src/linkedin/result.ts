import { match } from 'ts-pattern';
import type { z } from 'zod';
import { logger } from '../logger';

/**
 * What every scraper returns, so the route can answer with the right status:
 *  - `found`        the data (200)
 *  - `notFound`     the profile / company / post does not exist (404)
 *  - `invalidInput` the request can't be served as given (400, or LinkedIn's own 4xx)
 *  - `error`        anything else: an expired session, rate limiting, a
 *                   response that no longer parses (500)
 */
export type ScrapeResult<T> =
  | { type: 'found'; data: T }
  | { type: 'notFound'; message: string }
  | { type: 'invalidInput'; statusCode: number; message: string }
  | { type: 'error'; message: string };

/** Wraps scraped data. */
export function found<T>(data: T): ScrapeResult<T> {
  return { type: 'found', data };
}

/** The requested entity does not exist. */
export function notFound<T>(
  message = 'No result found for the given input',
): ScrapeResult<T> {
  return { type: 'notFound', message };
}

/** The request itself is at fault. */
export function invalidInput<T>(
  message: string,
  statusCode = 400,
): ScrapeResult<T> {
  return { type: 'invalidInput', statusCode, message };
}

/** Any other failure. */
export function scrapeError<T>(message: string): ScrapeResult<T> {
  return { type: 'error', message };
}

/**
 * A response that doesn't match its schema usually means LinkedIn changed the
 * response shape. Logs the Zod issues so the schema is easy to fix.
 */
export function unexpectedResponse<T>(
  label: string,
  error: z.ZodError,
): ScrapeResult<T> {
  logger.error(
    { issues: error.issues },
    `Unexpected LinkedIn ${label} response`,
  );
  return scrapeError(`Unexpected LinkedIn ${label} response`);
}

/** Reshapes the data of a `found` result and passes every other result through. */
export function mapFound<T, U>(
  result: ScrapeResult<T>,
  transform: (data: T) => U,
): ScrapeResult<U> {
  return result.type === 'found' ? found(transform(result.data)) : result;
}

/**
 * What a 404 from LinkedIn means for one request:
 *  - `entityMissing` the URL names something the caller chose (a profile slug,
 *                    a post), so a 404 means it doesn't exist.
 *  - `endpointGone`  the URL is fixed (a search, a GraphQL query id), so a 404
 *                    means LinkedIn moved it or rotated the query id.
 */
export type Upstream404 = 'entityMissing' | 'endpointGone';

/** Statuses with which LinkedIn rejects the request parameters themselves. */
const REJECTED_REQUEST_STATUSES = [400, 414, 422];

/** Maps an unsuccessful LinkedIn status to a result. */
export function upstreamFailure<T>({
  status,
  on404,
}: {
  status: number;
  on404: Upstream404;
}): ScrapeResult<T> {
  return match(status)
    .when(
      (code) => REJECTED_REQUEST_STATUSES.includes(code),
      () =>
        invalidInput<T>(
          'LinkedIn rejected the request. Check the request parameters and try again.',
          status,
        ),
    )
    .with(404, 410, () =>
      on404 === 'entityMissing'
        ? notFound<T>()
        : scrapeError<T>(
            'LinkedIn no longer recognises this endpoint. Its query id has probably been rotated; see the README to refresh it.',
          ),
    )
    .otherwise(() =>
      scrapeError<T>(`LinkedIn responded with status ${status}`),
    );
}
