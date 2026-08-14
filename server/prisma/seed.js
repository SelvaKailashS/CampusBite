import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const canteens = [
  { id: "spicy", name: "Spicy", emoji: "🌶️", logoUrl: "/logos/spicy.png", location: "Ground Floor · Block B", status: "open", rating: 4.6, waitMin: 8, waitMax: 12, priceMin: 30, priceMax: 120, speciality: "Spicy snacks, noodles, fried rice, burgers", tagline: "Fiery flavours, campus favourite", gradient: "from-rose-500 via-orange-500 to-amber-400", accent: "text-rose-600", ordersAhead: 6 },
  { id: "cafeteria", name: "Cafeteria", emoji: "☕", logoUrl: "/logos/cafeteria.png", location: "1st Floor · Main Building", status: "busy", rating: 4.5, waitMin: 12, waitMax: 18, priceMin: 15, priceMax: 100, speciality: "Tea, coffee, sandwiches, snacks, quick meals", tagline: "Grab-and-go between lectures", gradient: "from-amber-700 via-orange-500 to-yellow-400", accent: "text-amber-700", ordersAhead: 18 },
  { id: "nehru", name: "Nehru Food Spot", emoji: "🍱", logoUrl: "/logos/nehru.png", location: "Nehru Block · Ground Floor", status: "open", rating: 4.7, waitMin: 10, waitMax: 15, priceMin: 40, priceMax: 150, speciality: "Meals, biryani, rice dishes, South Indian food", tagline: "Homely meals & signature biryani", gradient: "from-emerald-600 via-teal-500 to-cyan-400", accent: "text-emerald-700", ordersAhead: 9 },
  { id: "juice", name: "Fresh Juice", emoji: "🥤", logoUrl: "/logos/fresh-juice.png", location: "Sports Ground · Open Air", status: "open", rating: 4.8, waitMin: 3, waitMax: 6, priceMin: 25, priceMax: 80, speciality: "Fresh juices, smoothies, coconut water, fruit bowls", tagline: "Cold-pressed, zero preservatives", gradient: "from-lime-400 via-emerald-400 to-teal-400", accent: "text-teal-700", ordersAhead: 4 },
];

