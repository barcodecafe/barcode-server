/* eslint-disable @typescript-eslint/no-explicit-any */
import { About } from './about.model';

const DEFAULT_ABOUT = {
  heroBadge: 'About Barcode Group',
  heroTitle: 'Good Food, \nRun Like a Promise',
  heroHighlightText: 'Promise',
  heroDescription:
    'From a single kitchen to six thriving branches, Barcode has stayed true to one core philosophy: every dish should meet the exact same culinary standard. Every single time. Everywhere.',
  heroImageMain:
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
  heroImageSecondary1:
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
  heroImageSecondary2:
    'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=400&q=80',
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
  storyDescription:
    'Barcode started as one restaurant with a clear point of view: dining out should feel considered, not complicated. That same standard now travels across every branch we open.',
  storyImage:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
  storyImageCaption: '',
  timeline: [
    { year: '2022', title: 'One Kitchen, One Idea', desc: 'Barcode opened its first location with a simple premise: fine-dining quality food, served without the stiffness of fine dining.' },
    { year: '2023', title: 'A Second Address', desc: 'Demand for the original menu and atmosphere led to a second branch, proving the concept could travel without losing its character.' },
    { year: '2024', title: 'Building a Bench', desc: 'A dedicated culinary leadership team came on board to standardize quality across locations while still encouraging each branch its own personality.' },
    { year: '2026', title: 'Six Branches, One Standard', desc: 'Today Barcode operates across six branches, each run on the same code of precision: sourcing, technique, hospitality, and atmosphere.' },
  ],

  missionTitle: 'Our Mission',
  mission:
    'To serve thoughtfully sourced, carefully prepared food in a space that feels welcoming rather than formal — and to hold that standard at every branch, every day, for every guest.',
  visionTitle: 'Our Vision',
  vision:
    "To grow into a name people trust before they've even sat down — known branch after branch for the same quality, the same care, and a dining experience worth returning to.",
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

const getAboutService = async () => {
  let doc = await About.findOne({});
  if (!doc) doc = await About.create(DEFAULT_ABOUT);
  return doc;
};

const updateAboutCoreService = async (payload: any) => {
  const doc = await getAboutService();
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
    if (payload[key] !== undefined) (doc as any)[key] = payload[key];
  }

  if (payload.stats) {
    doc.stats = { ...(doc.stats || {}), ...payload.stats };
  }

  await doc.save();
  return doc;
};

// ── Timeline (stable id) ──
const addTimelineItemService = async (item: any) => {
  const doc = await getAboutService();
  doc.timeline.push({ year: item.year || '', title: item.title || '', desc: item.desc || '' });
  doc.timeline.sort((a: any, b: any) => Number(a.year) - Number(b.year));
  doc.markModified('timeline');
  await doc.save();
  return doc;
};

const updateTimelineItemService = async (itemId: string, item: any) => {
  const doc = await getAboutService();
  let target: any = null;

  if ((doc.timeline as any).id && typeof (doc.timeline as any).id === 'function') {
    try {
      target = (doc.timeline as any).id(itemId);
    } catch {}
  }

  if (!target) {
    const isNum = !isNaN(Number(itemId)) && Number(itemId) >= 0 && Number(itemId) < doc.timeline.length;
    target = doc.timeline.find((t: any, idx: number) => {
      const idStr = t._id ? t._id.toString() : t.id ? t.id.toString() : '';
      if (idStr && idStr === itemId) return true;
      if (isNum && idx === Number(itemId)) return true;
      return false;
    });
  }

  if (!target) return null;
  if (item.year !== undefined) target.year = item.year;
  if (item.title !== undefined) target.title = item.title;
  if (item.desc !== undefined) target.desc = item.desc;
  doc.timeline.sort((a: any, b: any) => Number(a.year) - Number(b.year));
  doc.markModified('timeline');
  await doc.save();
  return doc;
};

