"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyService = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const policy_model_1 = require("./policy.model");
const DEFAULT_POLICIES = {
    'privacy-policy': {
        type: 'privacy-policy',
        title: 'Privacy Policy',
        lastUpdated: 'August 2026',
        sections: [
            {
                icon: 'eye',
                title: '1. Information We Collect',
                content: 'When you place an order or create an account with Barcode Restaurant Group, we collect details such as your name, phone number, email address, and delivery location to ensure a seamless food ordering experience.',
                order: 1,
            },
            {
                icon: 'file-text',
                title: '2. How We Use Your Data',
                content: 'Your personal information is strictly used for order fulfillment, rider assignment, delivery status updates, and customer support. We do not sell or rent your personal data to any third-party marketing services.',
                order: 2,
            },
            {
                icon: 'lock',
                title: '3. Payment Security',
                content: 'All digital transactions are processed securely through certified SSL payment gateways (bKash, Nagad, Cards, etc.). We do not store your credit card or PIN information on our servers.',
                order: 3,
            },
            {
                icon: 'mail',
                title: '4. Contact Us About Your Privacy',
                content: 'If you have any questions or concerns about our privacy practices, please reach out to our team at info@barcoderestaurantgroup.com.',
                order: 4,
            },
        ],
    },
    'terms-of-service': {
        type: 'terms-of-service',
        title: 'Terms of Service',
        lastUpdated: 'August 2026',
        sections: [
            {
                icon: 'shopping-bag',
                title: '1. Order Acceptance & Pricing',
                content: 'By placing an order on Barcode Restaurant Group, you agree to provide accurate delivery and contact information. Prices listed on the platform are subject to change without prior notice, and special promotion rules apply as advertised.',
                order: 1,
            },
            {
                icon: 'truck',
                title: '2. Delivery & Fulfillment',
                content: 'Estimated delivery times are provided for reference only and may vary due to weather, traffic, or kitchen rush. Customers are expected to receive the order at the provided address when the rider arrives.',
                order: 2,
            },
            {
                icon: 'refresh-cw',
                title: '3. Cancellations & Refunds',
                content: 'Orders can only be cancelled before they are accepted or prepared by the kitchen. If an order is cancelled after preparation has begun, full charges may apply. Refunds for paid online orders will be processed according to payment gateway timelines.',
                order: 3,
            },
            {
                icon: 'globe',
                title: '4. Service Availability',
                content: 'Barcode Restaurant Group reserves the right to modify or discontinue any dish, offer, or service area at any time.',
                order: 4,
            },
        ],
    },
};
const getPolicyService = (type) => __awaiter(void 0, void 0, void 0, function* () {
    const normalizedType = type.toLowerCase().trim();
    let doc = yield policy_model_1.Policy.findOne({ type: normalizedType });
    if (!doc && DEFAULT_POLICIES[normalizedType]) {
        doc = yield policy_model_1.Policy.create(DEFAULT_POLICIES[normalizedType]);
    }
    if (doc) {
        doc.sections.sort((a, b) => { var _a, _b; return ((_a = a.order) !== null && _a !== void 0 ? _a : 999) - ((_b = b.order) !== null && _b !== void 0 ? _b : 999); });
    }
    return doc;
});
const updatePolicyHeaderService = (type, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getPolicyService(type);
    if (!doc)
        return null;
    if (payload.title !== undefined)
        doc.title = payload.title;
    if (payload.lastUpdated !== undefined)
        doc.lastUpdated = payload.lastUpdated;
    yield doc.save();
    return doc;
});
const addPolicySectionService = (type, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getPolicyService(type);
    if (!doc)
        return null;
    const nextOrder = doc.sections.length > 0
        ? Math.max(...doc.sections.map((s) => s.order || 0)) + 1
        : 1;
    doc.sections.push({
        icon: payload.icon || 'file-text',
        title: payload.title || '',
        content: payload.content || '',
        order: payload.order !== undefined ? Number(payload.order) : nextOrder,
    });
    doc.sections.sort((a, b) => { var _a, _b; return ((_a = a.order) !== null && _a !== void 0 ? _a : 999) - ((_b = b.order) !== null && _b !== void 0 ? _b : 999); });
    yield doc.save();
    return doc;
});
const updatePolicySectionService = (type, sectionId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getPolicyService(type);
    if (!doc)
        return null;
    const sub = doc.sections.id(sectionId);
    if (!sub)
        return null;
    if (payload.icon !== undefined)
        sub.icon = payload.icon;
    if (payload.title !== undefined)
        sub.title = payload.title;
    if (payload.content !== undefined)
        sub.content = payload.content;
    if (payload.order !== undefined)
        sub.order = Number(payload.order);
    doc.sections.sort((a, b) => { var _a, _b; return ((_a = a.order) !== null && _a !== void 0 ? _a : 999) - ((_b = b.order) !== null && _b !== void 0 ? _b : 999); });
    yield doc.save();
    return doc;
});
const deletePolicySectionService = (type, sectionId) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getPolicyService(type);
    if (!doc)
        return null;
    const sub = doc.sections.id(sectionId);
    if (!sub)
        return null;
    sub.deleteOne();
    yield doc.save();
    return doc;
});
const reorderPolicySectionsService = (type, sectionIds) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getPolicyService(type);
    if (!doc)
        return null;
    const idMap = new Map();
    sectionIds.forEach((id, idx) => idMap.set(String(id), idx + 1));
    doc.sections.forEach((s) => {
        const sId = String(s._id);
        if (idMap.has(sId)) {
            s.order = idMap.get(sId);
        }
    });
    doc.sections.sort((a, b) => { var _a, _b; return ((_a = a.order) !== null && _a !== void 0 ? _a : 999) - ((_b = b.order) !== null && _b !== void 0 ? _b : 999); });
    yield doc.save();
    return doc;
});
exports.PolicyService = {
    getPolicyService,
    updatePolicyHeaderService,
    addPolicySectionService,
    updatePolicySectionService,
    deletePolicySectionService,
    reorderPolicySectionsService,
};
