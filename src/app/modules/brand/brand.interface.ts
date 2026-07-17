export interface IBrand {
  id: number; // numeric, frontend-facing
  name: string;
  slug: string; // URL segment, e.g. "barcode-cafe" → /brands/barcode-cafe
  tagline?: string;
  description?: string;
  logoLight?: string; // logo for light backgrounds (brand-themed nav/footer)
  logoDark?: string; // logo for dark backgrounds
  cover?: string; // hero/cover image for the brand page
  website?: string; // external site, e.g. https://www.mybarcodecafe.com
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
  facebook?: string;
  instagram?: string;
  order?: number; // display order on the /brands listing
  isActive?: boolean; // hidden brands are kept but not shown publicly
  createdAt?: Date;
  updatedAt?: Date;
}
