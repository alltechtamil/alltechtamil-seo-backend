import { PAGINATION } from '../config/constants';

/**
 * Sequelize query fragment returned by buildPaginationQuery.
 * Drop this directly into findAndCountAll({ ...paginationQuery }).
 */
export interface IPaginationQuery {
  limit: number;
  offset: number;
}

/**
 * Pagination metadata shape returned by buildPaginationMeta.
 * Passed as the `meta` argument to ApiResponse.success().
 */
export interface IPaginationMeta {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Number of records per page */
  perPage: number;
  /** Total number of matching records across all pages */
  totalCount: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether a previous page exists */
  hasPrevPage: boolean;
  /** Whether a next page exists */
  hasNextPage: boolean;
}

/**
 * Sanitises raw page and limit query parameters and returns a Sequelize-ready
 * { limit, offset } object for use with findAndCountAll().
 *
 * - Coerces string inputs to integers safely.
 * - Falls back to PAGINATION.DEFAULT_PAGE / DEFAULT_LIMIT if values are missing,
 *   zero, or non-numeric.
 * - Clamps limit to a maximum of PAGINATION.MAX_LIMIT to prevent abusive queries.
 *
 * @param rawPage  - Raw page value from req.query (string | number | undefined)
 * @param rawLimit - Raw limit value from req.query (string | number | undefined)
 * @returns IPaginationQuery with safe limit and computed offset
 */
export const buildPaginationQuery = (rawPage?: string | number, rawLimit?: string | number): IPaginationQuery => {
  const page = Math.max(1, parseInt(String(rawPage ?? PAGINATION.DEFAULT_PAGE), 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(String(rawLimit ?? PAGINATION.DEFAULT_LIMIT), 10) || PAGINATION.DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;

  return { limit, offset };
};

/**
 * Builds the standard pagination metadata block for API responses.
 * Pass the result directly as the `meta` argument to ApiResponse.success().
 *
 * @param totalCount - Total number of matching records (from Sequelize count)
 * @param page       - Current sanitised page number (from buildPaginationQuery input)
 * @param limit      - Current sanitised per-page limit (from buildPaginationQuery input)
 * @returns IPaginationMeta structured metadata object
 */
export const buildPaginationMeta = (totalCount: number, page: number, limit: number): IPaginationMeta => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const totalPages = Math.ceil(totalCount / safeLimit);

  return {
    currentPage: safePage,
    perPage: safeLimit,
    totalCount,
    totalPages,
    hasPrevPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  };
};

export default { buildPaginationQuery, buildPaginationMeta };
