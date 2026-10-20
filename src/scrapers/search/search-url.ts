import { QUERY_IDS, VOYAGER_API_URL } from '../../linkedin/endpoints';
import { encodeRestliValue } from '../../util/url';

/**
 * The search tab to query. `CONTENT` is posts, `LEARNING` is courses, `ALL`
 * mixes every kind. Jobs have their own endpoint (see jobs/scraper.ts).
 */
export type SearchResultType =
  | 'ALL'
  | 'CONTENT'
  | 'PEOPLE'
  | 'COMPANIES'
  | 'SCHOOLS'
  | 'GROUPS'
  | 'EVENTS'
  | 'PRODUCTS'
  | 'SERVICES'
  | 'LEARNING';

/**
 * Builds the URL of the search GraphQL query, shared by every search tab.
 * Variables use Rest.li's `(key:value,…)` syntax rather than JSON: the
 * parentheses and colons are sent as they are and only the keyword is encoded.
 * `extraQueryParameters` add filters, e.g. `(key:sortBy,value:List(date_posted))`.
 */
export function buildSearchUrl({
  resultType,
  keyword,
  start,
  count,
  extraQueryParameters = [],
}: {
  resultType: SearchResultType;
  keyword: string;
  start: number;
  count: number;
  extraQueryParameters?: string[];
}): string {
  const queryParameters = [
    `(key:resultType,value:List(${resultType}))`,
    ...extraQueryParameters,
  ].join(',');
  const variables =
    `(start:${start},count:${count},origin:GLOBAL_SEARCH_HEADER,` +
    `query:(keywords:${encodeRestliValue(keyword)},` +
    `flagshipSearchIntent:SEARCH_SRP,` +
    `queryParameters:List(${queryParameters})))`;
  return `${VOYAGER_API_URL}/graphql?queryId=${QUERY_IDS.search}&variables=${variables}`;
}
