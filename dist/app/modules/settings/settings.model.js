"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = exports.DEFAULT_SETTINGS = void 0;
const mongoose_1 = require("mongoose");
exports.DEFAULT_SETTINGS = {
    logoLight: '',
    logoDark: '',
    paymentBanner: '',
    paymentBannerFit: 'contain',
    footerDescription: 'Experience the art of modern dining at Barcode. We blend culinary innovation with premium atmospheres across all our branches.',
    footerAddress: 'Head Office: N. Muhammad Engineering Industries Ltd, 220/250 Paschim Sholoshahar, CDA Avenue, Muradpur, Chattogram-4212',
    footerPhone: '09642-140140',
    footerEmail: 'contact@barcoderestaurant.com',
    footerFacebook: 'https://facebook.com',
    footerInstagram: 'https://instagram.com',
    footerTwitter: 'https://twitter.com',
    // 🚚 Free Delivery Campaign Defaults
    freeDeliveryEnabled: false,
    freeDeliveryScope: 'all',
    freeDeliveryMinOrder: 0,
    freeDeliveryCategories: [],
    freeDeliveryDishIds: [],
    freeDeliveryAreas: [],
    freeDeliveryBannerText: '🎉 Special Offer: Free Delivery on all orders today!',
    freeDeliveryShowBanner: true,
    // 📢 Global Maintenance / Announcement Ticker Notice Defaults
    maintenanceNoticeEnabled: true,
    maintenanceNoticeText: '⚠️ Notice: Our displayed products are not for sale (uploaded strictly for experimental purposes). Also, we are updating our server system right now, so some features might be slower than usual!',
    // 🎁 Loyalty Rewards Settings Defaults
    loyaltyRedemptionEnabled: false,
};
const settingsSchema = new mongoose_1.Schema({
    logoLight: { type: String, default: '' },
    logoDark: { type: String, default: '' },
    paymentBanner: { type: String, default: '' },
    paymentBannerFit: {
        type: String,
        enum: ['contain', 'cover'],
        default: 'contain',
    },
    footerDescription: { type: String, default: exports.DEFAULT_SETTINGS.footerDescription },
    footerAddress: { type: String, default: exports.DEFAULT_SETTINGS.footerAddress },
    footerPhone: { type: String, default: exports.DEFAULT_SETTINGS.footerPhone },
    footerEmail: { type: String, default: exports.DEFAULT_SETTINGS.footerEmail },
    footerFacebook: { type: String, default: exports.DEFAULT_SETTINGS.footerFacebook },
    footerInstagram: { type: String, default: exports.DEFAULT_SETTINGS.footerInstagram },
    footerTwitter: { type: String, default: exports.DEFAULT_SETTINGS.footerTwitter },
    // 🚚 Free Delivery Campaign Fields
    freeDeliveryEnabled: { type: Boolean, default: false },
    freeDeliveryScope: {
        type: String,
        enum: ['all', 'min_amount', 'categories', 'dishes', 'areas'],
        default: 'all',
    },
    freeDeliveryMinOrder: { type: Number, default: 0, min: 0 },
    freeDeliveryCategories: { type: [String], default: [] },
    freeDeliveryDishIds: { type: [Number], default: [] },
    freeDeliveryAreas: { type: [String], default: [] },
    freeDeliveryBannerText: {
        type: String,
        default: exports.DEFAULT_SETTINGS.freeDeliveryBannerText,
    },
    freeDeliveryShowBanner: { type: Boolean, default: true },
    // 📢 Global Maintenance / Announcement Ticker Notice
    maintenanceNoticeEnabled: { type: Boolean, default: true },
    maintenanceNoticeText: {
        type: String,
        default: exports.DEFAULT_SETTINGS.maintenanceNoticeText,
    },
    // 🎁 Loyalty Rewards Settings
    loyaltyRedemptionEnabled: { type: Boolean, default: false },
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
exports.Settings = (0, mongoose_1.model)('Settings', settingsSchema);
