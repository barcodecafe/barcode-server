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
  // 1. Hero Section
  heroBadge?: string;
  heroTitle?: string;
  heroHighlightText?: string;
  heroDescription?: string;
  heroImageMain?: string;
  heroImageSecondary1?: string;
  heroImageSecondary2?: string;
  heroNetworkBadgeTitle?: string;
  heroNetworkBadgeSubtitle?: string;
  
  // Hero Trust Stats
  heroStat1Value?: string;
  heroStat1Label?: string;
  heroStat2Value?: string;
  heroStat2Label?: string;
  heroStat3Value?: string;
  heroStat3Label?: string;

  // 2. Our Story Section
  storyBadge?: string;
  storyTitle?: string;
  storyDescription?: string;
  storyImage?: string;
  storyImageCaption?: string;
  timeline: any[];

  // 3. Mission & Vision Section
  missionTitle?: string;
  mission: string;
  visionTitle?: string;
  vision: string;
  stats: {
    founded: string;
    foundedLabel?: string;
    branchesCount: string;
    branchesCountLabel?: string;
    standard: string;
    standardLabel?: string;
  };

  // 4. Leadership Section
  leadershipBadge?: string;
  leadershipTitle?: string;
  leadershipSubtitle?: string;
  leadership: any[];
}

const aboutSchema = new Schema(
  {
    // 1. Hero Section
    heroBadge: { type: String, default: 'About Barcode Group' },
    heroTitle: { type: String, default: 'Good Food, \nRun Like a Promise' },
    heroHighlightText: { type: String, default: 'Promise' },
    heroDescription: {
      type: String,
      default:
        'From a single kitchen to six thriving branches, Barcode has stayed true to one core philosophy: every dish should meet the exact same culinary standard. Every single time. Everywhere.',
    },
    heroImageMain: { type: String, default: '' },
    heroImageSecondary1: { type: String, default: '' },
    heroImageSecondary2: { type: String, default: '' },
    heroNetworkBadgeTitle: { type: String, default: 'Group Network' },
    heroNetworkBadgeSubtitle: { type: String, default: 'Barcode Hospitality' },

    heroStat1Value: { type: String, default: '6' },
    heroStat1Label: { type: String, default: 'Active Branches' },
    heroStat2Value: { type: String, default: '100%' },
    heroStat2Label: { type: String, default: 'Consistency' },
    heroStat3Value: { type: String, default: '1' },
    heroStat3Label: { type: String, default: 'Uncompromising Taste' },

    // 2. Our Story Section
    storyBadge: { type: String, default: 'Our Story' },
    storyTitle: { type: String, default: 'How We Got Here' },
    storyDescription: {
      type: String,
      default:
        'On a fine afternoon in 2013, our journey began with a simple dream: a place where friends could relax over freshly brewed coffee and exceptional food. Today, Barcode Restaurant Group has evolved into a beloved multi-brand culinary family, honoring traditional heritage while pioneering modern dining across Bangladesh.',
    },
    storyImage: { type: String, default: '' },
    storyImageCaption: { type: String, default: 'Inside Barcode Cafe & Restaurant Group' },
    timeline: {
      type: [timelineSchema],
      default: [
        {
          year: '2013',
          title: 'The Inception — Barcode Cafe',
          desc: 'Started on 9th July 2013 at Nasirabad, Chittagong. Born from a desire to create a welcoming haven for freshly brewed coffee, warm conversations, and quality dining.',
        },
        {
          year: '2015',
          title: 'Burgwich Town Fusion Cafe',
          desc: 'Pioneered hygienic oriental and occidental street food fusion—serving Italian Pizza-Pasta, American Burgers and Arabian Shawarma alongside authentic Deshi Chatpati & Fuchka.',
        },
        {
          year: '2016',
          title: 'Mezzan Haile Aaiun',
          desc: 'Honoring Chittagong’s iconic culinary tradition by making authentic Mezbani Khabar accessible every day, expanding into 6 vibrant outlets across Chittagong and Dhaka.',
        },
        {
          year: '2016',
          title: 'Bir Chattala — Heritage Biyebari',
          desc: 'Bringing the rich flavors of Bangladeshi wedding feasts (Kacchi Biriyani, Shahi Jarda) and authentic Bangla Khabar in a nostalgic rural household ambiance with Bela Biscuit.',
        },
        {
          year: '2020',
          title: 'Barcode Food Junction & Marina Capella',
          desc: 'Launched a grand open festive hub at Muradpur bringing all ventures under one roof, along with scenic riverside seafood at Karnafuli bank, Ek Cup Garam Cha, and Premium Kabab.',
        },
        {
          year: 'Present',
          title: 'Barcode Catering & Growing Legacy',
          desc: 'Offering full-scale indoor and outdoor catering across Bangladesh, bringing our signature culinary excellence and heartfelt hospitality to every celebration.',
        },
      ],
    },

    // 3. Mission, Vision & Core Values Section
    missionTitle: { type: String, default: 'Our Mission' },
    mission: {
      type: String,
      default:
        'At Barcode Restaurant Group, we are committed to:\n• Delivering unforgettable dining experiences through outstanding food, exceptional service, and a welcoming atmosphere.\n• Ensuring uncompromising standards of food safety, hygiene, quality, and consistency across every outlet.\n• Driving innovation by embracing modern food trends, technology, and operational excellence.\n• Conducting business with integrity, transparency, accountability, and respect for all.',
    },
    visionTitle: { type: String, default: 'Our Vision' },
    vision: {
      type: String,
      default:
        "To redefine hospitality by creating exceptional dining destinations where food excellence, heartfelt service and innovation inspire enduring memories while becoming Bangladesh's most trusted and admired restaurant group.",
    },
    valuesTitle: { type: String, default: 'Core Values' },
    coreValues: {
      type: [
        {
          title: { type: String, default: '' },
          desc: { type: String, default: '' },
        },
      ],
      default: [
        { title: 'Guest First', desc: 'Prioritizing customer delight & heartfelt hospitality' },
        { title: 'Integrity', desc: 'Operating with transparency, ethics & accountability' },
        { title: 'Excellence', desc: 'Uncompromising food safety, hygiene & culinary quality' },
        { title: 'Respect', desc: 'Deep care and dignity for our guests, team & community' },
        { title: 'Teamwork', desc: 'Collaborative passion & unity across every kitchen and outlet' },
        { title: 'Innovation', desc: 'Embracing modern culinary trends, technology & creativity' },
        { title: 'Accountability', desc: 'Taking full ownership and responsibility in every interaction' },
        { title: 'Sustainability', desc: 'Responsible sourcing, waste reduction & eco-friendly growth' },
      ],
    },
    values: {
      type: [String],
      default: [
        'Guest First — Delivering heartfelt hospitality',
        'Integrity — Transparency, ethics & accountability',
        'Excellence — Uncompromising culinary quality',
        'Respect — Valuing our customers, team & community',
      ],
    },
    stats: {
      founded: { type: String, default: '2022' },
      foundedLabel: { type: String, default: 'Founded' },
      branchesCount: { type: String, default: '6' },
      branchesCountLabel: { type: String, default: 'Branches' },
      standard: { type: String, default: '100%' },
      standardLabel: { type: String, default: 'Standard' },
    },

    // 4. Leadership Section
    leadershipBadge: { type: String, default: 'Leadership' },
    leadershipTitle: { type: String, default: 'Owner & Executive Team' },
    leadershipSubtitle: {
      type: String,
      default: 'The people responsible for keeping every branch on the same standard.',
    },
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
