/**
 * Shared System Enum Definitions.
 * Mirrors the authoritative PostgreSQL/Sequelize database ENUM types.
 */

export enum UserRole {
  SUPERADMIN = 'superadmin',
  EDITOR = 'editor',
}

export enum BlogStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export enum AdPlacement {
  HOME_TOP = 'HOME_TOP',
  HOME_MIDDLE = 'HOME_MIDDLE',
  HOME_BOTTOM = 'HOME_BOTTOM',
  SEARCH_TOP = 'SEARCH_TOP',
  SEARCH_INLINE = 'SEARCH_INLINE',
  SEARCH_BOTTOM = 'SEARCH_BOTTOM',
  BLOG_TOP = 'BLOG_TOP',
  BLOG_INLINE_1 = 'BLOG_INLINE_1',
  BLOG_INLINE_2 = 'BLOG_INLINE_2',
  BLOG_BOTTOM = 'BLOG_BOTTOM',
  BLOG_SIDEBAR = 'BLOG_SIDEBAR',
}

export enum AdDeviceTarget {
  ALL = 'all',
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  FATAL = 'FATAL',
}

export enum ErrorType {
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  THIRD_PARTY_ERROR = 'THIRD_PARTY_ERROR',
  OTHER = 'OTHER',
}
