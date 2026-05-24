import { Request, Response } from 'express';
import { AdService, IAdPayload } from '../services/ad.service';
import { ApiResponse } from '../utils/apiResponse';
import { createAdSchema, updateAdSchema } from '../validators/ad.validator';
import { ValidationError } from '../utils/AppError.util';
import { AdPlacement, AdDeviceTarget } from '../types/enums';

const FILE_NAME = 'ad.controller.ts';

export class AdController {
  /**
   * GET /api/v1/ads
   * If 'placement' is provided in query, acts as a public endpoint to fetch active ads for that slot.
   * If no query params are provided, it acts as an Admin endpoint returning all ads (requires auth middleware).
   */
  public static async getAds(req: Request, res: Response): Promise<void> {
    try {
      const { placement, device_target } = req.query;

      if (placement) {
        // Public request targeting a specific placement slot on the frontend
        const device = device_target ? (device_target as AdDeviceTarget) : AdDeviceTarget.ALL;
        const ads = await AdService.getForPlacement(placement as AdPlacement, device);
        ApiResponse.success(res, 200, 'Ads retrieved successfully.', ads);
        return;
      }

      // Admin request to view the entire Ad ecosystem
      const ads = await AdService.getAll();
      ApiResponse.success(res, 200, 'All ads retrieved successfully.', ads);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getAds');
    }
  }

  /**
   * POST /api/v1/ads
   * Creates a new AdUnit. Admin only.
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = createAdSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Map the snake_case API payload to the camelCase Service layer payload
      const payload: IAdPayload = {
        name: value.name,
        placement: value.placement,
        adScript: value.ad_script,
        deviceTarget: value.device_target,
        sortOrder: value.sort_order,
        isActive: value.is_active,
      };

      const ad = await AdService.create(payload);
      ApiResponse.success(res, 201, 'Ad created successfully.', ad);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'create');
    }
  }

  /**
   * PATCH /api/v1/ads/:id
   * Updates an existing AdUnit. Admin only.
   */
  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { error, value } = updateAdSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Map the snake_case API payload to the camelCase Service layer payload dynamically
      const payload: Partial<IAdPayload> = {};
      if (value.name !== undefined) payload.name = value.name;
      if (value.placement !== undefined) payload.placement = value.placement;
      if (value.ad_script !== undefined) payload.adScript = value.ad_script;
      if (value.device_target !== undefined) payload.deviceTarget = value.device_target;
      if (value.sort_order !== undefined) payload.sortOrder = value.sort_order;
      if (value.is_active !== undefined) payload.isActive = value.is_active;

      const ad = await AdService.update(id as string, payload);
      ApiResponse.success(res, 200, 'Ad updated successfully.', ad);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'update');
    }
  }

  /**
   * DELETE /api/v1/ads/:id
   * Permanently deletes an AdUnit. Admin only.
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await AdService.delete(id as string);
      ApiResponse.success(res, 200, 'Ad deleted successfully.');
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'delete');
    }
  }
}

export default AdController;
