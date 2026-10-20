/**
 * Everything here talks to Voyager, the internal API the linkedin.com web app
 * itself calls. These are the ids LinkedIn changes from time to time; when an
 * operation suddenly returns 404, it is almost always one of them. The README
 * explains how to capture fresh values from your browser.
 */

export const LINKEDIN_URL = 'https://www.linkedin.com';

export const VOYAGER_API_URL = `${LINKEDIN_URL}/voyager/api`;

/** Persisted GraphQL queries, sent as `/voyager/api/graphql?queryId=…`. */
export const QUERY_IDS = {
  search: 'voyagerSearchDashClusters.9a78a658089851e133c5b7bb2b4baee5',
  profileComments:
    'voyagerFeedDashProfileUpdates.81bef031b9f0920ede4b0c9983e3744c',
  profileReactions:
    'voyagerFeedDashProfileUpdates.d6bd2ffe955d1ba0d19440ec139f0666',
};

/** Rest.li decorations: they pick which fields a REST endpoint returns. */
export const DECORATION_IDS = {
  profile:
    'com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-85',
  company: 'com.linkedin.voyager.deco.organization.web.WebFullCompanyMain-12',
  job: 'com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-65',
  jobSearchCards:
    'com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-220',
};
