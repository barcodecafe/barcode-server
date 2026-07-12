// ─── Default hero slides (from heroSlidesService.js) ───
import { IHeroSlide } from '../../app/modules/hero/hero.model';

export const heroSeed: IHeroSlide[] = [
  { id: 1, type: 'promo', title: 'Savor the Art of Modern Dining', subtitle: 'Where culinary creativity meets sophisticated atmosphere.', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80', cta: 'Order Now', featuredFoodId: 3, offerText: 'Chef Specialty: 15% OFF' },
  { id: 2, type: 'promo', title: 'Exquisite Flavors, Crafted with Passion', subtitle: "Indulge in our chef's signature prime-cut selections and fresh pasta.", image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1920&q=80', cta: 'Order Now', featuredFoodId: 2, offerText: 'Signature Special Offer' },
  { id: 3, type: 'ambient', title: 'An Atmosphere as Memorable as the Food', subtitle: 'Stunning designs and premium dining experiences in every branch.', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1920&q=80', cta: null, featuredFoodId: null, offerText: null },
];
