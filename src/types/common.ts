import { UserRole } from './enums';

/**
 * Shared System Core Interfaces.
 * Establishes formal contracts for data transfer, pagination, and token schemas.
 */

/**
 * Standard Decoded Access Token Payload
 */
export interface IAccessTokenPayload {
  sub: string; // The userId
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Standard Decoded Refresh Token Payload
 */
export interface IRefreshTokenPayload {
  sub: string; // The userId
  iat: number;
  exp: number;
}

/**
 * Standard Pagination Parameters
 */
export interface IPaginationOptions {
  page: number;
  limit: number;
}

/**
 * Standard Pagination Response Metadata
 */
export interface IPaginationMetadata {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Standardized Paginated Payload Structure
 */
export interface IPaginatedResult<T> {
  data: T[];
  pagination: IPaginationMetadata;
}

/**
 * Standard Success API Response Envelope
 */
export interface ISuccessResponseEnvelope<T = unknown> {
  success: true;
  status_code: number;
  message: string;
  data: T;
  meta?: unknown;
  timestamp: string;
}

/**
 * Standard Error API Response Envelope
 */
export interface IErrorResponseEnvelope {
  success: false;
  status_code: number;
  message: string;
  correlation_id: string;
  errors: unknown;
  debug_info?: {
    file: string;
    function: string;
  };
  timestamp: string;
}
