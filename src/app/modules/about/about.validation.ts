import { z } from 'zod';

export const updateCoreValidationSchema = z.object({
  body: z.object({
    heroBadge: z.string().optional(),
    heroTitle: z.string().optional(),
    heroHighlightText: z.string().optional(),
    heroDescription: z.string().optional(),
    heroImageMain: z.string().optional(),
    heroImageSecondary1: z.string().optional(),
    heroImageSecondary2: z.string().optional(),
    heroNetworkBadgeTitle: z.string().optional(),
    heroNetworkBadgeSubtitle: z.string().optional(),
    heroStat1Value: z.string().optional(),
    heroStat1Label: z.string().optional(),
    heroStat2Value: z.string().optional(),
    heroStat2Label: z.string().optional(),
    heroStat3Value: z.string().optional(),
    heroStat3Label: z.string().optional(),
    storyBadge: z.string().optional(),
    storyTitle: z.string().optional(),
    storyDescription: z.string().optional(),
    storyImage: z.string().optional(),
    storyImageCaption: z.string().optional(),
    missionTitle: z.string().optional(),
    mission: z.string().optional(),
    visionTitle: z.string().optional(),
    vision: z.string().optional(),
    leadershipBadge: z.string().optional(),
    leadershipTitle: z.string().optional(),
    leadershipSubtitle: z.string().optional(),
    stats: z
      .object({
        founded: z.string().optional(),
        foundedLabel: z.string().optional(),
        branchesCount: z.string().optional(),
        branchesCountLabel: z.string().optional(),
        standard: z.string().optional(),
        standardLabel: z.string().optional(),
      })
      .optional(),
  }),
});

export const addTimelineValidationSchema = z.object({
  body: z.object({
    year: z.string().min(1, 'Year is required'),
    title: z.string().min(1, 'Title is required'),
    desc: z.string().optional(),
  }),
});

export const updateTimelineValidationSchema = z.object({
  body: z.object({
    year: z.string().optional(),
    title: z.string().optional(),
    desc: z.string().optional(),
  }),
});

export const addLeadershipValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    role: z.string().optional(),
    image: z.string().optional(),
    bio: z.string().optional(),
  }),
});

export const updateLeadershipValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    role: z.string().optional(),
    image: z.string().optional(),
    bio: z.string().optional(),
  }),
});
