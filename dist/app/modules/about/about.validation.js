"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLeadershipValidationSchema = exports.addLeadershipValidationSchema = exports.updateTimelineValidationSchema = exports.addTimelineValidationSchema = exports.updateCoreValidationSchema = void 0;
const zod_1 = require("zod");
exports.updateCoreValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        heroBadge: zod_1.z.string().optional(),
        heroTitle: zod_1.z.string().optional(),
        heroHighlightText: zod_1.z.string().optional(),
        heroDescription: zod_1.z.string().optional(),
        heroImageMain: zod_1.z.string().optional(),
        heroImageSecondary1: zod_1.z.string().optional(),
        heroImageSecondary2: zod_1.z.string().optional(),
        heroNetworkBadgeTitle: zod_1.z.string().optional(),
        heroNetworkBadgeSubtitle: zod_1.z.string().optional(),
        heroStat1Value: zod_1.z.string().optional(),
        heroStat1Label: zod_1.z.string().optional(),
        heroStat2Value: zod_1.z.string().optional(),
        heroStat2Label: zod_1.z.string().optional(),
        heroStat3Value: zod_1.z.string().optional(),
        heroStat3Label: zod_1.z.string().optional(),
        storyBadge: zod_1.z.string().optional(),
        storyTitle: zod_1.z.string().optional(),
        storyDescription: zod_1.z.string().optional(),
        storyImage: zod_1.z.string().optional(),
        storyImageCaption: zod_1.z.string().optional(),
        missionTitle: zod_1.z.string().optional(),
        mission: zod_1.z.string().optional(),
        visionTitle: zod_1.z.string().optional(),
        vision: zod_1.z.string().optional(),
        leadershipBadge: zod_1.z.string().optional(),
        leadershipTitle: zod_1.z.string().optional(),
        leadershipSubtitle: zod_1.z.string().optional(),
        stats: zod_1.z
            .object({
            founded: zod_1.z.string().optional(),
            foundedLabel: zod_1.z.string().optional(),
            branchesCount: zod_1.z.string().optional(),
            branchesCountLabel: zod_1.z.string().optional(),
            standard: zod_1.z.string().optional(),
            standardLabel: zod_1.z.string().optional(),
        })
            .optional(),
    }),
});
exports.addTimelineValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        year: zod_1.z.string().min(1, 'Year is required'),
        title: zod_1.z.string().min(1, 'Title is required'),
        desc: zod_1.z.string().optional(),
    }),
});
exports.updateTimelineValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        year: zod_1.z.string().optional(),
        title: zod_1.z.string().optional(),
        desc: zod_1.z.string().optional(),
    }),
});
exports.addLeadershipValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        role: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(),
        bio: zod_1.z.string().optional(),
    }),
});
exports.updateLeadershipValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        role: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(),
        bio: zod_1.z.string().optional(),
    }),
});
