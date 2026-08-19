import { z } from 'zod';

export const updateSettingsValidationSchema = z.object({
  body: z.object({
    logoLight: z.string().optional(),
    logoDark: z.string().optional(),
    paymentBanner: z.string().optional(),
    paymentBannerFit: z.enum(['contain', 'cover']).optional(),
    footerDescription: z.string().optional(),
    footerAddress: z.string().optional(),
    footerPhone: z.string().optional(),
    footerEmail: z.string().optional(),
    footerFacebook: z.string().optional(),
    footerInstagram: z.string().optional(),
    footerTwitter: z.string().optional(),

    // 🚚 Free Delivery Campaign Fields
    freeDeliveryEnabled: z.boolean().optional(),
    freeDeliveryScope: z.enum(['all', 'min_amount', 'categories', 'dishes', 'areas']).optional(),
    freeDeliveryMinOrder: z.coerce.number().nonnegative().optional(),
    freeDeliveryCategories: z.array(z.string()).optional(),
    freeDeliveryDishIds: z.array(z.coerce.number()).optional(),
    freeDeliveryAreas: z.array(z.string()).optional(),
    freeDeliveryBannerText: z.string().optional(),
    freeDeliveryShowBanner: z.boolean().optional(),

    // 📢 Global Maintenance / Announcement Ticker Notice
    maintenanceNoticeEnabled: z.boolean().optional(),
    maintenanceNoticeText: z.string().optional(),
  }),
});
