import type { Canteen, FoodItem } from "./types";

export interface ComboDeal {
  id: string;
  title: string;
  emoji: string;
  description: string;
  price: number;
  originalPrice: number;
  protein: number;
  items: string[];
  save: number;
  accent: string;
}

export const comboDeals: ComboDeal[] = [
  {
    id: "combo-focus",
    title: "Exam All-Nighter Focus",
    emoji: "🧠",
    description: "Thick Cold Coffee + Double Egg Cheese Frankie for study sessions.",
    price: 75, originalPrice: 85, protein: 24, save: 12,
    items: ["Campus Special Cold Coffee", "Double Egg Cheese Frankie"],
    accent: "from-fuchsia-500 to-pink-500",
  },
  {
    id: "combo-gym",
    title: "Gym Bro ₹50 Protein Blast",
    emoji: "🏋️",
    description: "Boiled Egg Bowl (4 Whites) + Masala Buttermilk.",
    price: 45, originalPrice: 50, protein: 27, save: 10,
    items: ["Boiled Egg Bowl (4 Whites)", "Masala Spiced Buttermilk"],
    accent: "from-amber-500 to-orange-500",
  },
  {
    id: "combo-light",
    title: "Under ₹40 Light South Breakfast",
    emoji: "🌞",
    description: "3 Steamed Idlis + Chilled Spiced Buttermilk.",
    price: 38, originalPrice: 45, protein: 10, save: 15,
    items: ["Steamed Idli (3 pcs)", "Spiced Buttermilk"],
    accent: "from-lime-400 to-emerald-500",
  },
  {
    id: "combo-lunch",
    title: "Mega Student Lunch Combo",
    emoji: "🍱",
    description: "Student Budget Thali + Fresh Watermelon Juice.",
    price: 80, originalPrice: 90, protein: 23, save: 11,
    items: ["Student Budget Special Thali", "Fresh Watermelon Juice"],
    accent: "from-teal-400 to-cyan-500",
  },
];


export const canteens: Canteen[] = [
  {
    id: "spicy",
    name: "Spicy",
    emoji: "🌶️",
    logo: "/logos/spicy.png",
    status: "open",
    rating: 4.6,
    waitMin: 8,
    waitMax: 12,
    priceMin: 30,
    priceMax: 120,
    speciality: "Spicy snacks, noodles, fried rice, burgers",
    gradient: "from-rose-500 via-orange-500 to-amber-400",
    accent: "text-rose-600",
    ring: "ring-rose-200",
    ordersAhead: 6,
    tagline: "Fiery flavours, campus favourite",
    location: "Ground Floor · Block B",
  },
  {
    id: "cafeteria",
    name: "Cafeteria",
    emoji: "☕",
    logo: "/logos/cafeteria.png",
    status: "busy",
    rating: 4.5,
    waitMin: 12,
    waitMax: 18,
    priceMin: 15,
    priceMax: 100,
    speciality: "Tea, coffee, sandwiches, snacks, quick meals",
    gradient: "from-amber-700 via-orange-500 to-yellow-400",
    accent: "text-amber-700",
    ring: "ring-amber-200",
    ordersAhead: 18,
    tagline: "Grab-and-go between lectures",
    location: "1st Floor · Main Building",
  },
  {
    id: "nehru",
    name: "Nehru Food Spot",
    emoji: "🍱",
    logo: "/logos/nehru.png",
    status: "open",
    rating: 4.7,
    waitMin: 10,
    waitMax: 15,
    priceMin: 40,
    priceMax: 150,
    speciality: "Meals, biryani, rice dishes, South Indian food",
    gradient: "from-emerald-600 via-teal-500 to-cyan-400",
    accent: "text-emerald-700",
    ring: "ring-emerald-200",
    ordersAhead: 9,
    tagline: "Homely meals & signature biryani",
    location: "Nehru Block · Ground Floor",
  },
  {
    id: "juice",
    name: "Fresh Juice",
    emoji: "🥤",
    logo: "/logos/fresh-juice.png",
    status: "open",
    rating: 4.8,
    waitMin: 3,
    waitMax: 6,
    priceMin: 25,
    priceMax: 80,
    speciality: "Fresh juices, smoothies, coconut water, fruit bowls",
    gradient: "from-lime-400 via-emerald-400 to-teal-400",
    accent: "text-teal-700",
    ring: "ring-teal-200",
    ordersAhead: 4,
    tagline: "Cold-pressed, zero preservatives",
    location: "Sports Ground · Open Air",
  },
];

