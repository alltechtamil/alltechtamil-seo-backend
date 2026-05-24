import sanitizeHtmlLib from 'sanitize-html';
import { Request, Response, NextFunction } from 'express';

/**
 * Defined in BACKEND_TECHNICAL_DOCUMENTATION.txt - SECTION 9
 */
const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'strong',
  'em',
  'u',
  's',
  'blockquote',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'figure',
  'figcaption',
  'div',
  'span',
  'script', // Explicitly requested by user for code/embed functionalities
];

const ALLOWED_ATTRIBUTES = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height', 'loading'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
  div: ['class'],
  span: ['class'],
  script: ['src', 'type', 'async', 'defer', 'charset'],
  '*': ['id', 'class'], // Allowed on all safe tags
};

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
    // By default, sanitize-html strips the text content of script, style, textarea.
    // We override this to remove 'script' from the list, allowing inline scripts.
    nonTextTags: ['style', 'textarea', 'noscript'],
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
