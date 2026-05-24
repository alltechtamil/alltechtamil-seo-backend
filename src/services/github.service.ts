import axios from 'axios';
import { imageConfig } from '../config/image.config';
import { UpstreamError } from '../utils/AppError.util';
import logger from '../utils/logger';

/**
 * Service to orchestrate file operations directly on the upstream GitHub repository
 * using the GitHub Contents REST API.
 */
export class GitHubService {
  /**
   * Uploads a file to the GitHub repository using the contents API.
   * Handles conflicts (HTTP 422) by fetching a fresh SHA and retrying once.
   */
  public static async uploadFile(
    filePath: string,
    base64Content: string,
    commitMessage: string
  ): Promise<{ download_url: string; sha: string }> {
    const { owner, repo, branch } = imageConfig.storage;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    const executeUpload = async (sha: string | null): Promise<{ download_url: string; sha: string }> => {
      const payload: { message: string; content: string; branch: string; sha?: string } = {
        message: commitMessage,
        content: base64Content,
        branch,
      };
      if (sha) {
        payload.sha = sha;
      }

      try {
        const response = await axios.put(url, payload, {
          headers: imageConfig.getHeaders(),
        });
        return {
          download_url: response.data.content.download_url as string,
          sha: response.data.content.sha as string,
        };
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 422) {
            throw error; // Re-throw to trigger fresh SHA retry
          }
          const msg = (error.response?.data as { message?: string })?.message || error.message;
          throw new UpstreamError(`GitHub Upload Failed: ${msg}`, error);
        }
        throw new UpstreamError(`GitHub Upload Failed: ${(error as Error).message}`, error);
      }
    };

    try {
      // 1. Check if file already exists to get SHA via centralized helper
      const sha = await imageConfig.getFileSha(filePath);
      // 2. Attempt primary upload
      return await executeUpload(sha);
    } catch (error: unknown) {
      // Handle conflict 422 retry
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        logger.warn(`Conflict detected during upload to "${filePath}". Fetching fresh SHA and retrying...`);
        const freshSha = await imageConfig.getFileSha(filePath);
        return await executeUpload(freshSha);
      }
      throw error;
    }
  }

  /**
   * Deletes a file from the GitHub repository using the contents API.
   */
  public static async deleteFile(filePath: string, sha: string, commitMessage: string): Promise<void> {
    const { owner, repo, branch } = imageConfig.storage;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    try {
      await axios.delete(url, {
        headers: imageConfig.getHeaders(),
        data: {
          message: commitMessage,
          sha,
          branch,
        },
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const msg = (error.response?.data as { message?: string })?.message || error.message;
        throw new UpstreamError(`GitHub Delete Failed: ${msg}`, error);
      }
      throw new UpstreamError(`GitHub Delete Failed: ${(error as Error).message}`, error);
    }
  }
}

export default GitHubService;
