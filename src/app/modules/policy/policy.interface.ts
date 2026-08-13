export interface IPolicySection {
  _id?: any;
  icon?: string;
  title: string;
  content: string;
  order?: number;
}

export interface IPolicy {
  type: 'privacy-policy' | 'terms-of-service';
  title: string;
  lastUpdated: string;
  sections: IPolicySection[];
}
