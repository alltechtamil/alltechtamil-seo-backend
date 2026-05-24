/**
 * Calculates the estimated reading time of HTML content in minutes.
 * Uses a standard baseline of 200 words per minute.
 * @param htmlContent Raw HTML content string
 * @returns Reading time in minutes (minimum 1 minute if content is present)
 */
export const calculateReadTime = (htmlContent: string): number => {
  if (!htmlContent) return 0;

  // Strip HTML tags
  const cleanText = htmlContent.replace(/<[^>]*>/g, ' ');

  // Normalize spaces and split by whitespace to count words
  const words = cleanText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount === 0) return 0;

  const wordsPerMinute = 200;
  const readTime = Math.ceil(wordCount / wordsPerMinute);

  return readTime;
};

export default calculateReadTime;
