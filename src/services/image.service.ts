import sharp from 'sharp';
import GitHubService from './github.service';
import CdnService from './cdn.service';
import { imageConfig } from '../config/image.config';
import { generateFilename, generateStoragePath } from '../utils/generateFilename';
import { Image } from '../models/Image';
import { AppError } from '../utils/AppError.util';
import logger from '../utils/logger';
import { IPaginationQuery, IPaginationMeta, buildPaginationMeta } from '../utils/paginate';

/**
 * Service to orchestrate the complete Image upload and optimization pipeline.
 * Performs validation, Sharp image conversion (WebP), remote repository upload,
 * CDN compilation, and local database record registration.
 */
export class ImageService {
  /**
   * Processes a raw image file buffer, optimizes it using Sharp,
   * uploads it to GitHub, and persists a metadata record in the database.
   */
  public static async processAndUpload(
    file: Express.Multer.File,
    blogId: string | null = null,
    altText: string | null = null,
    uploaderId: string
  ): Promise<Image> {
    // 1. Validate file presence
    if (!file || !file.buffer) {
      throw new AppError(400, 'MISSING_FILE', 'No image file buffer provided for upload.');
    }

    // 2. Validate MIME Type and File Size bounds
    if (!imageConfig.upload.allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        `Unsupported media type: ${file.mimetype}. Allowed types: ${imageConfig.upload.allowedMimeTypes.join(', ')}`
      );
    }
    if (file.size > imageConfig.upload.maxSizeBytes) {
      const maxMb = (imageConfig.upload.maxSizeBytes / (1024 * 1024)).toFixed(1);
      throw new AppError(
        413,
        'PAYLOAD_TOO_LARGE',
        `Image size exceeds maximum limit of ${maxMb}MB (Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`
      );
    }

    // 3. Determine Storage Folder Structure (slugify blog title dynamic fallback query)
    let blogSlug: string | null = null;
    if (blogId) {
      try {
        const queryResult = (await Image.sequelize?.query('SELECT slug FROM blogs WHERE id = :blogId LIMIT 1', {
          replacements: { blogId },
          type: 'SELECT',
        })) as { slug: string }[] | undefined;
        if (queryResult && queryResult.length > 0) {
          blogSlug = queryResult[0].slug;
        }
      } catch (dbErr) {
        logger.warn(`Could not fetch blog slug for blogId ${blogId}: ${(dbErr as Error).message}`);
      }
    }

    const filename = generateFilename();
    const storagePath = generateStoragePath(blogSlug);
    const filePath = `${storagePath}${filename}`;

    logger.info(`📸 Processing image for upload. Target Path: ${filePath}`);

    try {
      // 4. Sharp Image Process (Auto-orient EXIF, Resize to max 1600px width, Strip metadata, WebP compression quality 82)
      let sharpInstance = sharp(file.buffer).rotate();

      // Resize maintaining aspect ratio only if image width exceeds max processing boundary
      sharpInstance = sharpInstance.resize({
        width: imageConfig.processing.maxWidth,
        fit: 'inside',
        withoutEnlargement: true,
      });

      // Output processed container
      const processedBuffer = await sharpInstance
        .webp({ quality: 82 }) // Convert to webp with quality 82
        .toBuffer();

      // Extract output metadata dimensions and file size
      const processedMeta = await sharp(processedBuffer).metadata();
      const width = processedMeta.width || 0;
      const height = processedMeta.height || 0;
      const fileSizeBytes = processedBuffer.length;

      // 5. Upload base64 stream to remote GitHub Repository
      const base64Content = processedBuffer.toString('base64');
      logger.info(`📦 Uploading optimized asset to GitHub repository...`);
      await GitHubService.uploadFile(filePath, base64Content, `upload: ${filePath}`);

      // 6. Generate jsDelivr CDN URL
      const cdnUrl = CdnService.generateUrl(filePath);
      logger.info(`✅ CDN Endpoint Compiled: ${cdnUrl}`);

      // 7. Register and persist Image metadata record in database
      const dbImage = await Image.create({
        blogId: blogId || null,
        githubPath: filePath,
        cdnUrl,
        width,
        height,
        fileSizeBytes,
        mimeType: 'image/webp',
        altText: altText || null,
        uploadedBy: uploaderId,
      });

      return dbImage;
    } catch (err: unknown) {
      const errorMsg = (err as Error).message;
      logger.error(`❌ Image pipeline upload failed: ${errorMsg}`);
      throw err;
    }
  }
  /**
   * Retrieves all images associated with a specific blog ID.
   */
  public static async getByBlogId(blogId: string): Promise<Image[]> {
    try {
      const images = await Image.findAll({
        where: { blogId },
        order: [['createdAt', 'DESC']],
      });
      return images;
    } catch (error) {
      logger.error(`ImageService.getByBlogId Error: ${(error as Error).message}`, { blogId });
      throw error;
    }
  }

  /**
   * Retrieves all images in a paginated list.
   */
  public static async getAll(
    pagination: IPaginationQuery,
    page: number
  ): Promise<{ rows: Image[]; count: number; meta: IPaginationMeta }> {
    try {
      const { rows, count } = await Image.findAndCountAll({
        limit: pagination.limit,
        offset: pagination.offset,
        order: [['createdAt', 'DESC']],
      });

      const meta = buildPaginationMeta(count, page, pagination.limit);

      return { rows, count, meta };
    } catch (error) {
      logger.error(`ImageService.getAll Error: ${(error as Error).message}`, { pagination, page });
      throw error;
    }
  }

  /**
   * Deletes an image record from the database.
   * Note: This does not currently delete the file from the remote GitHub repository
   * to preserve historic CDN caching and minimize destructive operations.
   */
  public static async delete(id: string): Promise<void> {
    try {
      const image = await Image.findByPk(id);
      if (!image) {
        throw new AppError(404, 'NOT_FOUND', `Image with ID '${id}' not found.`);
      }

      await image.destroy();
      logger.info(`✅ Image DB record deleted successfully: ${id}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`ImageService.delete DB Error: ${(error as Error).message}`, { id });
      throw error;
    }
  }
}

export default ImageService;
