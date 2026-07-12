// ─── Cleaned Foods seed (from barcode_client/src/data/foodsData.js) ───
// পরিষ্কার: triplicate "Classic Mint Mojito" (id 13,14) বাদ; id 12 থেকে
// alcohol reference সরিয়ে clean mocktail করা হয়েছে। দাম আপাতত USD (ক্লায়েন্ট
// পরে আসল BDT দেবে)। branchPrices/branchStocks/variations/discountPct মডেল
// ডিফল্ট থেকে আসবে ({}, {}, [], 0)।
import { IFood } from '../../app/modules/food/food.interface';

type SeedFood = Pick<
  IFood,
  'id' | 'name' | 'category' | 'price' | 'image' | 'rating' | 'description' | 'popular' | 'isAdminFeatured' | 'featuredOrder' | 'branchIds'
>;

export const foodsSeed: SeedFood[] = [
  { id: 1, name: 'Barcode Signature Burger', category: 'Mains', price: 18.99, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', rating: 4.9, description: 'Premium Angus beef patty, cheddar, truffle mayo, caramelized onions, brioche bun, and hand-cut fries.', popular: true, isAdminFeatured: true, featuredOrder: 1, branchIds: [] },
  { id: 2, name: 'Truffle Mushroom Pasta', category: 'Mains', price: 22.5, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80', rating: 4.8, description: 'Fresh fettuccine tossed in a rich, creamy wild mushroom and black truffle paste sauce.', popular: true, isAdminFeatured: false, featuredOrder: null, branchIds: [] },
  { id: 3, name: 'Dry-Aged Ribeye Steak', category: 'Mains', price: 45.0, image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=600&q=80', rating: 4.9, description: '14-day dry-aged USDA Prime ribeye, grilled to perfection, served with garlic herb butter and roasted asparagus.', popular: true, isAdminFeatured: true, featuredOrder: 2, branchIds: [] },
  { id: 4, name: 'Supreme Sushi Platter', category: 'Mains', price: 32.0, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80', rating: 4.7, description: "Assorted premium sashimi, nigiri, and chef's special rolls served with pickled ginger and wasabi.", popular: true, isAdminFeatured: false, featuredOrder: null, branchIds: [] },
  { id: 5, name: 'Wood-Fired Margherita Pizza', category: 'Mains', price: 16.5, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80', rating: 4.8, description: 'San Marzano tomatoes, fresh buffalo mozzarella, organic basil, and extra virgin olive oil.', popular: true, isAdminFeatured: false, featuredOrder: null, branchIds: [] },
  { id: 6, name: 'Pan-Seared Crispy Salmon', category: 'Mains', price: 28.0, image: 'https://images.unsplash.com/photo-1485962398705-ef6a13c41e8f?auto=format&fit=crop&w=600&q=80', rating: 4.7, description: 'Crispy skin-on salmon fillet, creamy lemon dill sauce, wild rice, and seasonal greens.', popular: true, isAdminFeatured: false, featuredOrder: null, branchIds: [] },
  { id: 7, name: 'Burrata Salad', category: 'Appetizers', price: 14.0, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80', rating: 4.6, description: 'Creamy burrata cheese, heirloom cherry tomatoes, basil pesto, balsamic reduction, toasted focaccia.', popular: false, isAdminFeatured: false, featuredOrder: null, branchIds: [] },
  { id: 8, name: 'Spiced Garlic Prawns', category: 'Appetizers', price: 15.5, image: 'https://images.unsplash.com/photo-1559737607-3578911a4fae?auto=format&fit=crop&w=600&q=80', rating: 4.8, description: 'King prawns sautéed in sizzling olive oil, garlic, chili flakes, served with sourdough.', popular: false, isAdminFeatured: false, featuredOrder: null, branchIds: [] },
  { id: 9, name: 'Warm Chocolate Lava Cake', category: 'Desserts', price: 9.5, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80', rating: 4.9, description: 'Decadent dark chocolate cake with a molten liquid center, served with vanilla bean gelato.', popular: false, isAdminFeatured: false, featuredOrder: null, branchIds: [] },
  { id: 10, name: 'Classic Italian Tiramisu', category: 'Desserts', price: 9.0, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80', rating: 4.8, description: 'Layers of espresso-soaked ladyfingers, velvety mascarpone cream, and premium cocoa powder.', popular: false, isAdminFeatured: false, featuredOrder: null, branchIds: [] },
  { id: 11, name: 'Signature Rose Berry Mocktail', category: 'Drinks', price: 7.5, image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80', rating: 4.7, description: 'Fresh muddled berries, organic rose water syrup, sparkling water, mint, and fresh lime juice.', popular: false, isAdminFeatured: false, featuredOrder: null, branchIds: [] },
  { id: 12, name: 'Classic Mint Mojito', category: 'Drinks', price: 8.5, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', rating: 4.6, description: 'Fresh lime juice, sugar cane syrup, muddled mint, soda water, and crushed ice — a refreshing classic mocktail.', popular: false, isAdminFeatured: false, featuredOrder: null, branchIds: [] },
];
