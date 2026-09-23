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
exports.AboutService = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const about_model_1 = require("./about.model");
const DEFAULT_ABOUT = {
    heroBadge: 'About Barcode Group',
    heroTitle: 'Good Food, \nRun Like a Promise',
    heroHighlightText: 'Promise',
    heroDescription: 'From a single kitchen to six thriving branches, Barcode has stayed true to one core philosophy: every dish should meet the exact same culinary standard. Every single time. Everywhere.',
    heroImageMain: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
    heroImageSecondary1: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
    heroImageSecondary2: 'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=400&q=80',
    heroNetworkBadgeTitle: 'Group Network',
    heroNetworkBadgeSubtitle: 'Barcode Hospitality',
    heroStat1Value: '6',
    heroStat1Label: 'Active Branches',
    heroStat2Value: '100%',
    heroStat2Label: 'Consistency',
    heroStat3Value: '1',
    heroStat3Label: 'Uncompromising Taste',
    storyBadge: 'Our Story',
    storyTitle: 'How We Got Here',
    storyDescription: 'Barcode started as one restaurant with a clear point of view: dining out should feel considered, not complicated. That same standard now travels across every branch we open.',
    storyImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
    storyImageCaption: '',
    timeline: [
        { year: '2022', title: 'One Kitchen, One Idea', desc: 'Barcode opened its first location with a simple premise: fine-dining quality food, served without the stiffness of fine dining.' },
        { year: '2023', title: 'A Second Address', desc: 'Demand for the original menu and atmosphere led to a second branch, proving the concept could travel without losing its character.' },
        { year: '2024', title: 'Building a Bench', desc: 'A dedicated culinary leadership team came on board to standardize quality across locations while still encouraging each branch its own personality.' },
        { year: '2026', title: 'Six Branches, One Standard', desc: 'Today Barcode operates across six branches, each run on the same code of precision: sourcing, technique, hospitality, and atmosphere.' },
    ],
    missionTitle: 'Our Mission',
    mission: 'To serve thoughtfully sourced, carefully prepared food in a space that feels welcoming rather than formal — and to hold that standard at every branch, every day, for every guest.',
    visionTitle: 'Our Vision',
    vision: "To grow into a name people trust before they've even sat down — known branch after branch for the same quality, the same care, and a dining experience worth returning to.",
    stats: {
        founded: '2022',
        foundedLabel: 'Founded',
        branchesCount: '6',
        branchesCountLabel: 'Branches',
        standard: '100%',
        standardLabel: 'Standard',
    },
    leadershipBadge: 'Leadership',
    leadershipTitle: 'Owner & Executive Team',
    leadershipSubtitle: 'The people responsible for keeping every branch on the same standard.',
    leadership: [
        { name: 'Owner Name', role: 'Founder & Owner', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=500&q=80', bio: 'Founded Barcode in 2022 and continues to set the long-term direction and standards for every branch.' },
        { name: 'Executive Name', role: 'Chief Executive Officer', image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=500&q=80', bio: 'Oversees day-to-day operations across all six branches, from staffing to guest experience.' },
    ],
};
const getAboutService = () => __awaiter(void 0, void 0, void 0, function* () {
    let doc = yield about_model_1.About.findOne({});
    if (!doc)
        doc = yield about_model_1.About.create(DEFAULT_ABOUT);
    return doc;
});
const updateAboutCoreService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getAboutService();
    const allowedKeys = [
        'heroBadge',
        'heroTitle',
        'heroHighlightText',
        'heroDescription',
        'heroImageMain',
        'heroImageSecondary1',
        'heroImageSecondary2',
        'heroNetworkBadgeTitle',
        'heroNetworkBadgeSubtitle',
        'heroStat1Value',
        'heroStat1Label',
        'heroStat2Value',
        'heroStat2Label',
        'heroStat3Value',
        'heroStat3Label',
        'storyBadge',
        'storyTitle',
        'storyDescription',
        'storyImage',
        'storyImageCaption',
        'missionTitle',
        'mission',
        'visionTitle',
        'vision',
        'leadershipBadge',
        'leadershipTitle',
        'leadershipSubtitle',
    ];
    for (const key of allowedKeys) {
        if (payload[key] !== undefined)
            doc[key] = payload[key];
    }
    if (payload.stats) {
        doc.stats = Object.assign(Object.assign({}, (doc.stats || {})), payload.stats);
    }
    yield doc.save();
    return doc;
});
// ── Timeline (stable id) ──
const addTimelineItemService = (item) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getAboutService();
    doc.timeline.push({ year: item.year || '', title: item.title || '', desc: item.desc || '' });
    doc.timeline.sort((a, b) => Number(a.year) - Number(b.year));
    doc.markModified('timeline');
    yield doc.save();
    return doc;
});
const updateTimelineItemService = (itemId, item) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getAboutService();
    let target = null;
    if (doc.timeline.id && typeof doc.timeline.id === 'function') {
        try {
            target = doc.timeline.id(itemId);
        }
        catch (_a) { }
    }
    if (!target) {
        const isNum = !isNaN(Number(itemId)) && Number(itemId) >= 0 && Number(itemId) < doc.timeline.length;
        target = doc.timeline.find((t, idx) => {
            const idStr = t._id ? t._id.toString() : t.id ? t.id.toString() : '';
            if (idStr && idStr === itemId)
                return true;
            if (isNum && idx === Number(itemId))
                return true;
            return false;
        });
    }
    if (!target)
        return null;
    if (item.year !== undefined)
        target.year = item.year;
    if (item.title !== undefined)
        target.title = item.title;
    if (item.desc !== undefined)
        target.desc = item.desc;
    doc.timeline.sort((a, b) => Number(a.year) - Number(b.year));
    doc.markModified('timeline');
    yield doc.save();
    return doc;
});
const deleteTimelineItemService = (itemId) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getAboutService();
    const initialLength = doc.timeline.length;
    let deleted = false;
    if (doc.timeline.id && typeof doc.timeline.id === 'function') {
        try {
            const sub = doc.timeline.id(itemId);
            if (sub) {
                if (typeof sub.deleteOne === 'function') {
                    sub.deleteOne();
                    deleted = true;
                }
                else if (typeof doc.timeline.pull === 'function') {
                    doc.timeline.pull({ _id: itemId });
                    deleted = true;
                }
            }
        }
        catch (_a) { }
    }
    if (!deleted || doc.timeline.length === initialLength) {
        const isNum = !isNaN(Number(itemId)) && Number(itemId) >= 0 && Number(itemId) < doc.timeline.length;
        doc.timeline = doc.timeline.filter((item, idx) => {
            const idStr = item._id ? item._id.toString() : item.id ? item.id.toString() : '';
            if (idStr && idStr === itemId)
                return false;
            if (isNum && idx === Number(itemId))
                return false;
            return true;
        });
    }
    doc.markModified('timeline');
    yield doc.save();
    return doc;
});
// ── Leadership (stable id) ──
const addLeadershipMemberService = (member) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getAboutService();
    doc.leadership.push({
        name: member.name || '',
        role: member.role || '',
        image: member.image || '',
        bio: member.bio || '',
    });
    doc.markModified('leadership');
    yield doc.save();
    return doc;
});
const updateLeadershipMemberService = (itemId, member) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getAboutService();
    let target = null;
    if (doc.leadership.id && typeof doc.leadership.id === 'function') {
        try {
            target = doc.leadership.id(itemId);
        }
        catch (_a) { }
    }
    if (!target) {
        const isNum = !isNaN(Number(itemId)) && Number(itemId) >= 0 && Number(itemId) < doc.leadership.length;
        target = doc.leadership.find((l, idx) => {
            const idStr = l._id ? l._id.toString() : l.id ? l.id.toString() : '';
            if (idStr && idStr === itemId)
                return true;
            if (isNum && idx === Number(itemId))
                return true;
            return false;
        });
    }
    if (!target)
        return null;
    for (const k of ['name', 'role', 'image', 'bio']) {
        if (member[k] !== undefined)
            target[k] = member[k];
    }
    doc.markModified('leadership');
    yield doc.save();
    return doc;
});
const deleteLeadershipMemberService = (itemId) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getAboutService();
    const initialLength = doc.leadership.length;
    let deleted = false;
    if (doc.leadership.id && typeof doc.leadership.id === 'function') {
        try {
            const sub = doc.leadership.id(itemId);
            if (sub) {
                if (typeof sub.deleteOne === 'function') {
                    sub.deleteOne();
                    deleted = true;
                }
                else if (typeof doc.leadership.pull === 'function') {
                    doc.leadership.pull({ _id: itemId });
                    deleted = true;
                }
            }
        }
        catch (_a) { }
    }
    if (!deleted || doc.leadership.length === initialLength) {
        const isNum = !isNaN(Number(itemId)) && Number(itemId) >= 0 && Number(itemId) < doc.leadership.length;
        doc.leadership = doc.leadership.filter((item, idx) => {
            const idStr = item._id ? item._id.toString() : item.id ? item.id.toString() : '';
            if (idStr && idStr === itemId)
                return false;
            if (isNum && idx === Number(itemId))
                return false;
            return true;
        });
    }
    doc.markModified('leadership');
    yield doc.save();
    return doc;
});
exports.AboutService = {
    getAboutService,
    updateAboutCoreService,
    addTimelineItemService,
    updateTimelineItemService,
    deleteTimelineItemService,
    addLeadershipMemberService,
    updateLeadershipMemberService,
    deleteLeadershipMemberService,
};