const foods = [
  { slug: "sp-cfr", canteenId: "spicy", name: "Chicken Fried Rice", price: 90, emoji: "🍚", category: "meals", diet: "non-veg", popular: true, protein: 22, calories: 480, description: "Wok-tossed rice with chicken, spring onion & chilli garlic.", healthTags: ["high-protein"], bg: "bg-orange-50" },
  { slug: "sp-vfr", canteenId: "spicy", name: "Veg Fried Rice", price: 70, emoji: "🥘", category: "meals", diet: "veg", protein: 8, calories: 380, description: "Colourful veggies tossed in schezwan sauce & basmati rice.", healthTags: [], bg: "bg-lime-50" },
  { slug: "sp-cn", canteenId: "spicy", name: "Chicken Noodles", price: 90, emoji: "🍜", category: "meals", diet: "non-veg", popular: true, protein: 20, calories: 460, description: "Hakka noodles with juicy chicken strips & fiery sauce.", healthTags: ["high-protein"], bg: "bg-amber-50" },
  { slug: "sp-pn", canteenId: "spicy", name: "Paneer Noodles", price: 80, emoji: "🍝", category: "meals", diet: "veg", protein: 14, calories: 420, description: "Silky noodles with soft paneer cubes and burnt garlic.", healthTags: ["high-protein"], bg: "bg-yellow-50" },
  { slug: "sp-c65", canteenId: "spicy", name: "Chicken 65", price: 100, emoji: "🍗", category: "snacks", diet: "non-veg", popular: true, protein: 26, calories: 340, description: "Deep-fried spicy chicken with curry leaves & green chilli.", healthTags: ["high-protein"], bg: "bg-red-50" },
  { slug: "sp-ff", canteenId: "spicy", name: "French Fries", price: 50, emoji: "🍟", category: "snacks", diet: "veg", calories: 320, description: "Crispy golden fries with peri-peri masala.", healthTags: [], bg: "bg-yellow-50" },
  { slug: "sp-cb", canteenId: "spicy", name: "Chicken Burger", price: 80, emoji: "🍔", category: "snacks", diet: "non-veg", popular: true, protein: 18, calories: 520, description: "Toasted bun, crispy chicken patty, lettuce & mayo.", healthTags: ["high-protein"], bg: "bg-orange-50" },
  { slug: "sp-mg", canteenId: "spicy", name: "Spicy Maggi", price: 50, emoji: "🍲", category: "snacks", diet: "veg", calories: 380, description: "2-minute Maggi upgraded with masala, veggies & cheese.", healthTags: ["under-40", "exam-focus"], bg: "bg-yellow-50" },

  { slug: "cf-tea", canteenId: "cafeteria", name: "Tea", price: 15, emoji: "🍵", category: "drinks", diet: "veg", popular: true, calories: 60, description: "Fresh brewed masala chai served piping hot.", healthTags: ["under-40", "exam-focus", "light-diet"], bg: "bg-amber-50" },
  { slug: "cf-cof", canteenId: "cafeteria", name: "Coffee", price: 20, emoji: "☕", category: "drinks", diet: "veg", popular: true, calories: 80, description: "Strong filter coffee — perfect for late-night study.", healthTags: ["under-40", "exam-focus"], bg: "bg-amber-50" },
  { slug: "cf-lt", canteenId: "cafeteria", name: "Lemon Tea", price: 20, emoji: "🍋", category: "drinks", diet: "veg", calories: 40, description: "Refreshing lemon tea with ginger & honey.", healthTags: ["under-40", "light-diet", "diabetes-safe"], bg: "bg-lime-50" },
  { slug: "cf-vs", canteenId: "cafeteria", name: "Veg Sandwich", price: 45, emoji: "🥪", category: "snacks", diet: "veg", protein: 9, calories: 260, description: "Grilled bread with cucumber, tomato, cheese slice.", healthTags: ["light-diet"], bg: "bg-lime-50" },
  { slug: "cf-cs", canteenId: "cafeteria", name: "Cheese Sandwich", price: 60, emoji: "🧀", category: "snacks", diet: "veg", protein: 12, calories: 380, description: "Loaded cheese sandwich with herb butter, grilled crisp.", healthTags: ["high-protein"], bg: "bg-yellow-50" },
  { slug: "cf-sm", canteenId: "cafeteria", name: "Samosa", price: 20, emoji: "🥟", category: "snacks", diet: "veg", popular: true, calories: 180, description: "Crispy triangle with spicy potato-pea filling.", healthTags: ["under-40"], bg: "bg-orange-50" },
  { slug: "cf-pf", canteenId: "cafeteria", name: "Puff", price: 25, emoji: "🥐", category: "snacks", diet: "veg", calories: 220, description: "Flaky veg puff — golden layers of buttery goodness.", healthTags: ["under-40"], bg: "bg-amber-50" },
  { slug: "cf-ff", canteenId: "cafeteria", name: "French Fries", price: 50, emoji: "🍟", category: "snacks", diet: "veg", calories: 320, description: "Classic salted fries, hot & crispy.", healthTags: [], bg: "bg-yellow-50" },
  { slug: "cf-ms", canteenId: "cafeteria", name: "Milkshake", price: 60, emoji: "🥤", category: "drinks", diet: "veg", protein: 8, calories: 320, description: "Chocolate or strawberry — thick, cold, blended fresh.", healthTags: [], bg: "bg-pink-50" },

  { slug: "nh-vm", canteenId: "nehru", name: "Veg Meals", price: 70, emoji: "🍛", category: "meals", diet: "veg", popular: true, protein: 15, calories: 620, description: "Rice, sambar, rasam, 2 curries, curd & papad.", healthTags: ["light-diet"], bg: "bg-emerald-50" },
  { slug: "nh-cm", canteenId: "nehru", name: "Chicken Meals", price: 100, emoji: "🍗", category: "meals", diet: "non-veg", protein: 32, calories: 780, description: "Full meals with chicken curry, rice & sides.", healthTags: ["high-protein"], bg: "bg-orange-50" },
  { slug: "nh-cb", canteenId: "nehru", name: "Chicken Biryani", price: 120, emoji: "🍱", category: "meals", diet: "non-veg", popular: true, protein: 28, calories: 720, description: "Aromatic long-grain biryani with tender chicken pieces.", healthTags: ["high-protein"], bg: "bg-amber-50" },
  { slug: "nh-eb", canteenId: "nehru", name: "Egg Biryani", price: 90, emoji: "🥚", category: "meals", diet: "non-veg", protein: 18, calories: 580, description: "Fragrant biryani with boiled eggs & mint raita.", healthTags: ["high-protein"], bg: "bg-yellow-50" },
  { slug: "nh-pr", canteenId: "nehru", name: "Parotta", price: 15, emoji: "🫓", category: "meals", diet: "veg", calories: 200, description: "Layered flaky parotta, served hot.", healthTags: ["under-40"], bg: "bg-amber-50" },
  { slug: "nh-cp", canteenId: "nehru", name: "Chicken Parotta", price: 90, emoji: "🌯", category: "meals", diet: "non-veg", popular: true, protein: 24, calories: 640, description: "Shredded parotta tossed with chicken & masala.", healthTags: ["high-protein"], bg: "bg-orange-50" },
  { slug: "nh-idli", canteenId: "nehru", name: "Idli", price: 30, emoji: "⚪", category: "meals", diet: "veg", protein: 6, calories: 160, description: "Soft steamed idlis with sambar & chutney.", healthTags: ["light-diet", "diabetes-safe", "jain", "under-40"], bg: "bg-lime-50" },
  { slug: "nh-dosa", canteenId: "nehru", name: "Dosa", price: 40, emoji: "🥞", category: "meals", diet: "veg", popular: true, protein: 8, calories: 280, description: "Crisp golden dosa with potato masala & chutneys.", healthTags: ["light-diet", "under-40"], bg: "bg-yellow-50" },
  { slug: "nh-c65", canteenId: "nehru", name: "Chicken 65", price: 100, emoji: "🍗", category: "snacks", diet: "non-veg", protein: 24, calories: 360, description: "South-Indian style spicy fried chicken.", healthTags: ["high-protein"], bg: "bg-red-50" },

  { slug: "jc-oj", canteenId: "juice", name: "Fresh Orange Juice", price: 40, emoji: "🍊", category: "drinks", diet: "veg", popular: true, calories: 110, description: "Freshly squeezed sweet oranges, no added sugar.", healthTags: ["light-diet", "diabetes-safe"], bg: "bg-orange-50" },
  { slug: "jc-wm", canteenId: "juice", name: "Watermelon Juice", price: 35, emoji: "🍉", category: "drinks", diet: "veg", popular: true, calories: 90, description: "Chilled watermelon blended with mint & rock salt.", healthTags: ["light-diet", "under-40"], bg: "bg-pink-50" },
  { slug: "jc-mg", canteenId: "juice", name: "Mango Shake", price: 60, emoji: "🥭", category: "drinks", diet: "veg", popular: true, protein: 6, calories: 280, description: "Alphonso mango blended with milk & a scoop of vanilla.", healthTags: [], bg: "bg-yellow-50" },
  { slug: "jc-sc", canteenId: "juice", name: "Sugarcane Juice", price: 30, emoji: "🎋", category: "drinks", diet: "veg", calories: 140, description: "Cold-pressed sugarcane with ginger & lime — instant energy.", healthTags: ["under-40"], bg: "bg-lime-50" },
  { slug: "jc-pg", canteenId: "juice", name: "Pomegranate Juice", price: 70, emoji: "🍎", category: "drinks", diet: "veg", calories: 130, description: "Rich in antioxidants, freshly juiced pomegranate.", healthTags: ["high-protein", "diabetes-safe"], bg: "bg-red-50" },
  { slug: "jc-ml", canteenId: "juice", name: "Mint Lime Cooler", price: 25, emoji: "🍋", category: "drinks", diet: "veg", calories: 60, description: "Zesty lime with fresh mint & a hint of black salt.", healthTags: ["under-40", "light-diet", "exam-focus"], bg: "bg-lime-50" },
  { slug: "jc-fb", canteenId: "juice", name: "Fruit Bowl", price: 80, emoji: "🥗", category: "meals", diet: "veg", popular: true, protein: 5, calories: 220, description: "Papaya, apple, grapes, pomegranate & muskmelon with chaat masala.", healthTags: ["light-diet", "diabetes-safe", "jain"], bg: "bg-lime-50" },
  { slug: "jc-cw", canteenId: "juice", name: "Tender Coconut", price: 45, emoji: "🥥", category: "drinks", diet: "veg", calories: 80, description: "Straight from the shell — natural electrolytes.", healthTags: ["light-diet", "diabetes-safe", "jain"], bg: "bg-emerald-50" },
];

async function main() {
  console.log("Seeding CampusBite database...\n");

  for (const c of canteens) {
    await prisma.canteen.upsert({ where: { id: c.id }, update: c, create: c });
    console.log(`  Canteen: ${c.emoji} ${c.name}`);
  }

  for (const f of foods) {
    await prisma.food.upsert({ where: { slug: f.slug }, update: f, create: f });
  }
  console.log(`\n  Seeded ${foods.length} food items`);

  const canteenCount = await prisma.canteen.count();
  const foodCount = await prisma.food.count();

  console.log(`\nDone! Database now has:`);
  console.log(`   ${canteenCount} canteens`);
  console.log(`   ${foodCount} food items\n`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });