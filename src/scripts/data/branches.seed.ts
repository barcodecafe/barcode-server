// ─── Cleaned Branches seed (from barcode_client/src/data/branchesData.js) ───
// পরিষ্কার করা হয়েছে:
//  • id 3  — location থেকে ভুল Chicago address সরানো
//  • id 7  — name trailing dash সরানো
//  • id 16 — নাম Cox's Bazar ছিল কিন্তু location Chattogram → "Nizam Road" করা
//  • id 22 — name/location/contact trailing space trim
//  • সব contact — trailing space ও junk "-NN" suffix সরানো; +880 → local
//  • typo — "Radd"→Road, "Groud"→Ground, "Chattagram"→Chattogram
// manager/capacity/features — locale-appropriate neutral placeholder
// (ক্লায়েন্ট আসল মান দিলে Admin CRUD দিয়ে বদলানো যাবে)।
import { IBranch } from '../../app/modules/branch/branch.interface';

type SeedBranch = Pick<IBranch, 'id' | 'name' | 'location' | 'contact' | 'image' | 'hours' | 'rating'>;

const FEATURES = ['Air Conditioned', 'Family Section', 'Free Wi-Fi', 'Parking', 'Card Payment'];

const raw: SeedBranch[] = [
  { id: 1, name: 'Barcode Cafe', location: 'East Nasirabad, Bayazid Bostami Road, 2 No Gate, Chattogram 4212.', contact: '01915333333', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80', hours: '11:00 AM - 11:00 PM', rating: 4.9 },
  { id: 2, name: 'Barcode Cafe Khulshi', location: 'Salam Heights, House 01, Road 01, Zakir Hossain Rd, Chattogram 4225.', contact: '01919444444', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80', hours: '12:00 PM - 12:00 AM', rating: 4.8 },
  { id: 3, name: 'Barcode Food Junction Muradpur', location: '358 Paschim Sholoshahar, CDA Avenue, Muradpur, Chattogram 4203.', contact: '01992221122', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80', hours: '11:00 AM - 11:00 PM', rating: 4.7 },
  { id: 4, name: "Barcode Food Junction Cox's Bazar", location: "Shopnil Shindhu, New Beach Road, Cox's Bazar.", contact: '01919032222', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80', hours: '10:00 AM - 10:00 PM', rating: 4.8 },
  { id: 5, name: 'Barcode Food Junction Patenga', location: '11 No Ghat, East Patenga, Boat Club, Chattogram 4302.', contact: '01810097198', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=600&q=80', hours: '11:00 AM - 11:00 PM', rating: 4.6 },
  { id: 6, name: 'Omerta', location: 'Paschim Sholoshahar, CDA Avenue, Muradpur, Chattogram 4203.', contact: '01958096566', image: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=600&q=80', hours: '12:00 PM - 11:00 PM', rating: 4.8 },
  { id: 7, name: 'Barcode Sweets Muradpur', location: 'Paschim Sholoshahar, CDA Avenue, Muradpur, Chattogram 4203.', contact: '01810097195', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80', hours: '11:00 AM - 11:00 PM', rating: 4.9 },
  { id: 8, name: 'Barcode Utshob', location: '101 O.R. Nizam Rd, Chattogram 4000.', contact: '01919345353', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80', hours: '12:00 PM - 12:00 AM', rating: 4.8 },
  { id: 9, name: 'Burgwich Town Halishahar', location: 'City Tower, Road 1, Block 6, PC Road, Chattogram 4225.', contact: '01907887019', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80', hours: '11:00 AM - 11:00 PM', rating: 4.7 },
  { id: 10, name: 'Marina Capella Barcode', location: 'East Patenga, Boat Club, Chattogram 4302.', contact: '01926336633', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80', hours: '10:00 AM - 10:00 PM', rating: 4.8 },
  { id: 11, name: 'Mezzan Haile Ayun Muradpur', location: '358 Paschim Sholoshahar, CDA Avenue, Muradpur, Chattogram 4203.', contact: '01974077717', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=600&q=80', hours: '11:00 AM - 11:00 PM', rating: 4.6 },
  { id: 12, name: 'Mezzan Haile Ayun Chawkbazar', location: 'K.B. Fazlul Kader Road, Panchlaish, Chattogram 4203.', contact: '01907887033', image: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=600&q=80', hours: '12:00 PM - 11:00 PM', rating: 4.8 },
  { id: 13, name: 'Mezzan Haile Ayun Jamalkhan', location: 'In front of Ideal School, Jamal Khan Road, Chattogram 4000.', contact: '01810097192', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80', hours: '11:00 AM - 11:00 PM', rating: 4.9 },
  { id: 14, name: 'Mezzan Haile Ayun Lalkhan Bazar', location: 'Rahman Plaza, Ground Floor, Ispahani Moor, Lalkhan Bazar, Chattogram 4150.', contact: '01933397550', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80', hours: '12:00 PM - 12:00 AM', rating: 4.8 },
  { id: 15, name: 'Mezzan Haile Ayun Agrabad', location: 'Sheikh Mujib Road, Agrabad, Chattogram 4101.', contact: '01907887020', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80', hours: '11:00 AM - 11:00 PM', rating: 4.7 },
  { id: 16, name: 'Barcode Food Junction Nizam Road', location: 'Baitul Aman Market, 943 O.R. Nizam Road, Chattogram 4000.', contact: '01958096550', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80', hours: '10:00 AM - 10:00 PM', rating: 4.8 },
  { id: 17, name: 'Mezzan Haile Ayun Eidgah', location: 'Opposite Yakub Ali Petrol Pump, DT Road, Eidgah, Chattogram 4000.', contact: '01907887024', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=600&q=80', hours: '11:00 AM - 11:00 PM', rating: 4.6 },
  { id: 18, name: 'Teheri Wala Lalkhan Bazar', location: 'Rahman Plaza, Ground Floor, Ispahani Moor, Lalkhan Bazar, Chattogram 4150.', contact: '01958096557', image: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=600&q=80', hours: '12:00 PM - 11:00 PM', rating: 4.8 },
  { id: 19, name: 'Bir Chattala Jamal Khan', location: 'Shahid Saifuddin Khaled Road, Jamalkhan, Chattogram 4000.', contact: '01914240988', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80', hours: '11:00 AM - 11:00 PM', rating: 4.9 },
  { id: 20, name: 'Barcode Cafe Bangla', location: 'East Nasirabad, Bayazid Bostami Road, 2 No Gate, Chattogram 4212.', contact: '01907887030', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80', hours: '12:00 PM - 12:00 AM', rating: 4.8 },
  { id: 21, name: 'Bir Chattala Lalkhan Bazar', location: 'Ahmed Center, Ispahani Circle, Lalkhan Bazar, Chattogram.', contact: '01907887023', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80', hours: '11:00 AM - 11:00 PM', rating: 4.7 },
  { id: 22, name: 'Barcode Cafe Banani', location: 'House 55/B, Road 21, Banani, Dhaka.', contact: '01735986411', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80', hours: '10:00 AM - 10:00 PM', rating: 4.8 },
];

export const branchesSeed = raw.map((b) => ({
  ...b,
  manager: 'Branch Manager',
  capacity: 120,
  features: FEATURES,
}));