// Real food photography (Pexels)
const IMG = {
  chickenFriedRice: "https://images.pexels.com/photos/34668500/pexels-photo-34668500.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  vegFriedRice: "https://images.pexels.com/photos/10695966/pexels-photo-10695966.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  chickenNoodles: "https://images.pexels.com/photos/9045147/pexels-photo-9045147.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  paneerNoodles: "https://images.pexels.com/photos/28445827/pexels-photo-28445827.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  chicken65: "https://images.pexels.com/photos/35267270/pexels-photo-35267270.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  frenchFries: "https://images.pexels.com/photos/29150162/pexels-photo-29150162.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  chickenBurger: "https://images.pexels.com/photos/6850423/pexels-photo-6850423.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  maggi: "https://images.pexels.com/photos/8108044/pexels-photo-8108044.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  tea: "https://images.pexels.com/photos/36662612/pexels-photo-36662612.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  coffee: "https://images.pexels.com/photos/31844312/pexels-photo-31844312.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  lemonTea: "https://images.pexels.com/photos/36689348/pexels-photo-36689348.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  vegSandwich: "https://images.pexels.com/photos/34452168/pexels-photo-34452168.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  cheeseSandwich: "https://images.pexels.com/photos/13995291/pexels-photo-13995291.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  orangeJuice: "https://images.pexels.com/photos/6412584/pexels-photo-6412584.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  watermelonJuice: "https://images.pexels.com/photos/4113138/pexels-photo-4113138.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  mangoShake: "https://images.pexels.com/photos/31490093/pexels-photo-31490093.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  sugarcane: "https://images.pexels.com/photos/18295371/pexels-photo-18295371.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  pomegranate: "https://images.pexels.com/photos/9508010/pexels-photo-9508010.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  mintLime: "https://images.pexels.com/photos/18142599/pexels-photo-18142599.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  fruitBowl: "https://images.pexels.com/photos/11783272/pexels-photo-11783272.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  coconutWater: "https://images.pexels.com/photos/32831497/pexels-photo-32831497.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  samosa: "https://images.pexels.com/photos/37068875/pexels-photo-37068875.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  puff: "https://images.pexels.com/photos/441486/pexels-photo-441486.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  milkshake: "https://images.pexels.com/photos/18142621/pexels-photo-18142621.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  vegMeals: "https://images.pexels.com/photos/20422132/pexels-photo-20422132.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  chickenMeals: "https://images.pexels.com/photos/9792458/pexels-photo-9792458.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  chickenBiryani: "https://images.pexels.com/photos/28674660/pexels-photo-28674660.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  eggBiryani: "https://images.pexels.com/photos/35071825/pexels-photo-35071825.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  parotta: "https://images.pexels.com/photos/9609857/pexels-photo-9609857.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  chickenParotta: "https://images.pexels.com/photos/35071814/pexels-photo-35071814.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  idli: "https://images.pexels.com/photos/20422128/pexels-photo-20422128.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  dosa: "https://images.pexels.com/photos/20422138/pexels-photo-20422138.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
};

