import { Settings, DEFAULT_SETTINGS } from './settings.model';

// singleton — না থাকলে ডিফল্ট দিয়ে তৈরি
const getSettingsService = async () => {
  let doc = await Settings.findOne({});
  if (!doc) doc = await Settings.create(DEFAULT_SETTINGS);
  return doc;
};

// merge (overwrite নয় — audit N23) — শুধু পাঠানো ফিল্ড আপডেট
const updateSettingsService = async (payload: Partial<typeof DEFAULT_SETTINGS>) => {
  const doc = await getSettingsService();
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[]) {
    if (payload[key] !== undefined) (doc as any)[key] = payload[key];
  }
  await doc.save();
  return doc;
};

const resetSettingsService = async () => {
  const doc = await getSettingsService();
  Object.assign(doc, DEFAULT_SETTINGS);
  await doc.save();
  return doc;
};

export const SettingsService = {
  getSettingsService,
  updateSettingsService,
  resetSettingsService,
};
