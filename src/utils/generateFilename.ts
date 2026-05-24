import crypto from 'crypto';

/**
 * Generates a unique filename for uploaded images.
 * Format: {timestamp}-{random_hex}.webp
 */
export const generateFilename = (): string => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(6).toString('hex');
  return `${timestamp}-${randomBytes}.webp`;
};

/**
 * Generates a structured storage path for uploaded images.
 * Format: posts/{YYYY}/{MM}/{blog-slug || 'general'}/
 */
export const generateStoragePath = (blogSlug?: string | null): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const slug = blogSlug ? blogSlug.trim() : 'general';
  return `posts/${year}/${month}/${slug}/`;
};

export default generateFilename;