export const foods: FoodItem[] = [
  // Spicy
  { id: "sp-cfr", canteenId: "spicy", name: "Chicken Fried Rice", price: 90, emoji: "🍚", category: "meals", diet: "non-veg", popular: true, protein: 22, calories: 480, description: "Wok-tossed rice with chicken, spring onion & chilli garlic.", healthTags: ["high-protein"], bg: "bg-orange-50", image: IMG.chickenFriedRice },
  { id: "sp-vfr", canteenId: "spicy", name: "Veg Fried Rice", price: 70, emoji: "🥘", category: "meals", diet: "veg", protein: 8, calories: 380, description: "Colourful veggies tossed in schezwan sauce & basmati rice.", bg: "bg-lime-50", image: IMG.vegFriedRice },
  { id: "sp-cn", canteenId: "spicy", name: "Chicken Noodles", price: 90, emoji: "🍜", category: "meals", diet: "non-veg", popular: true, protein: 20, calories: 460, description: "Hakka noodles with juicy chicken strips & fiery sauce.", healthTags: ["high-protein"], bg: "bg-amber-50", image: IMG.chickenNoodles },
  { id: "sp-pn", canteenId: "spicy", name: "Paneer Noodles", price: 80, emoji: "🍝", category: "meals", diet: "veg", protein: 14, calories: 420, description: "Silky noodles with soft paneer cubes and burnt garlic.", healthTags: ["high-protein"], bg: "bg-yellow-50", image: IMG.paneerNoodles },
  { id: "sp-c65", canteenId: "spicy", name: "Chicken 65", price: 100, emoji: "🍗", category: "snacks", diet: "non-veg", popular: true, protein: 26, calories: 340, description: "Deep-fried spicy chicken with curry leaves & green chilli.", healthTags: ["high-protein"], bg: "bg-red-50", image: IMG.chicken65 },
  { id: "sp-ff", canteenId: "spicy", name: "French Fries", price: 50, emoji: "🍟", category: "snacks", diet: "veg", calories: 320, description: "Crispy golden fries with peri-peri masala.", bg: "bg-yellow-50", image: IMG.frenchFries },
  { id: "sp-cb", canteenId: "spicy", name: "Chicken Burger", price: 80, emoji: "🍔", category: "snacks", diet: "non-veg", popular: true, protein: 18, calories: 520, description: "Toasted bun, crispy chicken patty, lettuce & mayo.", healthTags: ["high-protein"], bg: "bg-orange-50", image: IMG.chickenBurger },
  { id: "sp-mg", canteenId: "spicy", name: "Spicy Maggi", price: 50, emoji: "🍲", category: "snacks", diet: "veg", calories: 380, description: "2-minute Maggi upgraded with masala, veggies & cheese.", healthTags: ["under-40", "exam-focus"], bg: "bg-yellow-50", image: IMG.maggi },

  // Cafeteria
  { id: "cf-tea", canteenId: "cafeteria", name: "Tea", price: 15, emoji: "🍵", category: "drinks", diet: "veg", popular: true, calories: 60, description: "Fresh brewed masala chai served piping hot.", healthTags: ["under-40", "exam-focus", "light-diet"], bg: "bg-amber-50", image: IMG.tea },
  { id: "cf-cof", canteenId: "cafeteria", name: "Coffee", price: 20, emoji: "☕", category: "drinks", diet: "veg", popular: true, calories: 80, description: "Strong filter coffee — perfect for late-night study.", healthTags: ["under-40", "exam-focus"], bg: "bg-amber-50", image: IMG.coffee },
  { id: "cf-lt", canteenId: "cafeteria", name: "Lemon Tea", price: 20, emoji: "🍋", category: "drinks", diet: "veg", calories: 40, description: "Refreshing lemon tea with ginger & honey.", healthTags: ["under-40", "light-diet", "diabetes-safe"], bg: "bg-lime-50", image: IMG.lemonTea },
  { id: "cf-vs", canteenId: "cafeteria", name: "Veg Sandwich", price: 45, emoji: "🥪", category: "snacks", diet: "veg", protein: 9, calories: 260, description: "Grilled bread with cucumber, tomato, cheese slice.", healthTags: ["light-diet"], bg: "bg-lime-50", image: IMG.vegSandwich },
  { id: "cf-cs", canteenId: "cafeteria", name: "Cheese Sandwich", price: 60, emoji: "🧀", category: "snacks", diet: "veg", protein: 12, calories: 380, description: "Loaded cheese sandwich with herb butter, grilled crisp.", healthTags: ["high-protein"], bg: "bg-yellow-50", image: IMG.cheeseSandwich },
  { id: "cf-sm", canteenId: "cafeteria", name: "Samosa", price: 20, emoji: "🥟", category: "snacks", diet: "veg", popular: true, calories: 180, description: "Crispy triangle with spicy potato-pea filling.", healthTags: ["under-40"], bg: "bg-orange-50", image: IMG.samosa },
  { id: "cf-pf", canteenId: "cafeteria", name: "Puff", price: 25, emoji: "🥐", category: "snacks", diet: "veg", calories: 220, description: "Flaky veg puff — golden layers of buttery goodness.", healthTags: ["under-40"], bg: "bg-amber-50", image: IMG.puff },
  { id: "cf-ff", canteenId: "cafeteria", name: "French Fries", price: 50, emoji: "🍟", category: "snacks", diet: "veg", calories: 320, description: "Classic salted fries, hot & crispy.", bg: "bg-yellow-50", image: IMG.frenchFries },
  { id: "cf-ms", canteenId: "cafeteria", name: "Milkshake", price: 60, emoji: "🥤", category: "drinks", diet: "veg", protein: 8, calories: 320, description: "Chocolate or strawberry — thick, cold, blended fresh.", bg: "bg-pink-50", image: IMG.milkshake },

  // Nehru
  { id: "nh-vm", canteenId: "nehru", name: "Veg Meals", price: 70, emoji: "🍛", category: "meals", diet: "veg", popular: true, protein: 15, calories: 620, description: "Rice, sambar, rasam, 2 curries, curd & papad.", healthTags: ["light-diet"], bg: "bg-emerald-50", image: IMG.vegMeals },
  { id: "nh-cm", canteenId: "nehru", name: "Chicken Meals", price: 100, emoji: "🍗", category: "meals", diet: "non-veg", protein: 32, calories: 780, description: "Full meals with chicken curry, rice & sides.", healthTags: ["high-protein"], bg: "bg-orange-50", image: IMG.chickenMeals },
  { id: "nh-cb", canteenId: "nehru", name: "Chicken Biryani", price: 120, emoji: "🍱", category: "meals", diet: "non-veg", popular: true, protein: 28, calories: 720, description: "Aromatic long-grain biryani with tender chicken pieces.", healthTags: ["high-protein"], bg: "bg-amber-50", image: IMG.chickenBiryani },
  { id: "nh-eb", canteenId: "nehru", name: "Egg Biryani", price: 90, emoji: "🥚", category: "meals", diet: "non-veg", protein: 18, calories: 580, description: "Fragrant biryani with boiled eggs & mint raita.", healthTags: ["high-protein"], bg: "bg-yellow-50", image: IMG.eggBiryani },
  { id: "nh-pr", canteenId: "nehru", name: "Parotta", price: 15, emoji: "🫓", category: "meals", diet: "veg", calories: 200, description: "Layered flaky parotta, served hot.", healthTags: ["under-40"], bg: "bg-amber-50", image: IMG.parotta },
  { id: "nh-cp", canteenId: "nehru", name: "Chicken Parotta", price: 90, emoji: "🌯", category: "meals", diet: "non-veg", popular: true, protein: 24, calories: 640, description: "Shredded parotta tossed with chicken & masala.", healthTags: ["high-protein"], bg: "bg-orange-50", image: IMG.chickenParotta },
  { id: "nh-idli", canteenId: "nehru", name: "Idli", price: 30, emoji: "⚪", category: "meals", diet: "veg", protein: 6, calories: 160, description: "Soft steamed idlis with sambar & chutney.", healthTags: ["light-diet", "diabetes-safe", "jain", "under-40"], bg: "bg-lime-50", image: IMG.idli },
  { id: "nh-dosa", canteenId: "nehru", name: "Dosa", price: 40, emoji: "🥞", category: "meals", diet: "veg", popular: true, protein: 8, calories: 280, description: "Crisp golden dosa with potato masala & chutneys.", healthTags: ["light-diet", "under-40"], bg: "bg-yellow-50", image: IMG.dosa },
  { id: "nh-c65", canteenId: "nehru", name: "Chicken 65", price: 100, emoji: "🍗", category: "snacks", diet: "non-veg", protein: 24, calories: 360, description: "South-Indian style spicy fried chicken.", healthTags: ["high-protein"], bg: "bg-red-50", image: IMG.chicken65 },

  // Fresh Juice
  { id: "jc-oj", canteenId: "juice", name: "Fresh Orange Juice", price: 40, emoji: "🍊", category: "drinks", diet: "veg", popular: true, calories: 110, description: "Freshly squeezed sweet oranges, no added sugar.", healthTags: ["light-diet", "diabetes-safe"], bg: "bg-orange-50", image: IMG.orangeJuice },
  { id: "jc-wm", canteenId: "juice", name: "Watermelon Juice", price: 35, emoji: "🍉", category: "drinks", diet: "veg", popular: true, calories: 90, description: "Chilled watermelon blended with mint & rock salt.", healthTags: ["light-diet", "under-40"], bg: "bg-pink-50", image: IMG.watermelonJuice },
  { id: "jc-mg", canteenId: "juice", name: "Mango Shake", price: 60, emoji: "🥭", category: "drinks", diet: "veg", popular: true, protein: 6, calories: 280, description: "Alphonso mango blended with milk & a scoop of vanilla.", bg: "bg-yellow-50", image: IMG.mangoShake },
  { id: "jc-sc", canteenId: "juice", name: "Sugarcane Juice", price: 30, emoji: "🎋", category: "drinks", diet: "veg", calories: 140, description: "Cold-pressed sugarcane with ginger & lime — instant energy.", healthTags: ["under-40"], bg: "bg-lime-50", image: IMG.sugarcane },
  { id: "jc-pg", canteenId: "juice", name: "Pomegranate Juice", price: 70, emoji: "🍎", category: "drinks", diet: "veg", calories: 130, description: "Rich in antioxidants, freshly juiced pomegranate.", healthTags: ["high-protein", "diabetes-safe"], bg: "bg-red-50", image: IMG.pomegranate },
  { id: "jc-ml", canteenId: "juice", name: "Mint Lime Cooler", price: 25, emoji: "🍋", category: "drinks", diet: "veg", calories: 60, description: "Zesty lime with fresh mint & a hint of black salt.", healthTags: ["under-40", "light-diet", "exam-focus"], bg: "bg-lime-50", image: IMG.mintLime },
  { id: "jc-fb", canteenId: "juice", name: "Fruit Bowl", price: 80, emoji: "🥗", category: "meals", diet: "veg", popular: true, protein: 5, calories: 220, description: "Papaya, apple, grapes, pomegranate & muskmelon with chaat masala.", healthTags: ["light-diet", "diabetes-safe", "jain"], bg: "bg-lime-50", image: IMG.fruitBowl },
  { id: "jc-cw", canteenId: "juice", name: "Tender Coconut", price: 45, emoji: "🥥", category: "drinks", diet: "veg", calories: 80, description: "Straight from the shell — natural electrolytes.", healthTags: ["light-diet", "diabetes-safe", "jain"], bg: "bg-emerald-50", image: IMG.coconutWater },
];

