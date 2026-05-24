import { Op } from 'sequelize';
import { AdUnit, IAdUnitCreationAttributes } from '../models/AdUnit';
import { NotFoundError } from '../utils/AppError.util';
import { AdPlacement, AdDeviceTarget } from '../types/enums';
import logger from '../utils/logger';

export interface IAdPayload {
  name: string;
  placement: AdPlacement;
  adScript: string;
  deviceTarget?: AdDeviceTarget;
  isActive?: boolean;
  sortOrder?: number;
}

export class AdService {
  /**
   * Retrieves active ad units for a specific placement and device target.
   * Public-facing method optimized for frontend injection.
   *
   * @param placement The target layout placement
   * @param device The requesting client device (mobile, desktop, all)
   * @returns Array of active AdUnits sorted by sortOrder
   */
  public static async getForPlacement(
    placement: AdPlacement,
    device: AdDeviceTarget = AdDeviceTarget.ALL
  ): Promise<AdUnit[]> {
    try {
      // If device is strictly MOBILE or DESKTOP, we still want to pull ads marked for ALL.
      const validTargets = [AdDeviceTarget.ALL];
      if (device !== AdDeviceTarget.ALL) {
        validTargets.push(device);
      }

      return await AdUnit.findAll({
        where: {
          placement,
          deviceTarget: {
            [Op.in]: validTargets,
          },
          isActive: true,
        },
        order: [['sortOrder', 'ASC']],
      });
    } catch (error) {
      logger.error(`AdService.getForPlacement DB Error: ${(error as Error).message}`, { error, placement, device });
      throw error;
    }
  }

  /**
   * Retrieves all ad units across the system, regardless of active status.
   * Admin-facing method for dashboard administration.
   */
  public static async getAll(): Promise<AdUnit[]> {
    try {
      return await AdUnit.findAll({
        order: [
          ['placement', 'ASC'],
          ['sortOrder', 'ASC'],
          ['createdAt', 'DESC'],
        ],
      });
    } catch (error) {
      logger.error(`AdService.getAll DB Error: ${(error as Error).message}`, { error });
      throw error;
    }
  }

  /**
   * Creates a new Ad Unit in the database.
   */
  public static async create(payload: IAdPayload): Promise<AdUnit> {
    try {
      const data: IAdUnitCreationAttributes = {
        name: payload.name,
        placement: payload.placement,
        adScript: payload.adScript,
        deviceTarget: payload.deviceTarget ?? AdDeviceTarget.ALL,
        isActive: payload.isActive ?? true,
        sortOrder: payload.sortOrder ?? 0,
      };

      const ad = await AdUnit.create(data);
      logger.info(`✅ AdUnit [${ad.id}] created for placement [${ad.placement}].`);
      return ad;
    } catch (error) {
      logger.error(`AdService.create DB Error: ${(error as Error).message}`, { error, payload });
      throw error;
    }
  }

  /**
   * Updates an existing Ad Unit by ID.
   */
  public static async update(id: string, payload: Partial<IAdPayload>): Promise<AdUnit> {
    try {
      const ad = await AdUnit.findByPk(id);
      if (!ad) {
        throw new NotFoundError(`AdUnit with ID '${id}' not found.`);
      }

      const dataToUpdate: Partial<IAdUnitCreationAttributes> = {};
      if (payload.name !== undefined) dataToUpdate.name = payload.name;
      if (payload.placement !== undefined) dataToUpdate.placement = payload.placement;
      if (payload.adScript !== undefined) dataToUpdate.adScript = payload.adScript;
      if (payload.deviceTarget !== undefined) dataToUpdate.deviceTarget = payload.deviceTarget;
      if (payload.isActive !== undefined) dataToUpdate.isActive = payload.isActive;
      if (payload.sortOrder !== undefined) dataToUpdate.sortOrder = payload.sortOrder;

      await ad.update(dataToUpdate);
      logger.info(`✅ AdUnit [${ad.id}] successfully updated.`);
      return ad;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error(`AdService.update DB Error: ${(error as Error).message}`, { error, id, payload });
      throw error;
    }
  }

  /**
   * Permanently deletes an Ad Unit from the database.
   */
  public static async delete(id: string): Promise<void> {
    try {
      const ad = await AdUnit.findByPk(id);
      if (!ad) {
        throw new NotFoundError(`AdUnit with ID '${id}' not found.`);
      }

      await ad.destroy();
      logger.info(`🗑️ AdUnit [${id}] permanently deleted from system.`);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error(`AdService.delete DB Error: ${(error as Error).message}`, { error, id });
      throw error;
    }
  }
}

export default AdService;
