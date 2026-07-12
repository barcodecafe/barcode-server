/* eslint-disable no-console */
// Seed the top-level Regions and backfill each branch's regionId from its
// location string. Idempotent — safe to re-run. Run: npx ts-node src/scripts/seedRegions.ts
import mongoose from 'mongoose';
import config from '../app/config';
import { Region } from '../app/modules/region/region.model';
import { Branch } from '../app/modules/branch/branch.model';
import { getNextId } from '../app/utils/counter';

const REGIONS = ['Chattogram', "Cox's Bazar", 'Dhaka'];

// mirrors the client's getRegion() so existing branches map to the same region
const deriveRegion = (location: string): string => {
  const loc = (location || '').toLowerCase();
  if (loc.includes("cox's bazar")) return "Cox's Bazar";
  if (loc.includes('dhaka') || loc.includes('banani')) return 'Dhaka';
  return 'Chattogram';
};

async function run() {
  await mongoose.connect(config.database_url as string);
  console.log('🗄️  Connected');

  const nameToId: Record<string, number> = {};
  for (const name of REGIONS) {
    let r = await Region.findOne({ name });
    if (!r) {
      const id = await getNextId('region');
      r = await Region.create({ id, name });
      console.log(`✅ Region created: ${name} (id ${id})`);
    }
    nameToId[name] = r.id;
  }

  const branches = await Branch.find({});
  let updated = 0;
  for (const b of branches) {
    const rid = nameToId[deriveRegion(b.location)];
    if (b.regionId !== rid) {
      b.regionId = rid;
      await b.save();
      updated++;
    }
  }
  console.log('🔗 Regions:', nameToId, '| branches assigned:', updated);
  await mongoose.disconnect();
  process.exit(0);
}

run();
