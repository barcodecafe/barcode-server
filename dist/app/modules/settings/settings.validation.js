"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettingsValidationSchema = void 0;
const zod_1 = require("zod");
exports.updateSettingsValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        logoLight: zod_1.z.string().optional(),
        logoDark: zod_1.z.string().optional(),
        paymentBanner: zod_1.z.string().optional(),
        paymentBannerFit: zod_1.z.enum(['contain', 'cover']).optional(),
        footerDescription: zod_1.z.string().optional(),
        footerAddress: zod_1.z.string().optional(),
        footerPhone: zod_1.z.string().optional(),
        footerEmail: zod_1.z.string().optional(),
        footerFacebook: zod_1.z.string().optional(),
        footerInstagram: zod_1.z.string().optional(),
        footerTwitter: zod_1.z.string().optional(),
        // 🚚 Free Delivery Campaign Fields
        freeDeliveryEnabled: zod_1.z.boolean().optional(),
        freeDeliveryScope: zod_1.z.enum(['all', 'min_amount', 'categories', 'dishes', 'areas']).optional(),
        freeDeliveryMinOrder: zod_1.z.coerce.number().nonnegative().optional(),
        freeDeliveryCategories: zod_1.z.array(zod_1.z.string()).optional(),
        freeDeliveryDishIds: zod_1.z.array(zod_1.z.coerce.number()).optional(),
        freeDeliveryAreas: zod_1.z.array(zod_1.z.string()).optional(),
        freeDeliveryBannerText: zod_1.z.string().optional(),
        freeDeliveryShowBanner: zod_1.z.boolean().optional(),
        // 📢 Global Maintenance / Announcement Ticker Notice
        maintenanceNoticeEnabled: zod_1.z.boolean().optional(),
        maintenanceNoticeText: zod_1.z.string().optional(),
        // 🎁 Loyalty Rewards Settings
        loyaltyRedemptionEnabled: zod_1.z.boolean().optional(),
    }),
});
