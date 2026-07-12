/* eslint-disable @typescript-eslint/no-explicit-any */
import { About } from './about.model';

const DEFAULT_ABOUT = {
  mission:
    'To serve thoughtfully sourced, carefully prepared food in a space that feels welcoming rather than formal — and to hold that standard at every branch, every day, for every guest.',
  vision:
    "To grow into a name people trust before they've even sat down — known branch after branch for the same quality, the same care, and a dining experience worth returning to.",
  stats: { founded: '2022', branchesCount: '6', standard: '1' },
  timeline: [
    { year: '2022', title: 'One Kitchen, One Idea', desc: 'Barcode opened its first location with a simple premise: fine-dining quality food, served without the stiffness of fine dining.' },
    { year: '2023', title: 'A Second Address', desc: 'Demand for the original menu and atmosphere led to a second branch, proving the concept could travel without losing its character.' },
    { year: '2024', title: 'Building a Bench', desc: 'A dedicated culinary leadership team came on board to standardize quality across locations while still encouraging each branch its own personality.' },
    { year: '2026', title: 'Six Branches, One Standard', desc: 'Today Barcode operates across six branches, each run on the same code of precision: sourcing, technique, hospitality, and atmosphere.' },
  ],
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
  if (payload.mission !== undefined) doc.mission = payload.mission;
  if (payload.vision !== undefined) doc.vision = payload.vision;
  if (payload.stats) doc.stats = { ...doc.stats, ...payload.stats };
  await doc.save();
  return doc;
};

// ── Timeline (stable id) ──
const addTimelineItemService = async (item: any) => {
  const doc = await getAboutService();
  doc.timeline.push({ year: item.year || '', title: item.title || '', desc: item.desc || '' });
  doc.timeline.sort((a: any, b: any) => Number(a.year) - Number(b.year));
  await doc.save();
  return doc;
};

const updateTimelineItemService = async (itemId: string, item: any) => {
  const doc = await getAboutService();
  const sub = (doc.timeline as any).id(itemId);
  if (!sub) return null;
  if (item.year !== undefined) sub.year = item.year;
  if (item.title !== undefined) sub.title = item.title;
  if (item.desc !== undefined) sub.desc = item.desc;
  doc.timeline.sort((a: any, b: any) => Number(a.year) - Number(b.year));
  await doc.save();
  return doc;
};

const deleteTimelineItemService = async (itemId: string) => {
  const doc = await getAboutService();
  const sub = (doc.timeline as any).id(itemId);
  if (!sub) return null;
  sub.deleteOne();
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
  await doc.save();
  return doc;
};

const updateLeadershipMemberService = async (itemId: string, member: any) => {
  const doc = await getAboutService();
  const sub = (doc.leadership as any).id(itemId);
  if (!sub) return null;
  for (const k of ['name', 'role', 'image', 'bio']) if (member[k] !== undefined) sub[k] = member[k];
  await doc.save();
  return doc;
};

const deleteLeadershipMemberService = async (itemId: string) => {
  const doc = await getAboutService();
  const sub = (doc.leadership as any).id(itemId);
  if (!sub) return null;
  sub.deleteOne();
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
