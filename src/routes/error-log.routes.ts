import { Router } from 'express';
import { ErrorLogController } from '../controllers/error-log.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { deleteBulkErrorLogsSchema } from '../validators/error-log.validator';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

// Secure all error-log routes behind superadmin authentication and authorization guards
router.use(authenticate, authorize('superadmin'));

/**
 * @route   GET /api/v1/admin/error-logs
 * @desc    Retrieve a paginated list of all system error logs
 * @access  Private (superadmin only)
 */
router.get('/', ErrorLogController.getAll);

/**
 * @route   DELETE /api/v1/admin/error-logs
 * @desc    Purge all persisted error logs from the database
 * @access  Private (superadmin only)
 */
router.delete('/', ErrorLogController.deleteAll);

/**
 * @route   POST /api/v1/admin/error-logs/bulk-delete
 * @desc    Selective bulk-delete of error logs by UUID list
 * @access  Private (superadmin only)
 */
router.post(
  '/bulk-delete',
  validateRequest({ body: deleteBulkErrorLogsSchema }),
  ErrorLogController.deleteBulk
);

export default router;
