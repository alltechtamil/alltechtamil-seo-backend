import axios from 'axios';
import { config } from './env.config';
import logger from '../utils/logger';
import { UpstreamError } from '../utils/AppError.util';

/**
 * Interface representing the detailed response from a successful repository fetch.
 */
export interface GitHubRepoDetails {
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
    [key: string]: boolean | undefined;
  };
}

/**
 * Image Pipeline Configuration
 * Centralizes all constants and credentials for Sharp processing, size boundaries, allowed MIME types,
 * GitHub contents storage API, and jsDelivr CDN mapping.
 */
export const imageConfig = {
  /**
   * Upstream storage provider configurations (GitHub contents API repository details)
   */
  storage: {
    token: config.github.token,
    owner: config.github.owner,
    repo: config.github.repo,
    branch: config.github.branch,
    cdnBaseUrl: config.jsdelivr.base,
  },

  /**
   * Upload payload constraints matching standard platform limits
   */
  upload: {
    maxSizeBytes: config.uploads.maxSizeBytes,
    allowedMimeTypes: config.uploads.allowedMimeTypes,
  },

  /**
   * Sharp resizing and optimization parameters
   */
  processing: {
    maxWidth: 1600, // standard maximum width for high-DPI desktop displays
    quality: 80, // optimal balance of compression vs artifact suppression
    format: 'webp' as const, // modern web container format
    stripMetadata: true, // strips EXIF, ICC profiles, and GPS coordinates for anonymity and file size savings
  },

  /**
   * Constructs the standard request headers for the GitHub API.
   */
  getHeaders: (): { Authorization: string; Accept: string; 'User-Agent': string } => {
    const { token } = imageConfig.storage;
    return {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'AllTechTamil-Blogger-Backend',
    };
  },

  /**
   * Fetches the SHA of an existing file in the GitHub repository.
   * Returns null if the file does not exist.
   */
  getFileSha: async (filePath: string): Promise<string | null> => {
    const { owner, repo, branch } = imageConfig.storage;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;

    try {
      const response = await axios.get(url, {
        headers: imageConfig.getHeaders(),
      });
      return response.data.sha as string;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw new UpstreamError(`Failed to fetch file details from GitHub Contents API`, error);
    }
  },

  /**
   * Verifies the configuration credentials and permissions against the GitHub REST API.
   * Useful for startup validation, healthchecks, and CLI diagnostic tools.
   */
  testConnection: async (): Promise<{ success: boolean; message: string; details?: GitHubRepoDetails }> => {
    const { owner, repo } = imageConfig.storage;
    const url = `https://api.github.com/repos/${owner}/${repo}`;

    try {
      const response = await axios.get(url, {
        headers: imageConfig.getHeaders(),
        timeout: 10000, // 10s maximum timeout
      });

      if (response.status === 200) {
        return {
          success: true,
          message: `✅ GitHub connection verified. Repository "${owner}/${repo}" is accessible.`,
          details: {
            fullName: response.data.full_name as string,
            isPrivate: response.data.private as boolean,
            defaultBranch: response.data.default_branch as string,
            permissions: response.data.permissions as GitHubRepoDetails['permissions'],
          },
        };
      }

      return {
        success: false,
        message: `Failed with unexpected status: ${response.status}`,
      };
    } catch (error: unknown) {
      let reason = 'Network error';
      let statusText = '';

      if (axios.isAxiosError(error)) {
        reason = (error.response?.data as { message?: string })?.message || error.message || 'Network error';
        const status = error.response?.status;
        statusText = status ? ` (HTTP ${status})` : '';
      } else if (error instanceof Error) {
        reason = error.message;
      }

      logger.error(`❌ GitHub connection verification failed for "${owner}/${repo}": ${reason}${statusText}`);

      return {
        success: false,
        message: `Connection failed: ${reason}${statusText}`,
      };
    }
  },
};

export default imageConfig;
