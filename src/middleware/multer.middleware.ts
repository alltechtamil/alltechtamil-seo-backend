import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { AppError } from '../utils/AppError.util';
import { UPLOAD_LIMITS } from '../config/constants';

// 1. Configure memory storage to keep file buffers stateless (strictly no disk writes)
const storage = multer.memoryStorage();

// 2. Configure the file mime-type constraint filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (req) {
    // Reference parameter cleanly to satisfy strict unused parameter checks
  }
  if (UPLOAD_LIMITS.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const allowedExtensions = UPLOAD_LIMITS.ALLOWED_MIME_TYPES.map((type) => type.split('/')[1].toUpperCase()).join(
      ', '
    );
    cb(
      new AppError(
        400,
        'INVALID_FILE_TYPE',
        `Invalid file type: ${file.mimetype}. Only ${allowedExtensions} images are allowed.`
      )
    );
  }
};

// 3. Configure and Instantiate Multer with limits
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: UPLOAD_LIMITS.MAX_IMAGE_SIZE_BYTES, // Dynamic size limit mapped from env/constants
  },
});

/**
 * Standard Single Image Uploader Middleware.
 * Expects the multipart/form-data field name to be 'image'.
 */
export const uploadSingleImage = upload.single('image');