const deleteTimelineItemService = async (itemId: string) => {
  const doc = await getAboutService();
  const initialLength = doc.timeline.length;
  let deleted = false;

  if ((doc.timeline as any).id && typeof (doc.timeline as any).id === 'function') {
    try {
      const sub = (doc.timeline as any).id(itemId);
      if (sub) {
        if (typeof sub.deleteOne === 'function') {
          sub.deleteOne();
          deleted = true;
        } else if (typeof (doc.timeline as any).pull === 'function') {
          (doc.timeline as any).pull({ _id: itemId });
          deleted = true;
        }
      }
    } catch {}
  }

  if (!deleted || doc.timeline.length === initialLength) {
    const isNum = !isNaN(Number(itemId)) && Number(itemId) >= 0 && Number(itemId) < doc.timeline.length;
    doc.timeline = doc.timeline.filter((item: any, idx: number) => {
      const idStr = item._id ? item._id.toString() : item.id ? item.id.toString() : '';
      if (idStr && idStr === itemId) return false;
      if (isNum && idx === Number(itemId)) return false;
      return true;
    });
  }

  doc.markModified('timeline');
  await doc.save();
  return doc;
};

// ── Leadership (stable id) ──
const addLeadershipMemberService = async (member: any) => {
  const doc = await getAboutService();
  doc.leadership.push({
    name: member.name || '',
    role: member.role || '',
    image: member.image || '',
    bio: member.bio || '',
  });
  doc.markModified('leadership');
  await doc.save();
  return doc;
};

const updateLeadershipMemberService = async (itemId: string, member: any) => {
  const doc = await getAboutService();
  let target: any = null;

  if ((doc.leadership as any).id && typeof (doc.leadership as any).id === 'function') {
    try {
      target = (doc.leadership as any).id(itemId);
    } catch {}
  }

  if (!target) {
    const isNum = !isNaN(Number(itemId)) && Number(itemId) >= 0 && Number(itemId) < doc.leadership.length;
    target = doc.leadership.find((l: any, idx: number) => {
      const idStr = l._id ? l._id.toString() : l.id ? l.id.toString() : '';
      if (idStr && idStr === itemId) return true;
      if (isNum && idx === Number(itemId)) return true;
      return false;
    });
  }

  if (!target) return null;
  for (const k of ['name', 'role', 'image', 'bio']) {
    if (member[k] !== undefined) target[k] = member[k];
  }
  doc.markModified('leadership');
  await doc.save();
  return doc;
};

const deleteLeadershipMemberService = async (itemId: string) => {
  const doc = await getAboutService();
  const initialLength = doc.leadership.length;
  let deleted = false;

  if ((doc.leadership as any).id && typeof (doc.leadership as any).id === 'function') {
    try {
      const sub = (doc.leadership as any).id(itemId);
      if (sub) {
        if (typeof sub.deleteOne === 'function') {
          sub.deleteOne();
          deleted = true;
        } else if (typeof (doc.leadership as any).pull === 'function') {
          (doc.leadership as any).pull({ _id: itemId });
          deleted = true;
        }
      }
    } catch {}
  }

  if (!deleted || doc.leadership.length === initialLength) {
    const isNum = !isNaN(Number(itemId)) && Number(itemId) >= 0 && Number(itemId) < doc.leadership.length;
    doc.leadership = doc.leadership.filter((item: any, idx: number) => {
      const idStr = item._id ? item._id.toString() : item.id ? item.id.toString() : '';
      if (idStr && idStr === itemId) return false;
      if (isNum && idx === Number(itemId)) return false;
      return true;
    });
  }

  doc.markModified('leadership');
  await doc.save();
  return doc;
};

export const AboutService = {
  getAboutService,
  updateAboutCoreService,
  addTimelineItemService,
  updateTimelineItemService,
  deleteTimelineItemService,
  addLeadershipMemberService,
  updateLeadershipMemberService,
  deleteLeadershipMemberService,
};
