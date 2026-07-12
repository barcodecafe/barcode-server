import { Schema, model } from 'mongoose';

const subTransform = {
  virtuals: false,
  transform(_doc: any, ret: any) {
    ret.id = ret._id?.toString(); // stable id (array index নয় — #4.10)
    delete ret._id;
    return ret;
  },
};

// প্রতিটা timeline/leadership আইটেম নিজের stable _id পায় (Mongoose subdoc)
const timelineSchema = new Schema(
  {
    year: { type: String, default: '' },
    title: { type: String, default: '' },
    desc: { type: String, default: '' },
  },
  { toJSON: subTransform }
);

const leadershipSchema = new Schema(
  {
    name: { type: String, default: '' },
    role: { type: String, default: '' },
    image: { type: String, default: '' },
    bio: { type: String, default: '' },
  },
  { toJSON: subTransform }
);

export interface IAbout {
  mission: string;
  vision: string;
  stats: { founded: string; branchesCount: string; standard: string };
  timeline: any[];
  leadership: any[];
}

const aboutSchema = new Schema(
  {
    mission: { type: String, default: '' },
    vision: { type: String, default: '' },
    stats: {
      founded: { type: String, default: '' },
      branchesCount: { type: String, default: '' },
      standard: { type: String, default: '' },
    },
    timeline: { type: [timelineSchema], default: [] },
    leadership: { type: [leadershipSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const About = model<IAbout>('About', aboutSchema);
