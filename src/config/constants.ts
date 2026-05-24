import { config } from './env.config';
import { UserRole, BlogStatus, AdPlacement, AdDeviceTarget, ErrorSeverity, ErrorType } from '../types/enums';

/**
 * Global Cryptographic & Security Constants
 */
export const SECURITY = {
  SALT_ROUNDS: 12,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 100,
};

/**
 * Image Upload Constraints
 */
export const UPLOAD_LIMITS = {
  MAX_IMAGE_SIZE_BYTES: config.uploads.maxSizeBytes,
  ALLOWED_MIME_TYPES: config.uploads.allowedMimeTypes,
};

/**
 * Centralized Rate Limiting Profiles
 */
export const RATE_LIMITS = {
  GLOBAL: {
    windowMs: config.rateLimits.global.windowMs,
    max: config.rateLimits.global.max,
  },
  AUTH: {
    windowMs: config.rateLimits.auth.windowMs,
    max: config.rateLimits.auth.max,
  },
  UPLOADS: {
    windowMs: 60 * 60 * 1000, // 60 minutes
    max: 30,
  },
  SEARCH: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
  },
};

/**
 * Standard Pagination Constants
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

/**
 * User Authorization Roles (As defined in DATABASE_DESIGN.txt)
 */
export const ROLES = {
  SUPERADMIN: UserRole.SUPERADMIN,
  EDITOR: UserRole.EDITOR,
} as const;

export type UserRoleType = UserRole;

/**
 * Blog Post Status Definitions (As defined in DATABASE_DESIGN.txt)
 */
export const POST_STATUS = {
  DRAFT: BlogStatus.DRAFT,
  PUBLISHED: BlogStatus.PUBLISHED,
} as const;

export type PostStatusType = BlogStatus;

/**
 * JWT Cookie Life Constants (Calculated in milliseconds)
 */
export const COOKIE_EXPIRY = {
  ACCESS_TOKEN_MS: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Ad scripts placement targets (As defined in DATABASE_DESIGN.txt)
 */
export const AD_PLACEMENTS = {
  HOME_TOP: AdPlacement.HOME_TOP,
  HOME_MIDDLE: AdPlacement.HOME_MIDDLE,
  HOME_BOTTOM: AdPlacement.HOME_BOTTOM,
  SEARCH_TOP: AdPlacement.SEARCH_TOP,
  SEARCH_INLINE: AdPlacement.SEARCH_INLINE,
  SEARCH_BOTTOM: AdPlacement.SEARCH_BOTTOM,
  BLOG_TOP: AdPlacement.BLOG_TOP,
  BLOG_INLINE_1: AdPlacement.BLOG_INLINE_1,
  BLOG_INLINE_2: AdPlacement.BLOG_INLINE_2,
  BLOG_BOTTOM: AdPlacement.BLOG_BOTTOM,
  BLOG_SIDEBAR: AdPlacement.BLOG_SIDEBAR,
} as const;

export type AdPlacementType = AdPlacement;

/**
 * Ad targeted device enums
 */
export const AD_DEVICE_TARGET = {
  ALL: AdDeviceTarget.ALL,
  DESKTOP: AdDeviceTarget.DESKTOP,
  MOBILE: AdDeviceTarget.MOBILE,
} as const;

export type AdDeviceTargetType = AdDeviceTarget;

/**
 * Error logging severities (As defined in DATABASE_DESIGN.txt)
 */
export const ERROR_SEVERITY = {
  LOW: ErrorSeverity.LOW,
  MEDIUM: ErrorSeverity.MEDIUM,
  HIGH: ErrorSeverity.HIGH,
  CRITICAL: ErrorSeverity.CRITICAL,
  FATAL: ErrorSeverity.FATAL,
} as const;

export type ErrorSeverityType = ErrorSeverity;

/**
 * Error logging classification categories (As defined in DATABASE_DESIGN.txt)
 */
export const ERROR_TYPE = {
  SERVER_ERROR: ErrorType.SERVER_ERROR,
  DATABASE_ERROR: ErrorType.DATABASE_ERROR,
  RATE_LIMIT_ERROR: ErrorType.RATE_LIMIT_ERROR,
  THIRD_PARTY_ERROR: ErrorType.THIRD_PARTY_ERROR,
  OTHER: ErrorType.OTHER,
} as const;

export type ErrorTypeType = ErrorType;

/**
 * Database Tables VARCHAR Field Parity Constraints (Strict Parity with DATABASE_DESIGN.txt)
 */
export const DB_CONSTRAINTS = {
  USER: {
    MAX_NAME: 100,
    MAX_EMAIL: 255,
    MAX_PASSWORD_HASH: 255,
    MAX_AVATAR_URL: 500,
  },
  CATEGORY: {
    MAX_NAME: 100,
    MAX_SLUG: 120,
    MAX_META_TITLE: 160,
    MAX_META_DESCRIPTION: 320,
  },
  TAG: {
    MAX_NAME: 100,
    MAX_SLUG: 120,
  },
  BLOG: {
    MAX_TITLE: 300,
    MAX_SLUG: 320,
    MAX_SEO_TITLE: 160,
    MAX_SEO_DESCRIPTION: 320,
    MAX_CANONICAL_URL: 500,
    MAX_FOCUS_KEYWORD: 100,
    MAX_OG_IMAGE_URL: 500,
    MAX_OG_TITLE: 160,
    MAX_OG_DESCRIPTION: 320,
  },
  IMAGE: {
    MAX_GITHUB_PATH: 500,
    MAX_CDN_URL: 500,
    MAX_MIME_TYPE: 50,
    MAX_ALT_TEXT: 300,
  },
  AD_UNIT: {
    MAX_NAME: 150,
  },
  ERROR_LOG: {
    MAX_CORRELATION_ID: 50,
    MAX_ERROR_CODE: 50,
    MAX_FILE_NAME: 255,
    MAX_FUNCTION_NAME: 255,
    MAX_REQUEST_URL: 500,
    MAX_REQUEST_METHOD: 10,
    MAX_IP_ADDRESS: 45,
  },
};
