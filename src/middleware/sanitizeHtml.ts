import sanitizeHtmlLib from 'sanitize-html';
import { Request, Response, NextFunction } from 'express';

/**
 * Defined in BACKEND_TECHNICAL_DOCUMENTATION.txt - SECTION 9
 */
// We allow all tags and attributes since only trusted admins write blogs
const ALLOWED_TAGS: false = false;
const ALLOWED_ATTRIBUTES: false = false;

/**
 * Direct utility function for sanitizing raw HTML strings.
 * Strips all dangerous tags (scripts, iframes, forms, etc).
 * Forces rel="noopener noreferrer" on all links for security.
 *
 * @param dirtyHtml - The raw, potentially unsafe HTML string
 * @returns Clean, safe HTML string
 */
export const sanitizeHtml = (dirtyHtml: string): string => {
  if (!dirtyHtml) return '';

  return sanitizeHtmlLib(dirtyHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    // Disallow protocols like javascript: in hrefs
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
      script: ['http', 'https'],
    },
    // Do not strip text from any tags
    nonTextTags: [],
    // Force specific attributes on links to prevent tab-nabbing
    transformTags: {
      a: sanitizeHtmlLib.simpleTransform('a', {
        target: '_blank',
        rel: 'noopener noreferrer',
      }),
    },
  });
};

/**
 * Express middleware to automatically sanitize 'content_html' in req.body.
 * Should be placed before controllers that accept blog content.
 */
export const sanitizeHtmlMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body.content_html === 'string') {
    req.body.content_html = sanitizeHtml(req.body.content_html);
  }
  next();
};

export default { sanitizeHtml, sanitizeHtmlMiddleware };
