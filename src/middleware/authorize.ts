import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError.util';
import logger from '../utils/logger';

/**
 * Authorize Middleware Factory
 *
 * Returns an Express middleware that restricts route access to users whose
 * role is included in the provided list. Must be used AFTER the authenticate
 * middleware, which is responsible for populating req.user.
 *
 * Usage:
 *   router.delete('/post/:id', authenticate, authorize('superadmin'), BlogController.delete);
 *   router.put('/post/:id',    authenticate, authorize('superadmin', 'editor'), BlogController.update);
 *
 * @param roles - One or more role strings permitted to access the route
 * @returns Express RequestHandler that enforces RBAC
 */
export const authorize =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    // req.user must have been attached by authenticate — guard defensively
    if (!req.user?.id) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `[authorize] Access denied — user ${req.user.id} has role "${req.user.role}" but route requires one of: [${roles.join(', ')}]`
      );
      return next(new ForbiddenError('You do not have permission to perform this action.'));
    }

    next();
  };

export default authorize;
