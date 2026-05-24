import { UserRole } from './enums';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      userId?: string;
      userRole?: string;
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}
