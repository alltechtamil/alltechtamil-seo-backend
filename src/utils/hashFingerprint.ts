import crypto from 'crypto';

/**
 * Generates a one-way cryptographic hash to track unique visitors while maintaining privacy.
 * Uses SHA-256 to hash the combination of IP, User-Agent, Blog ID, and Date.
 * This guarantees that a user reading a blog multiple times in one day only registers as 1 unique visitor,
 * without ever storing their actual IP or User-Agent directly in the database.
 *
 * @param ip - The client's IP address
 * @param userAgent - The client's browser User-Agent string
 * @param blogId - The UUID of the blog post being viewed
 * @param dateString - The current date in YYYY-MM-DD format (to ensure daily uniqueness)
 * @returns A 64-character SHA-256 hex string
 */
export const generateVisitorHash = (ip: string, userAgent: string, blogId: string, dateString: string): string => {
  const safeIp = ip || 'unknown-ip';
  const safeUserAgent = userAgent || 'unknown-ua';
  const safeBlogId = blogId || 'unknown-blog';
  const safeDate = dateString || new Date().toISOString().split('T')[0];

  const rawString = `${safeIp}|${safeUserAgent}|${safeBlogId}|${safeDate}`;

  return crypto.createHash('sha256').update(rawString).digest('hex');
};

export default generateVisitorHash;