export const blocks = ["Block A", "Block B", "Block C", "Block D"];
export const roomsByBlock: Record<string, string[]> = {
  "Block A": ["A-101", "A-204", "A-304", "A-402"],
  "Block B": ["B-102", "B-205", "B-307", "B-410"],
  "Block C": ["C-101", "C-203", "C-305", "C-408"],
  "Block D": ["D-104", "D-206", "D-308", "D-401"],
};

export const orderStages = [
  { key: "confirmed", label: "Order Confirmed", emoji: "✅", desc: "Payment received & sent to kitchen" },
  { key: "preparing", label: "Preparing", emoji: "🍳", desc: "Chef is cooking your food fresh" },
  { key: "ready", label: "Ready", emoji: "📦", desc: "Show your token at counter" },
  { key: "runner", label: "Runner Assigned", emoji: "🏃", desc: "Runner picked up your order" },
  { key: "delivering", label: "On the way", emoji: "🚀", desc: "Heading to your desk" },
  { key: "delivered", label: "Delivered", emoji: "🎉", desc: "Enjoy your meal!" },
];

export const pickupStages = [
  { key: "confirmed", label: "Order Confirmed", emoji: "✅", desc: "Payment received & sent to kitchen" },
  { key: "preparing", label: "Preparing", emoji: "🍳", desc: "Chef is cooking your food fresh" },
  { key: "ready", label: "Ready for Pickup", emoji: "🎟️", desc: "Show your token at the counter" },
  { key: "collected", label: "Collected", emoji: "🎉", desc: "Enjoy your meal!" },
];

export const defaultRunners = [
  { id: "runner-1", name: "Ramesh Kumar", phone: "9876543210", status: "available" as const, avatar: "🛵", deliveriesCount: 14 },
  { id: "runner-2", name: "Vikas Singh", phone: "9876543211", status: "available" as const, avatar: "🚲", deliveriesCount: 9 },
  { id: "runner-3", name: "Suresh R.", phone: "9876543212", status: "on-delivery" as const, avatar: "🏃", deliveriesCount: 21 },
  { id: "runner-4", name: "Kiran Patel", phone: "9876543213", status: "available" as const, avatar: "⚡", deliveriesCount: 17 },
];
