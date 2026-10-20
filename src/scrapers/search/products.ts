import { z } from 'zod';
import { LINKEDIN_URL } from '../../linkedin/endpoints';
import { imageViewModelUrl } from '../../linkedin/images';
import type { ResolveEntity } from '../../linkedin/included';
import { mapFound, type ScrapeResult } from '../../linkedin/result';
import { extractPathSegment } from '../../util/url';
import { extractEntityUrn, extractTrailingId } from '../../util/urn';
import {
  extractUsedBy,
  insightAfterPrefix,
  insightLines,
} from './card-helpers';
import { searchEntities } from './entity-search';
import type { EntityResult } from './raw-schema';
import type { SearchRequest } from './request-schema';

export const SearchProductSchema = z.object({
  productUrn: z.string(),
  productId: z.string().nullable(),
  universalName: z.string().nullable(),
  productUrl: z.string().nullable(),
  name: z.string().nullable(),
  category: z.string().nullable(),
  // The company that makes the product.
  maker: z.string().nullable(),
  description: z.string().nullable(),
  // Comma-separated, as LinkedIn shows them.
  topFeatures: z.string().nullable(),
  integrations: z.string().nullable(),
  // Companies named on the "Used by …" line, and how many more there are.
  usedBy: z.array(
    z.object({
      companyUrn: z.string(),
      companyId: z.string().nullable(),
      name: z.string().nullable(),
      companyUrl: z.string().nullable(),
    }),
  ),
  usedByOthersCount: z.number().nullable(),
  logoUrl: z.string().nullable(),
});
export type SearchProduct = z.infer<typeof SearchProductSchema>;

export const SearchProductsSchema = z.object({
  products: z.array(SearchProductSchema),
  keyword: z.string(),
  totalResultCount: z.number().nullable(),
});
export type SearchProducts = z.infer<typeof SearchProductsSchema>;

/** Splits a "<category> by <maker>" subtitle. */
function splitCategoryMaker(text: string | null | undefined): {
  category: string | null;
  maker: string | null;
} {
  if (text == null) return { category: null, maker: null };
  const index = text.indexOf(' by ');
  if (index === -1) return { category: text.trim() || null, maker: null };
  return {
    category: text.slice(0, index).trim() || null,
    maker: text.slice(index + 4).trim() || null,
  };
}

/** Maps a product result card. */
export function buildSearchProduct(
  card: EntityResult,
  resolve: ResolveEntity,
): SearchProduct | null {
  const productUrn = extractEntityUrn(card.entityUrn, 'organizationalPage');
  if (productUrn == null) return null;
  const { category, maker } = splitCategoryMaker(card.primarySubtitle?.text);
  const universalName = extractPathSegment(card.navigationUrl, 'products');
  const lines = insightLines(card);
  const usedBy = extractUsedBy(card, resolve);

  return {
    productUrn,
    productId: extractTrailingId(productUrn),
    universalName,
    productUrl:
      universalName == null
        ? null
        : `${LINKEDIN_URL}/products/${universalName}/`,
    name: card.title?.text || null,
    category,
    maker,
    description: card.summary?.text || null,
    topFeatures: insightAfterPrefix(lines, 'Top Features: '),
    integrations: insightAfterPrefix(lines, 'Integrations: '),
    usedBy: usedBy.companies,
    usedByOthersCount: usedBy.othersCount,
    logoUrl: imageViewModelUrl(card.image),
  };
}

/** Searches software products by keyword. */
export async function searchProducts(
  request: SearchRequest,
): Promise<ScrapeResult<SearchProducts>> {
  const page = await searchEntities({
    resultType: 'PRODUCTS',
    request,
    buildCard: buildSearchProduct,
  });
  return mapFound(page, ({ items, totalResultCount }) => ({
    products: items,
    keyword: request.keyword,
    totalResultCount,
  }));
}
