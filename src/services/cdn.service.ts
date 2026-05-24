import { buildCdnUrl } from '../utils/buildCdnUrl';

/**
 * Service to manage public Content Delivery Network assets and locations.
 */
export class CdnService {
  /**
   * Generates a public CDN delivery URL for a given GitHub repository relative path.
   * @param githubPath Relative storage path in the repository
   * @returns Public CDN URL string
   */
  public static generateUrl(githubPath: string): string {
    return buildCdnUrl(githubPath);
  }
}

export default CdnService;
