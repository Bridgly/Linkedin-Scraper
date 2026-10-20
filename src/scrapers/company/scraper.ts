import { fetchVoyager } from '../../linkedin/client';
import { DECORATION_IDS, VOYAGER_API_URL } from '../../linkedin/endpoints';
import type { ScrapeResult } from '../../linkedin/result';
import type { Company } from './schema';
import { transformCompany } from './transform';

/** Scrapes a company page by its slug (linkedin.com/company/<slug>). */
export async function scrapeCompany(
  universalName: string,
): Promise<ScrapeResult<Company>> {
  return fetchVoyager({
    url: `${VOYAGER_API_URL}/organization/companies?decorationId=${DECORATION_IDS.company}&q=universalName&universalName=${universalName}`,
    on404: 'entityMissing',
    transform: (json) => transformCompany(json, universalName),
  });
}
