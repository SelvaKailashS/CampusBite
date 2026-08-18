export type CanteenStatus = "open" | "busy" | "closed";
export type FoodCategory = "snacks" | "meals" | "drinks";
export type DietTag = "veg" | "non-veg" | "jain";
export type HealthTag =
  | "all"
  | "high-protein"
  | "diabetes-safe"
  | "exam-focus"
  | "light-diet"
  | "under-40"
  | "jain";

export type OrderMode = "pickup" | "delivery";
export type PaymentMode = "online-gpay" | "online-phonepe" | "online-paytm" | "online-upi" | "online-card" | "wallet" | "counter-cash";
export type PaymentStatus = "paid" | "pending";

export interface Canteen {
  id: string;
  name: string;
  emoji: string;
  logo: string;
  status: CanteenStatus;
  rating: number;
  waitMin: number;
  waitMax: number;
  priceMin: number;
  priceMax: number;
  speciality: string;
  gradient: string;
  accent: string;
  ring: string;
  ordersAhead: number;
  tagline: string;
  location: string;
}

export interface FoodItem {
  id: string;
  canteenId: string;
  name: string;
  price: number;
  emoji: string;
  category: FoodCategory;
  diet: DietTag;
  popular?: boolean;
  protein?: number;
  calories?: number;
  description: string;
  healthTags?: HealthTag[];
  bg: string;
  image?: string;
}

export interface CartItem {
  foodId: string;
  qty: number;
}

export interface DeliveryLocation {
  block: string;
  room: string;
  row: number;
  desk: number;
}

export interface Order {
  id: string;
  token: string;
  canteenId: string;
  items: { foodId: string; qty: number; name: string; price: number; emoji: string }[];
  total: number;
  mode: OrderMode;
  location?: DeliveryLocation;
  placedAt: number;
  etaMin: number;
  stage: number;
  student: string;
  payment: PaymentMode;
  paymentStatus: PaymentStatus;
}
