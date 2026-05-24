import { imageConfig } from '../config/image.config';

/**
 * Builds the public CDN URL for a given GitHub file path.
 * Maps back to the jsDelivr CDN endpoint configuration.
 */
export const buildCdnUrl = (githubPath: string): string => {
  const base = imageConfig.storage.cdnBaseUrl.replace(/\/$/, '');
  const cleanPath = githubPath.replace(/^\//, '');
  return `${base}/${cleanPath}`;
};

export default buildCdnUrl;
