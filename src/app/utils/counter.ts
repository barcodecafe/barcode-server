import { Schema, model } from 'mongoose';

// atomic sequence counter — numeric id race (max+1) এড়াতে (Phase 4 QA fix)
interface ICounter {
  _id: string; // sequence name: 'food' | 'branch' | 'hero'
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model<ICounter>('Counter', counterSchema);

// পরবর্তী id — findOneAndUpdate $inc atomic, তাই concurrent create-এও collision হয় না
export const getNextId = async (name: string): Promise<number> => {
  const c = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return c!.seq;
};

// seed-এর পর counter কে current max-এ সেট করা (নাহলে প্রথম create বিদ্যমান id-র সাথে সংঘর্ষ করবে)
export const setCounter = async (name: string, value: number): Promise<void> => {
  await Counter.findByIdAndUpdate(name, { seq: value }, { upsert: true });
};
