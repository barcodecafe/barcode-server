"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMessageValidationSchema = exports.updateStatusValidationSchema = exports.createOrderValidationSchema = exports.OrderStatusEnum = exports.PaymentMethodEnum = void 0;
const zod_1 = require("zod");
exports.PaymentMethodEnum = zod_1.z.enum([
    'cod',
    'sslcommerz',
    'COD',
    'SSLCOMMERZ',
    'BKASH',
    'NAGAD',
    'CARD',
]);
// 🎯 FIX: 'Ready to Pick' সহ সমস্ত প্রয়োজনীয় ফরম্যাট এখানে যুক্ত করা হলো
exports.OrderStatusEnum = zod_1.z.enum([
    'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REJECTED', 'ACCEPTED', 'CONFIRMED', 'PREPARING', 'READY TO PICK', 'OUT FOR DELIVERY',
    'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected', 'accepted', 'confirmed', 'preparing', 'ready to pick', 'out for delivery',
    'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Rejected', 'Accepted', 'Confirmed', 'Preparing', 'Ready to Pick', 'Out for Delivery',
    'Awaiting Payment', 'awaiting payment', 'AWAITING PAYMENT', 'Placed', 'placed', 'PLACED'
]);
exports.createOrderValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        items: zod_1.z
            .array(zod_1.z.object({
            id: zod_1.z.coerce.number({ invalid_type_error: 'Item ID must be a number' }),
            quantity: zod_1.z.coerce.number().int().min(1, 'Quantity must be at least 1'),
            selectedSize: zod_1.z.string().nullable().optional(),
            selectedAddons: zod_1.z
                .array(zod_1.z.object({
                name: zod_1.z.string(),
                price: zod_1.z.coerce.number(),
            }))
                .optional(),
            // 🎯 অফার ও অরিজিনাল প্রাইস ফিল্ডগুলো ভ্যালিডেশনে অপশনাল হিসেবে যুক্ত করা হলো
            offerType: zod_1.z.string().nullable().optional(),
            originalPrice: zod_1.z.coerce.number().optional(),
            price: zod_1.z.coerce.number().optional(), // 🎯 ভ্যালিডেশনে প্রাইস পাস করার জন্য
            branchId: zod_1.z.coerce.number().optional(), // 🎯 ব্রাঞ্চ আইডি পাস করার জন্য
        }))
            .min(1, 'Order must contain at least one item'),
        regionId: zod_1.z.coerce.number().refine((n) => n > 0, 'Please select your delivery region'),
        branchId: zod_1.z.coerce.number().optional(),
        couponCode: zod_1.z.string().trim().optional(),
        pointsToRedeem: zod_1.z.coerce.number().int().min(0).optional(),
        deliveryArea: zod_1.z.string().optional(),
        deliveryAddress: zod_1.z.string().min(1, 'Delivery address is required').optional(),
        deliveryPhone: zod_1.z
            .string()
            .regex(/^(?:\+?880|0)1[3-9]\d{8}$/, 'Please provide a valid Bangladeshi phone number')
            .optional(),
        paymentMethod: exports.PaymentMethodEnum.optional(),
        orderType: zod_1.z.enum(['delivery', 'pickup']).optional(),
        expectedPickupTime: zod_1.z.string().optional(),
        pickupBranchId: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).nullable().optional(),
        pickupBranchName: zod_1.z.string().optional(),
    }),
});
exports.updateStatusValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: exports.OrderStatusEnum,
    }),
});
exports.addMessageValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        text: zod_1.z.string().min(1, 'Message text is required'),
        senderName: zod_1.z.string().optional(),
    }),
});
