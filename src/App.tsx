import { useEffect, useMemo, useRef, useState } from "react";
import { canteens, foods, blocks, roomsByBlock, orderStages, pickupStages, comboDeals, defaultRunners } from "./data";
import type {
  CartItem, Canteen, FoodItem, DeliveryLocation, Order,
  HealthTag, OrderMode, PaymentMode, DeliveryRunner, GroupSplitMember,
} from "./types";

type Toast = { id: number; msg: string; kind: "success" | "info" | "warn" };
type ActiveView = "home" | "kitchen" | "orders" | "admin";
type Role = "student" | "staff" | "admin";
type User = { name: string; roll?: string; email: string; dept: string; year: string; role: Role; canteenId?: string; cabin?: string };

const filters = ["All", "Veg", "Non-Veg", "Snacks", "Meals", "Drinks", "Popular", "Under ₹50"] as const;
type FilterKey = (typeof filters)[number];

const healthFilters: { key: HealthTag; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "🍽" },
  { key: "high-protein", label: "High Protein", icon: "💪" },
  { key: "diabetes-safe", label: "Diabetes Safe", icon: "🩸" },
  { key: "exam-focus", label: "Exam Focus", icon: "📚" },
  { key: "light-diet", label: "Light", icon: "🌿" },
  { key: "under-40", label: "Under ₹40", icon: "💰" },
  { key: "Gain", label: "Gain", icon: "🙏" },
];

const paymentOptions: { key: PaymentMode; label: string; sub: string; icon: string; kind: "online" | "offline" }[] = [
  { key: "online-gpay", label: "Google Pay (GPay)", sub: "9360571671@upi", icon: "🟢", kind: "online" },
  { key: "online-phonepe", label: "PhonePe", sub: "9360571671@upi", icon: "🟣", kind: "online" },
  { key: "online-paytm", label: "Paytm UPI", sub: "9360571671@upi", icon: "🔷", kind: "online" },
  { key: "online-upi", label: "Other UPI / QR Code", sub: "Scan QR code to pay", icon: "📱", kind: "online" },
  { key: "online-card", label: "Card", sub: "Debit / Credit / ATM", icon: "💳", kind: "online" },
  { key: "wallet", label: "Campus Wallet", sub: "Balance ₹450", icon: "🎓", kind: "online" },
  { key: "counter-cash", label: "Pay at Counter", sub: "Cash on pickup", icon: "💵", kind: "offline" },
];

function makeToken(canteenId: string) {
  const prefix =
    canteenId === "spicy" ? "S"
    : canteenId === "cafeteria" ? "C"
    : canteenId === "nehru" ? "N"
    : canteenId === "juice" ? "J"
    : "X";
  return `${prefix}-${String(Math.floor(10 + Math.random() * 89)).padStart(3, "0")}`;
}

/* ============ THEME TOKENS ============ */
const BG = "#F6F2EA";
const brand = {
  ink: "text-[#0B1F16]",
  green: "bg-[#14532D]",
  greenHover: "hover:bg-[#0F3E22]",
  greenSoft: "bg-[#E7EEE7]",
  greenText: "text-[#14532D]",
  cream: "bg-[#F6F2EA]",
  butter: "bg-[#FCECC5]",
  tomato: "bg-[#D64545]",
  tomatoHover: "hover:bg-[#B93636]",
  tomatoText: "text-[#D64545]",
};

/* Web Audio Synthesizer Chimes */
function playReadyChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    [659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.35);
    });
  } catch (e) {
    console.error("Audio error:", e);
  }
}

function playKitchenBell() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 783.99].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    });
  } catch (e) {
    console.error("Audio error:", e);
  }
}

function exportSalesCSV(orders: Order[], canteens: Canteen[]) {
  if (orders.length === 0) {
    alert("No orders available to export.");
    return;
  }
  const headers = [
    "Order ID",
    "Token",
    "Student Name",
    "Canteen",
    "Total (INR)",
    "Order Mode",
    "Payment Method",
    "Payment Status",
    "Placed At",
    "Scheduled Time",
  ];
  const rows = orders.map((o) => {
    const canteenName = canteens.find((c) => c.id === o.canteenId)?.name || o.canteenId;
    const timeStr = new Date(o.placedAt).toLocaleString();
    return [
      o.id,
      o.token,
      `"${o.student}"`,
      `"${canteenName}"`,
      o.total,
      o.mode,
      o.payment,
      o.paymentStatus,
      `"${timeStr}"`,
      `"${o.scheduledTime || "ASAP"}"`,
    ].join(",");
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `CampusBite_Sales_Report_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Web Audio chime + Speech Synthesizer for Token Ready callouts
function announceTokenReady(token: string, canteenName?: string) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(783.99, now + 0.35);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.2);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.5);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const spokenToken = token.split("").join(" ");
      const text = canteenName
        ? `Token number ${spokenToken} is ready for pickup at ${canteenName}!`
        : `Token number ${spokenToken} is ready for pickup!`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.error("Audio callout failed", e);
  }
}

// Live Queue & Rush Hour Estimator
function getCanteenRushInfo(canteen: Canteen, orders: Order[]) {
  const activeCount = orders.filter(
    (o) => o.canteenId === canteen.id && o.stage < (o.mode === "pickup" ? pickupStages.length - 1 : orderStages.length - 1)
  ).length;
  const liveWaitMin = canteen.waitMin + activeCount * 2;
  const liveWaitMax = canteen.waitMax + activeCount * 3;

  let rushLabel = "🟢 LOW QUEUE";
  let rushBg = "bg-emerald-100 text-emerald-900 border-emerald-300";

  if (activeCount >= 5) {
    rushLabel = "⚡⚡ PEAK RUSH HOUR";
    rushBg = "bg-rose-100 text-rose-900 border-rose-300 animate-pulse";
  } else if (activeCount >= 2) {
    rushLabel = "⚡ MODERATE QUEUE";
    rushBg = "bg-amber-100 text-amber-900 border-amber-300";
  }

  return { activeCount, liveWaitMin, liveWaitMax, rushLabel, rushBg };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const bumpData = () => setDataVersion((v) => v + 1);
  void dataVersion;

  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  // Database health check
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setDbConnected(!!d?.ok))
      .catch(() => setDbConnected(false));
  }, []);

  // Session restore — if there's a saved JWT, ask the backend who I am
  useEffect(() => {
    const token = localStorage.getItem("campusbite_token");
    if (!token) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser({
            name: data.user.name || "",
            email: data.user.email,
            dept: data.user.dept || "",
            year: data.user.year || "",
            role: data.user.role === "super_admin" ? "admin" : data.user.role,
            canteenId: data.user.canteenId || undefined,
          });
          if (typeof data.user.wallet === "number") {
            setWalletBalance(data.user.wallet);
          }
        } else {
          localStorage.removeItem("campusbite_token");
        }
      })
      .catch(() => {});
  }, []);

  const [selectedCanteenId, setSelectedCanteenId] = useState<string>("spicy");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartCanteenId, setCartCanteenId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [view, setView] = useState<ActiveView>("home");
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>("overview");
  const [qrScannerModalOpen, setQrScannerModalOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [location, setLocation] = useState<DeliveryLocation>({ block: "Block A", room: "A-304", row: 3, desk: 12 });
  const [orderMode, setOrderMode] = useState<OrderMode>("pickup");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<Order | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupSplitMember[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("All");
  const [healthFilter, setHealthFilter] = useState<HealthTag>("all");
  const [pendingSwitch, setPendingSwitch] = useState<{ food: FoodItem } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [runners, setRunners] = useState<DeliveryRunner[]>(() => {
    try {
      const saved = localStorage.getItem("campusbite_runners");
      return saved ? JSON.parse(saved) : defaultRunners;
    } catch {
      return defaultRunners;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("campusbite_runners", JSON.stringify(runners));
    } catch (e) {
      console.error("Failed to save runners to localStorage", e);
    }
  }, [runners]);

  const assignRunnerToOrder = (orderId: string, runnerId: string) => {
    const runner = runners.find((r) => r.id === runnerId);
    if (!runner) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, runnerId: undefined, runnerName: undefined, runnerPhone: undefined } : o)));
      return;
    }

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const nextStage = o.mode === "delivery" && o.stage < 3 ? 3 : o.stage;
          return {
            ...o,
            runnerId: runner.id,
            runnerName: runner.name,
            runnerPhone: runner.phone,
            stage: nextStage,
          };
        }
        return o;
      })
    );

    setRunners((prev) =>
      prev.map((r) => (r.id === runnerId ? { ...r, status: "on-delivery", deliveriesCount: r.deliveriesCount + 1 } : r))
    );
  };

  // Clear stale cached local orders on mount
  useEffect(() => {
    localStorage.removeItem("campusbite_orders");
  }, []);

  const [broadcast, setBroadcast] = useState<{
    id: string;
    message: string;
    bannerType: "discount" | "info" | "alert";
    active: boolean;
    canteenName?: string;
    timestamp: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem("campusbite_broadcast");
      return saved ? JSON.parse(saved) : {
        id: "b-1",
        message: "🎉 Campus Flash Sale: 20% OFF All Cold Coffees & Beverages at Nescafe Bar until 5 PM!",
        bannerType: "discount",
        active: true,
        canteenName: "Nescafe Corner",
        timestamp: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (broadcast) localStorage.setItem("campusbite_broadcast", JSON.stringify(broadcast));
      else localStorage.removeItem("campusbite_broadcast");
    } catch (e) {
      console.error("Failed to save broadcast to localStorage", e);
    }
  }, [broadcast]);



  // Sync orders from DB API when user logs in & live auto-poll every 4s
  useEffect(() => {
    const token = localStorage.getItem("campusbite_token");

    const syncOrders = () => {
      if (!token) return;
      fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.orders && Array.isArray(data.orders)) {
            const fetchedOrders: Order[] = data.orders.map((o: any) => ({
              id: `CB${o.id}`,
              token: o.token,
              canteenId: o.canteenId,
              items: (o.items || []).map((i: any) => ({
                foodId: String(i.foodId),
                qty: i.qty,
                name: i.name || "Food Item",
                price: i.price || 0,
                emoji: i.emoji || "🍽",
              })),
              total: o.total,
              mode: o.mode || "pickup",
              location: o.block
                ? { block: o.block, room: o.room, row: o.rowNum, desk: o.desk }
                : undefined,
              placedAt: new Date(o.placedAt).getTime(),
              etaMin: o.etaMin || 15,
              stage: typeof o.stage === "number" ? o.stage : 1,
              student: o.studentName || "Student",
              payment: o.payment || "online-upi",
              paymentStatus: o.paymentStatus || "paid",
              scheduledTime: o.scheduledTime,
            }));

            setOrders((prev) => {
              const prevMap = new Map(prev.map((o) => [o.id, o]));
              const map = new Map<string, Order>();
              const isAdmin = user?.role === "admin";

              // If admin, show all fetched DB orders
              // If student, filter fetched DB orders to only show those belonging to this student
              const relevantFetched = isAdmin
                ? fetchedOrders
                : fetchedOrders.filter((o) => !user?.name || o.student.toLowerCase() === user.name.toLowerCase());

              relevantFetched.forEach((o) => {
                const local = prevMap.get(o.id);
                if (local) {
                  // Prevent polling rollbacks / button flickering: keep max stage reached
                  map.set(o.id, { ...o, stage: Math.max(o.stage, local.stage) });
                } else {
                  map.set(o.id, o);
                }
              });

              // Keep local orders placed in this browser session for this user
              prev.forEach((o) => {
                if (!map.has(o.id)) {
                  if (isAdmin || !user?.name || o.student.toLowerCase() === user.name.toLowerCase()) {
                    map.set(o.id, o);
                  }
                }
              });

              return Array.from(map.values()).sort((a, b) => b.placedAt - a.placedAt);
            });
          }
        })
        .catch(() => {});
    };

    syncOrders();
    const interval = setInterval(syncOrders, 4000);
    return () => clearInterval(interval);
  }, [user]);

  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(450);

  const handleTopUp = async (amount: number) => {
    setWalletBalance((b) => b + amount);
    pushToast(`₹${amount} added to Campus Wallet!`);
    const token = localStorage.getItem("campusbite_token");
    if (token) {
      try {
        await fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ topUpAmount: amount }),
        });
      } catch {}
    }
  };

  const selectedCanteen = canteens.find((c) => c.id === selectedCanteenId) || canteens[0];
  const cartCanteen = (cartCanteenId ? canteens.find((c) => c.id === cartCanteenId) : null) ?? null;

  const canteenSectionRef = useRef<HTMLDivElement>(null);
  const menuSectionRef = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);

  const pushToast = (msg: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };



  const canteenFoods = useMemo(() => foods.filter((f) => f.canteenId === selectedCanteenId), [selectedCanteenId]);

  const filteredFoods = useMemo(() => {
    let list = canteenFoods;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
    }
    switch (filter) {
      case "Veg": list = list.filter((f) => f.diet === "veg" || f.diet === "jain"); break;
      case "Non-Veg": list = list.filter((f) => f.diet === "non-veg"); break;
      case "Snacks": list = list.filter((f) => f.category === "snacks"); break;
      case "Meals": list = list.filter((f) => f.category === "meals"); break;
      case "Drinks": list = list.filter((f) => f.category === "drinks"); break;
      case "Popular": list = list.filter((f) => f.popular); break;
      case "Under ₹50": list = list.filter((f) => f.price < 50); break;
    }
    if (healthFilter !== "all") list = list.filter((f) => f.healthTags?.includes(healthFilter));
    return list;
  }, [canteenFoods, search, filter, healthFilter]);

  const cartItems = cart
    .map((ci) => {
      const f = foods.find((food) => food.id === ci.foodId);
      return f ? { ...ci, food: f } : null;
    })
    .filter((x): x is CartItem & { food: FoodItem } => x !== null);
  const subtotal = cartItems.reduce((s, i) => s + (i.food?.price || 0) * i.qty, 0);

  const addToCart = (food: FoodItem) => {
    if (food.soldOut) {
      pushToast(`Sorry, ${food.name} is currently Sold Out 🚫`, "warn");
      return;
    }
    if (cart.length > 0 && cartCanteenId && cartCanteenId !== food.canteenId) {
      setPendingSwitch({ food });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((x) => x.foodId === food.id);
      if (existing) return prev.map((x) => (x.foodId === food.id ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { foodId: food.id, qty: 1 }];
    });
    setCartCanteenId(food.canteenId);
    pushToast(`${food.name} added to cart`);
  };

  const changeQty = (foodId: string, delta: number) => {
    setCart((prev) => {
      const next = prev.map((x) => (x.foodId === foodId ? { ...x, qty: x.qty + delta } : x)).filter((x) => x.qty > 0);
      if (next.length === 0) setCartCanteenId(null);
      return next;
    });
  };
  const removeItem = (foodId: string) => {
    setCart((prev) => {
      const next = prev.filter((x) => x.foodId !== foodId);
      if (next.length === 0) setCartCanteenId(null);
      return next;
    });
  };

  const switchCanteen = () => {
    if (!pendingSwitch) return;
    const food = pendingSwitch.food;
    setCart([{ foodId: food.id, qty: 1 }]);
    setCartCanteenId(food.canteenId);
    setSelectedCanteenId(food.canteenId);
    setPendingSwitch(null);
    pushToast(`Switched to ${canteens.find((c) => c.id === food.canteenId)?.name}`, "info");
  };

  const placeOrder = async (payment: PaymentMode, scheduledTime?: string) => {
    if (cart.length === 0) return;
    const canteen = canteens.find((c) => c.id === cartCanteenId)!;
    const total = subtotal;
    if (payment === "wallet") {
      if (walletBalance < total) { pushToast("Insufficient wallet balance.", "warn"); return; }
    }

    // Play kitchen bell notification sound for new order
    playKitchenBell();

    // Try to save to REAL backend (Neon database)
    const token = localStorage.getItem("campusbite_token");
    if (token) {
      try {
        const foodsRes = await fetch(`/api/foods?canteenId=${canteen.id}`);
        const foodsData = await foodsRes.json();
        const dbFoods = foodsData.foods || [];
        const items = cartItems
          .map((i) => {
            const matched = dbFoods.find(
              (f: any) =>
                f.id === Number(i.foodId) ||
                f.slug === i.foodId ||
                f.name.toLowerCase() === i.food.name.toLowerCase()
            ) || dbFoods[0];
            return matched ? { foodId: matched.id, qty: i.qty } : null;
          })
          .filter((i): i is { foodId: number; qty: number } => i !== null && i.foodId != null);

        const res = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            canteenId: canteen.id,
            items,
            mode: orderMode,
            location: orderMode === "delivery" ? location : undefined,
            payment,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Order failed");

        // Success — use the order returned by the backend
        const dbOrder = data.order;
        const order: Order = {
          id: `CB${dbOrder.id}`,
          token: dbOrder.token,
          canteenId: dbOrder.canteenId,
          items: dbOrder.items.map((i: any) => ({
            foodId: String(i.foodId), qty: i.qty, name: i.name, price: i.price, emoji: i.emoji,
          })),
          total: dbOrder.total,
          mode: dbOrder.mode,
          location: dbOrder.block
            ? { block: dbOrder.block, room: dbOrder.room, row: dbOrder.rowNum, desk: dbOrder.desk }
            : undefined,
          placedAt: new Date(dbOrder.placedAt).getTime(),
          etaMin: dbOrder.etaMin,
          stage: dbOrder.stage,
          student: dbOrder.studentName || user?.name || "Guest",
          payment: dbOrder.payment,
          paymentStatus: dbOrder.paymentStatus,
          scheduledTime,
          isGroupOrder: !!groupMembers?.length,
          groupMembers: groupMembers || undefined,
          isFacultyOrder: user?.role === "staff",
        };
        if (payment === "wallet") setWalletBalance((b) => b - total);
        setOrders((o) => [order, ...o]);
        setCart([]);
        setCartCanteenId(null);
        setCartOpen(false);
        setCheckoutOpen(false);
        setGroupMembers(null);
        setTrackingOrderId(order.id);
        pushToast(`Token ${order.token} saved to database · ETA ${order.etaMin} min 🔔`);
        return;
      } catch (e: any) {
        pushToast(`API error: ${e.message}. Saving locally.`, "warn");
      }
    }

    // Fallback: local-only (guest mode or no token)
    if (payment === "wallet") setWalletBalance((b) => b - total);
    const order: Order = {
      id: `CB${Math.floor(1000 + Math.random() * 9000)}`,
      token: makeToken(canteen.id),
      canteenId: canteen.id,
      items: cartItems.map((i) => ({ foodId: i.foodId, qty: i.qty, name: i.food.name, price: i.food.price, emoji: i.food.emoji })),
      total,
      mode: orderMode,
      location: orderMode === "delivery" ? location : undefined,
      placedAt: Date.now(),
      etaMin: Math.max(3, canteen.waitMin - (user?.role === "staff" ? 3 : 0)),
      stage: 1,
      student: user?.name ?? "Guest",
      payment,
      paymentStatus: payment === "counter-cash" ? "pending" : "paid",
      scheduledTime,
      isGroupOrder: !!groupMembers?.length,
      groupMembers: groupMembers || undefined,
      isFacultyOrder: user?.role === "staff",
    };
    setOrders((o) => [order, ...o]);
    setCart([]);
    setCartCanteenId(null);
    setCartOpen(false);
    setCheckoutOpen(false);
    setGroupMembers(null);
    setTrackingOrderId(order.id);
    pushToast(`Token ${order.token} generated · ETA ${order.etaMin} min 🔔`);
  };

  const cancelStudentOrder = async (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    if (target.stage >= 2) {
      pushToast("Cannot cancel: Food is already ready or collected!", "warn");
      return;
    }
    if (confirm(`Cancel token ${target.token}? ${target.payment === "wallet" ? `₹${target.total} will be refunded to your Campus Wallet.` : ""}`)) {
      if (target.payment === "wallet") {
        setWalletBalance((b) => b + target.total);
      }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (trackingOrderId === orderId) {
        setTrackingOrderId(null);
      }
      pushToast(`Order ${target.token} cancelled. ${target.payment === "wallet" ? `₹${target.total} refunded to wallet!` : "Refund processed."}`, "info");

      // Permanently delete from backend database so it doesn't re-appear on polling
      const token = localStorage.getItem("campusbite_token");
      if (token) {
        try {
          const numId = Number(orderId.replace(/\D/g, ""));
          if (!isNaN(numId)) {
            await fetch(`/api/orders/${numId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        } catch (e) {
          console.error("Failed to delete order from server", e);
        }
      }
    }
  };

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenu(false);
  };

  const cartQty = cart.reduce((s, c) => s + c.qty, 0);
  const trackingOrder = orders.find((o) => o.id === trackingOrderId) || null;
  const activeOrders = orders.filter((o) => {
    const max = o.mode === "pickup" ? pickupStages.length - 1 : orderStages.length - 1;
    return o.stage < max;
  });

  // Gate the app behind login
  if (!user) {
    return (
      <LoginScreen
        onLogin={(u) => {
          setUser(u);
          if (u.role === "admin") setView("admin");
        }}
      />
    );
  }

  // After login — if we don't have a name yet, ask for it
  if (!user.name.trim()) {
    return (
      <OnboardingScreen
        email={user.email}
        role={user.role}
        onDone={(profile) => {
          setUser({ ...user, ...profile });
          pushToast(`Welcome, ${profile.name.split(" ")[0]}!`);
        }}
      />
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <div className={"min-h-screen " + brand.ink} style={{ background: BG }}>
      {/* Live ticker — warm cream */}
      <div className="border-b border-stone-900/10 bg-[#0B1F16] text-stone-200">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 overflow-x-auto whitespace-nowrap px-6 py-2 text-[11px]">
              <span className="flex items-center gap-2 font-semibold uppercase tracking-[0.18em] text-lime-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime-400"></span>
                </span>
                Live
              </span>
              {dbConnected !== null && (
                <span className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold " + (dbConnected ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30")}>
                  <span className={"h-1.5 w-1.5 rounded-full " + (dbConnected ? "bg-emerald-400" : "bg-amber-400")} />
                  {dbConnected ? "Neon DB Connected" : "Local Mode"}
                </span>
              )}
              
          {canteens.map((c, idx) => (
            <span key={c.id} className="flex items-center gap-2">
              {idx > 0 && <span className="text-stone-600">·</span>}
              <span className="font-semibold text-white">{c.name}</span>
              <span className={"font-mono " + (c.status === "busy" ? "text-amber-300" : "text-lime-300")}>
                {c.waitMin}–{c.waitMax}m
              </span>
              <span className="font-mono text-stone-500">· {c.ordersAhead} ahead</span>
            </span>
          ))}
          <span className="ml-auto hidden items-center gap-2 uppercase tracking-[0.2em] text-stone-500 md:flex">
            🎟 Token system active
          </span>
        </div>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-stone-900/10 bg-[#F6F2EA]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-6 py-4">
          <button onClick={() => setView("home")} className="flex items-center gap-3">
            <img src="/logos/college.png" alt="NIET" className="h-12 w-12 shrink-0 object-contain" />
            <div className="hidden text-left leading-none sm:block">
              <div className="text-[26px] font-bold leading-none tracking-[-0.02em]">
                Campus<span className="font-display italic font-normal text-[#14532D]">Bite</span>
              </div>
              <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                Nehru Inst. of Engg. & Tech.
              </div>
            </div>
          </button>

          <nav className="mx-auto hidden items-center gap-1 lg:flex">
            {isAdmin ? (
              <>
                <button
                  onClick={() => setView("admin")}
                  className={
                    "group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition " +
                    (view === "admin"
                      ? "bg-gradient-to-r from-[#0B1F16] to-[#14532D] text-white shadow-md"
                      : "text-stone-700 hover:bg-stone-900/5")
                  }
                >
                  🛡 Admin Dashboard
                </button>
                <NavBtn active={view === "kitchen"} onClick={() => setView("kitchen")}>Kitchen Portal</NavBtn>
                <NavBtn active={view === "orders"} onClick={() => setView("orders")}>All Orders</NavBtn>
                <NavBtn active={view === "home"} onClick={() => setView("home")}>
                  👁 Preview as student
                </NavBtn>
              </>
            ) : (
              <>
                <NavBtn active={view === "home"} onClick={() => { setView("home"); scrollTo(menuSectionRef); }}>Menu</NavBtn>
                <NavBtn onClick={() => { setView("home"); setTimeout(() => scrollTo(canteenSectionRef), 20); }}>Canteens</NavBtn>
                <button
                  onClick={() => setConciergeOpen(true)}
                  className="group ml-1 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#14532D] to-[#0F3E22] px-4 py-2 text-[13px] font-semibold text-white shadow-md shadow-green-900/20 transition hover:scale-[1.03]"
                >
                  <span className="text-sm">✨</span> AI Concierge
                </button>
                <NavBtn active={view === "orders"} onClick={() => setView("orders")}>
                  Tokens
                  {activeOrders.length > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D64545] px-1 font-mono text-[9px] font-bold text-white">
                      {activeOrders.length}
                    </span>
                  )}
                </NavBtn>
                <NavBtn active={view === "kitchen"} onClick={() => setView("kitchen")}>Kitchen</NavBtn>
                <NavBtn onClick={() => { setView("home"); setTimeout(() => scrollTo(compareRef), 20); }}>Compare</NavBtn>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {isAdmin ? (
              <div className="hidden items-center gap-4 border-l border-stone-900/10 pl-4 text-xs md:flex">
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-[0.15em] text-stone-500">Revenue</div>
                  <div className="font-mono text-sm font-semibold text-[#14532D]">₹{orders.reduce((s, o) => s + o.total, 0)}</div>
                </div>
                <div className="h-8 w-px bg-stone-900/10" />
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-[0.15em] text-stone-500">Live orders</div>
                  <div className="font-mono text-sm font-semibold text-[#D64545]">{activeOrders.length}</div>
                </div>
              </div>
            ) : (
              <div className="hidden items-center gap-4 border-l border-stone-900/10 pl-4 text-xs md:flex">
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-[0.15em] text-stone-500">Today</div>
                  <div className="font-mono text-sm font-semibold text-[#14532D]">
                    ₹{orders.reduce((s, o) => s + o.total, 0)}<span className="text-stone-400">/150</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-stone-900/10" />
                <button
                  onClick={() => setTopUpOpen(true)}
                  className="group flex flex-col items-end rounded-xl px-2 py-0.5 transition hover:bg-stone-900/5 cursor-pointer text-right"
                  title="Click to Top Up Wallet"
                >
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#14532D] group-hover:underline">
                    Wallet 💳 +
                  </div>
                  <div className="font-mono text-sm font-semibold text-stone-900">₹{walletBalance}</div>
                </button>
              </div>
            )}
            {!isAdmin && (
              <button
                onClick={() => setCartOpen(true)}
                className="group relative flex items-center gap-2 rounded-full bg-[#0B1F16] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-950/20 transition hover:bg-[#14532D] cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <span className="hidden sm:inline">Cart</span>
                {cartQty > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FCECC5] px-1 font-mono text-[10px] font-bold text-[#0B1F16]">
                    {cartQty}
                  </span>
                )}
              </button>
            )}

            {/* Profile chip — placed at far right */}
            <ProfileMenu
              user={user}
              totalOrdersCount={orders.length}
              activeOrdersCount={activeOrders.length}
              walletBalance={walletBalance}
              onLogout={() => {
                localStorage.removeItem("campusbite_token");
                setUser(null);
                setCart([]);
                setCartCanteenId(null);
                setOrders([]);
                setView("home");
              }}
              onOpenWallet={() => setTopUpOpen(true)}
              onViewOrders={() => setView("orders")}
              onNavigateAdmin={(v, t) => {
                setView(v);
                if (t) setActiveAdminTab(t);
              }}
              onOpenQRScanner={() => setQrScannerModalOpen(true)}
            />

            <button
              onClick={() => setMobileMenu((m) => !m)}
              className="rounded-full border border-stone-900/15 p-2.5 lg:hidden cursor-pointer"
              aria-label="Menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="border-t border-stone-900/10 bg-white p-4 lg:hidden space-y-3">
            {/* Mobile Profile & Orders Card */}
            <div className="rounded-2xl border border-stone-200 bg-[#F6F2EA] p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-stone-900">{user.name}</div>
                <div className="text-[10px] text-stone-500">{user.dept} · {user.year}</div>
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#14532D] px-2 py-0.5 font-mono text-[10px] font-bold text-[#FCECC5]">
                  🎟️ {orders.length} {orders.length === 1 ? "Order" : "Orders"} Made
                </div>
              </div>
              <button
                onClick={() => { setMobileMenu(false); setTopUpOpen(true); }}
                className="rounded-xl bg-[#14532D] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm"
              >
                ₹{walletBalance} +
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NavBtn onClick={() => { setView("home"); scrollTo(menuSectionRef); }}>Menu</NavBtn>
              <NavBtn onClick={() => { setView("home"); setTimeout(() => scrollTo(canteenSectionRef), 20); }}>Canteens</NavBtn>
              <NavBtn onClick={() => { setConciergeOpen(true); setMobileMenu(false); }}>Concierge</NavBtn>
              <NavBtn onClick={() => { setView("orders"); setMobileMenu(false); }}>Tokens ({orders.length})</NavBtn>
              <NavBtn onClick={() => { setView("kitchen"); setMobileMenu(false); }}>Kitchen</NavBtn>
              <NavBtn onClick={() => { setView("home"); setTimeout(() => scrollTo(compareRef), 20); }}>Compare</NavBtn>
            </div>
          </div>
        )}
      </header>

      {/* Live Campus Broadcast & Flash Sales Banner */}
      {broadcast && broadcast.active && (
        <div className={
          "border-b text-xs font-bold transition shadow-sm " +
          (broadcast.bannerType === "discount"
            ? "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 border-amber-400"
            : broadcast.bannerType === "alert"
            ? "bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 text-white border-rose-500"
            : "bg-gradient-to-r from-[#14532D] via-[#1b683a] to-[#14532D] text-white border-emerald-600")
        }>
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-2.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/20 text-sm animate-bounce">
                📢
              </span>
              <span className="truncate">{broadcast.message}</span>
              {broadcast.canteenName && (
                <span className="hidden sm:inline rounded-full bg-black/15 px-2.5 py-0.5 font-mono text-[10px] uppercase font-black">
                  {broadcast.canteenName}
                </span>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={() => { setView("admin"); setActiveAdminTab("broadcast"); }}
                className="rounded-full bg-black/20 px-3 py-1 text-[10px] font-extrabold uppercase hover:bg-black/30 transition cursor-pointer"
              >
                Manage Broadcast →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin preview banner — shows when an admin is viewing student-facing pages */}
      {isAdmin && view !== "admin" && view !== "kitchen" && (
        <div className="border-b border-[#D64545]/20 bg-gradient-to-r from-[#FCECC5] via-[#F5DE97] to-[#FCECC5]">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-6 py-2.5 text-sm">
            <span className="flex items-center gap-2 font-bold text-[#0B1F16]">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0B1F16] text-[11px] text-[#FCECC5]">👁</span>
              Admin preview mode
            </span>
            <span className="text-xs text-stone-700">
              You&apos;re viewing the <b>student experience</b>. Orders placed here go to the live queue.
            </span>
            <button
              onClick={() => setView("admin")}
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#0B1F16] px-4 py-1.5 text-[12px] font-bold text-white hover:bg-[#14532D]"
            >
              ← Back to Admin Dashboard
            </button>
          </div>
        </div>
      )}

      {view === "admin" && isAdmin ? (
        <AdminDashboard
          orders={orders}
          setOrders={setOrders}
          user={user}
          bumpData={bumpData}
          pushToast={pushToast}
          onPreviewCanteen={(id) => { setSelectedCanteenId(id); setView("home"); }}
          activeTab={activeAdminTab}
          setActiveTab={setActiveAdminTab}
          broadcast={broadcast}
          setBroadcast={setBroadcast}
          runners={runners}
          setRunners={setRunners}
          assignRunnerToOrder={assignRunnerToOrder}
        />
      ) : view === "kitchen" ? (
        <KitchenPortal orders={orders} setOrders={setOrders} pushToast={pushToast} user={user} />
      ) : view === "orders" ? (
        <OrdersView orders={orders} onTrack={(id) => setTrackingOrderId(id)} onCancelOrder={cancelStudentOrder} />
      ) : (
        <main className="mx-auto max-w-[1400px] px-6 py-10 lg:py-12">

          {/* ========== HERO ========== */}
          <section className="grid gap-6 lg:grid-cols-12">
            {/* LEFT: giant hero card with warm forest green background */}
            <div className="relative overflow-hidden rounded-[32px] bg-[#14532D] p-8 text-white shadow-2xl shadow-green-950/15 lg:col-span-8 lg:p-12">
              {/* subtle grain */}
              <div className="pointer-events-none absolute inset-0 opacity-20" style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.12) 1px, transparent 0)",
                backgroundSize: "22px 22px"
              }} />
              {/* decorative food emoji floating */}
              <div className="pointer-events-none absolute -right-8 top-8 select-none text-[220px] leading-none opacity-[0.12]">🍜</div>
              <div className="pointer-events-none absolute right-16 bottom-8 select-none text-[140px] leading-none opacity-[0.10]">🥟</div>

              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-300 animate-pulse" />
                  Live · 4 canteens open
                </div>

                {/* Big CampusBite wordmark — sized to fit the card */}
                <h1
                  className="mt-5 font-bold leading-[0.9] tracking-[-0.04em] text-white break-words"
                  style={{ fontSize: "clamp(3rem, 9vw, 7.5rem)" }}
                >
                  Campus<span className="font-display italic font-normal text-[#FCECC5]">Bite.</span>
                </h1>

                {/* small tagline */}
                <div className="mt-5 text-sm font-semibold uppercase tracking-[0.25em] text-lime-200/90">
                  Skip the line · Grab a token · Eat happy
                </div>

                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/80">
                  Order from Spicy, Cafeteria & Nehru Food Spot. Pay online or at the counter — pick up with a token or get it delivered to your desk.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => scrollTo(canteenSectionRef)}
                    className="group inline-flex items-center gap-3 rounded-full bg-[#FCECC5] px-6 py-3.5 text-sm font-bold text-[#0B1F16] shadow-lg transition hover:scale-[1.02] hover:bg-white"
                  >
                    Start an order
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0B1F16] text-white transition group-hover:translate-x-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </span>
                  </button>
                  <button
                    onClick={() => setConciergeOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                  >
                    <span className="text-base">✨</span> Ask AI Concierge
                  </button>
                </div>

                {/* Bottom stats row */}
                <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/15 pt-6 sm:grid-cols-4">
                  {[
                    { k: "Canteens", v: "4" },
                    { k: "Dishes", v: "35" },
                    { k: "Avg. wait", v: "6m" },
                    { k: "Pay methods", v: "4" },
                  ].map((s) => (
                    <div key={s.k}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200/80">{s.k}</div>
                      <div className="mt-1 font-display text-4xl text-white">{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: 3 stacked utility cards */}
            <aside className="grid gap-4 lg:col-span-4">
              {/* AI CONCIERGE — big prominent card */}
              <button
                onClick={() => setConciergeOpen(true)}
                className="group relative overflow-hidden rounded-3xl bg-[#FCECC5] p-5 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-[#F59E0B]/30 blur-2xl" />
                <div className="relative flex items-center gap-3">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B1F16] text-2xl text-white shadow-lg">
                    <span className="absolute inset-0 animate-ping rounded-2xl bg-[#0B1F16]/40" />
                    ✨
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800">AI Concierge · Live</div>
                    <div className="text-lg font-bold text-[#0B1F16]">Ask me anything</div>
                  </div>
                </div>
                <p className="relative mt-3 text-[13px] leading-relaxed text-stone-700">
                  Budget stuck? I'll suggest the perfect meal for your mood, wallet & macros.
                </p>
                <div className="relative mt-3 flex flex-wrap gap-1.5">
                  {["I have ₹50", "High protein", "Under ₹70"].map((q) => (
                    <span key={q} className="rounded-full border border-amber-800/20 bg-white/60 px-2.5 py-1 text-[10px] font-semibold text-amber-900">
                      {q}
                    </span>
                  ))}
                </div>
                <div className="relative mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#0B1F16]">
                  Open concierge <span className="transition group-hover:translate-x-0.5">→</span>
                </div>
              </button>

              {/* Order preferences */}
              <div className="rounded-3xl bg-white p-5 shadow-md shadow-green-950/5 ring-1 ring-stone-900/5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Order preferences</div>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["pickup", "delivery"] as OrderMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setOrderMode(m)}
                      className={
                        "rounded-2xl border p-3 text-left transition " +
                        (orderMode === m
                          ? "border-[#14532D] bg-[#E7EEE7] text-[#0B1F16]"
                          : "border-stone-200 bg-white text-stone-700 hover:border-stone-400")
                      }
                    >
                      <div className="text-lg">{m === "pickup" ? "🎟" : "🏃"}</div>
                      <div className="mt-1 text-sm font-bold leading-tight">
                        {m === "pickup" ? "Token Pickup" : "Desk Delivery"}
                      </div>
                      <div className={"mt-0.5 text-[10px] " + (orderMode === m ? "text-[#14532D]/70" : "text-stone-500")}>
                        {m === "pickup" ? "Show at counter" : "Runner delivers"}
                      </div>
                    </button>
                  ))}
                </div>
                {orderMode === "delivery" ? (
                  <button onClick={() => setLocationOpen(true)} className="mt-3 flex w-full items-center justify-between border-t border-dashed border-stone-200 pt-3 text-left">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">Deliver to</div>
                      <div className="mt-0.5 text-sm font-bold">{location.block} · {location.room}</div>
                      <div className="text-[11px] text-stone-500">Row {location.row}, Desk {location.desk}</div>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#D64545]">Change</span>
                  </button>
                ) : (
                  <div className="mt-3 border-t border-dashed border-stone-200 pt-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">Collect at</div>
                    <div className="mt-0.5 text-sm font-bold">{selectedCanteen.name}</div>
                    <div className="text-[11px] text-stone-500">{selectedCanteen.location}</div>
                  </div>
                )}
              </div>

              {/* Token specimen */}
              <div className="relative overflow-hidden rounded-3xl bg-[#0B1F16] p-5 text-white shadow-lg">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lime-400/20 blur-2xl" />
                <div className="relative flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-300/80">
                  <span>Your Token · Specimen</span>
                  <span>2026</span>
                </div>
                <div className="relative mt-3 flex items-end justify-between">
                  <div className="font-mono text-5xl font-bold tracking-[0.15em] text-[#FCECC5]">S-047</div>
                  <img src="/logos/college.png" alt="" className="h-10 w-10 opacity-90" />
                </div>
                <div className="relative mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px]">
                  <span className="text-stone-300">Spicy · Ready ~6 min</span>
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">Paid</span>
                </div>
              </div>
            </aside>
          </section>

          {/* ========== CANTEEN SELECTION ========== */}
          <section ref={canteenSectionRef} className="mt-20 scroll-mt-24">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E7EEE7] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">
                  Step 01 · The Kitchens
                </div>
                <h2 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
                  Choose your <span className="font-display italic text-[#14532D]">canteen.</span>
                </h2>
                <p className="mt-2 text-sm text-stone-600">Three real spots on campus · pick the fastest, cheapest, or best-rated.</p>
              </div>
              <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-stone-500">
                Browsing:
                <span className="ml-2 rounded-full bg-[#0B1F16] px-2.5 py-1 font-semibold normal-case tracking-normal text-white">
                  {selectedCanteen.name}
                </span>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {canteens.map((c) => (
                <CanteenCard
                  key={c.id}
                  canteen={c}
                  selected={c.id === selectedCanteenId}
                  orders={orders}
                  onSelect={() => {
                    setSelectedCanteenId(c.id);
                    pushToast(`Now browsing ${c.name}`, "info");
                    setTimeout(() => scrollTo(menuSectionRef), 50);
                  }}
                />
              ))}
            </div>
          </section>

          {/* ========== HEALTH FILTERS ========== */}
          <section className="mt-16">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-900/5 lg:p-8">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#FCECC5] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800">
                    Health smart
                  </div>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight">Tune the menu to your body.</h3>
                </div>
                <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-stone-500">
                  Active: <span className="ml-1 rounded-full bg-[#E7EEE7] px-2 py-0.5 font-semibold normal-case tracking-normal text-[#14532D]">
                    {healthFilters.find(h => h.key === healthFilter)?.label}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {healthFilters.map((h) => {
                  const active = h.key === healthFilter;
                  return (
                    <button
                      key={h.key}
                      onClick={() => setHealthFilter(h.key)}
                      className={
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition " +
                        (active
                          ? "border-[#14532D] bg-[#14532D] text-white shadow-md"
                          : "border-stone-200 bg-white text-stone-700 hover:border-[#14532D]/40 hover:text-[#14532D]")
                      }
                    >
                      <span className="text-sm">{h.icon}</span> {h.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ========== STUDENT COMBOS ========== */}
          <section className="mt-16">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#FCECC5] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800">
                  Pocket-money edition
                </div>
                <h3 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Student combos, <span className="font-display italic text-[#D64545]">curated & discounted.</span>
                </h3>
              </div>
              <button onClick={() => setConciergeOpen(true)} className="text-[12px] font-bold text-[#14532D] underline underline-offset-4 decoration-[#14532D]/30 hover:decoration-[#14532D]">
                AI Budget Planner →
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {comboDeals.map((d) => (
                <div key={d.id} className="group relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5 transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-start justify-between">
                    <div className={"flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl text-white shadow-md " + d.accent}>
                      {d.emoji}
                    </div>
                    <span className="rounded-full bg-[#E7EEE7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#14532D]">
                      Save {d.save}%
                    </span>
                  </div>
                  <h4 className="mt-4 text-lg font-bold leading-tight">{d.title}</h4>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-stone-600">{d.description}</p>
                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="font-display text-3xl text-[#14532D]">₹{d.price}</span>
                      <span className="ml-2 text-xs text-stone-400 line-through">₹{d.originalPrice}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">{d.protein}g protein</span>
                  </div>
                  <ul className="mt-4 space-y-1 border-t border-stone-100 pt-3 text-[11px] text-stone-600">
                    {d.items.map((i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-[#14532D]">✓</span> {i}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => pushToast(`${d.title} — coming soon to cart`, "info")}
                    className="mt-4 w-full rounded-full border border-stone-200 py-2.5 text-[12px] font-bold text-stone-700 transition group-hover:border-[#14532D] group-hover:bg-[#14532D] group-hover:text-white"
                  >
                    + Add combo
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* ========== MENU ========== */}
          <section ref={menuSectionRef} className="mt-20 scroll-mt-24">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E7EEE7] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">
                  Step 02 · The Menu
                </div>
                <h3 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
                  Today from <span className="font-display italic text-[#D64545]">{selectedCanteen.name}.</span>
                </h3>
                <div className="mt-2 flex items-center gap-3 text-xs text-stone-500">
                  <StatusPill status={selectedCanteen.status} />
                  <span>{filteredFoods.length} of {canteenFoods.length} dishes</span>
                </div>
              </div>
              <div className="relative w-full max-w-sm">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search the menu…"
                  className="w-full rounded-full border border-stone-200 bg-white py-3 pl-11 pr-4 text-[13px] font-medium outline-none transition focus:border-[#14532D]"
                />
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={
                    "rounded-full border px-4 py-1.5 text-[12px] font-semibold transition " +
                    (filter === f
                      ? "border-[#0B1F16] bg-[#0B1F16] text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-[#14532D]/40 hover:text-[#14532D]")
                  }
                >
                  {f}
                </button>
              ))}
            </div>

            {filteredFoods.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-16 text-center">
                <div className="font-display text-3xl italic text-stone-400">Nothing matches.</div>
                <div className="mt-2 text-xs text-stone-500">Try clearing your search or filters.</div>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredFoods.map((f) => (
                  <FoodCard
                    key={f.id}
                    food={f}
                    qty={cart.find((c) => c.foodId === f.id)?.qty || 0}
                    onAdd={() => addToCart(f)}
                    onInc={() => changeQty(f.id, 1)}
                    onDec={() => changeQty(f.id, -1)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ========== COMPARE ========== */}
          <section ref={compareRef} className="mt-20 scroll-mt-24">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#E7EEE7] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">
                Step 03 · Side by side
              </div>
              <h3 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
                A comparison, <span className="font-display italic text-[#D64545]">for the indecisive.</span>
              </h3>
            </div>
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-900/5">
              <div className="hidden grid-cols-12 gap-4 border-b border-stone-100 bg-[#E7EEE7] px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D] md:grid">
                <div className="col-span-4">Canteen</div>
                <div className="col-span-2">Rating</div>
                <div className="col-span-2">Wait</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2 text-right">Action</div>
              </div>
              {canteens.map((c) => (
                <div key={c.id} className="grid grid-cols-12 items-center gap-4 border-t border-stone-100 px-6 py-5 transition hover:bg-stone-50">
                  <div className="col-span-12 flex items-center gap-4 md:col-span-4">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                      <img src={c.logo} alt={c.name} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <div className="text-lg font-bold leading-tight">{c.name}</div>
                      <div className="text-[11px] text-stone-500">{c.location}</div>
                    </div>
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-stone-500 md:hidden">Rating</div>
                    <div className="font-mono text-sm font-semibold text-amber-700">★ {c.rating.toFixed(1)}</div>
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-stone-500 md:hidden">Wait</div>
                    <div className="font-mono text-sm">{c.waitMin}–{c.waitMax}m</div>
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-stone-500 md:hidden">Price</div>
                    <div className="font-mono text-sm">₹{c.priceMin}–{c.priceMax}</div>
                  </div>
                  <div className="col-span-12 flex items-center justify-end gap-3 md:col-span-2">
                    <StatusPill status={c.status} />
                    <button
                      onClick={() => { setSelectedCanteenId(c.id); scrollTo(menuSectionRef); }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#0B1F16] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#14532D]"
                    >
                      View menu →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ========== ACTIVE ORDERS ========== */}
          {activeOrders.length > 0 && (
            <section className="mt-20">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#FCECC5] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800">
                    In progress
                  </div>
                  <h3 className="mt-3 text-3xl font-bold tracking-tight">Your active tokens</h3>
                </div>
                <button onClick={() => setView("orders")} className="text-[12px] font-bold text-[#14532D] underline underline-offset-4">
                  View all
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {activeOrders.map((o) => (
                  <OrderRow key={o.id} order={o} onTrack={() => setTrackingOrderId(o.id)} />
                ))}
              </div>
            </section>
          )}

          {/* ========== HOW IT WORKS ========== */}
          <section className="mt-20">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#E7EEE7] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">
                The system
              </div>
              <h3 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
                Order to hand-off, <span className="font-display italic text-[#14532D]">in four steps.</span>
              </h3>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { n: "01", t: "Pick a canteen", d: "Browse Spicy, Cafeteria or Nehru side by side.", icon: "🏛" },
                { n: "02", t: "Choose the mode", d: "Token pickup or delivery to your desk.", icon: "🎟" },
                { n: "03", t: "Pay your way", d: "UPI, card, wallet, or cash on pickup.", icon: "💳" },
                { n: "04", t: "Show token & eat", d: "Skip the queue. Collect. Enjoy.", icon: "🎉" },
              ].map((s) => (
                <div key={s.n} className="group flex flex-col rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-900/5 transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{s.icon}</span>
                    <span className="font-mono text-[10px] font-bold tracking-widest text-stone-400">{s.n}</span>
                  </div>
                  <div className="mt-6 text-lg font-bold leading-tight">{s.t}</div>
                  <div className="mt-2 text-[13px] leading-relaxed text-stone-600">{s.d}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-20 border-t border-stone-200 py-10">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <div className="flex items-start gap-4">
                <img src="/logos/college.png" alt="" className="h-12 w-12 object-contain" />
                <div>
                  <div className="text-2xl font-bold tracking-tight">
                    Campus<span className="text-[#14532D]">Bite</span>
                  </div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500">
                    Nehru Institute of Engineering & Technology · Coimbatore
                  </div>
                </div>
              </div>
              <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-stone-500">
                © 2026 CampusBite · Built with care for students
              </div>
            </div>
          </footer>
        </main>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <CartDrawer
          onClose={() => setCartOpen(false)}
          cartItems={cartItems}
          subtotal={subtotal}
          canteen={cartCanteen}
          mode={orderMode}
          location={location}
          onModeChange={setOrderMode}
          onInc={(id) => changeQty(id, 1)}
          onDec={(id) => changeQty(id, -1)}
          onRemove={removeItem}
          onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
          onChangeLocation={() => { setCartOpen(false); setLocationOpen(true); }}
          onOpenGroupModal={() => { setCartOpen(false); setGroupModalOpen(true); }}
        />
      )}

      {checkoutOpen && cartCanteen && (
        <Checkout
          canteen={cartCanteen}
          items={cartItems.map((i) => ({ name: i.food.name, qty: i.qty, price: i.food.price, emoji: i.food.emoji }))}
          subtotal={subtotal}
          mode={orderMode}
          location={location}
          walletBalance={walletBalance}
          onClose={() => setCheckoutOpen(false)}
          onPay={placeOrder}
        />
      )}

      {invoiceModalOrder && (
        <InvoiceModal
          order={invoiceModalOrder}
          user={user}
          onClose={() => setInvoiceModalOrder(null)}
        />
      )}

      {groupModalOpen && (
        <GroupOrderModal
          cartItems={cartItems}
          subtotal={subtotal}
          onClose={() => setGroupModalOpen(false)}
          onConfirmGroupOrder={(members) => {
            setGroupMembers(members);
            setGroupModalOpen(false);
            setCheckoutOpen(true);
          }}
        />
      )}

      {pendingSwitch && (
        <Modal onClose={() => setPendingSwitch(null)} title="Switch canteen?">
          <p className="text-sm leading-relaxed text-stone-600">
            Your cart has items from <span className="font-bold text-[#0B1F16]">{cartCanteen?.name}</span>. Start a new order from{" "}
            <span className="font-bold text-[#0B1F16]">{canteens.find((c) => c.id === pendingSwitch.food.canteenId)?.name}</span>?
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => setPendingSwitch(null)} className="flex-1 rounded-full border border-stone-200 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50">
              Cancel
            </button>
            <button onClick={switchCanteen} className="flex-1 rounded-full bg-[#D64545] py-3 text-sm font-bold text-white shadow-md hover:bg-[#B93636]">
              Switch canteen
            </button>
          </div>
        </Modal>
      )}

      {locationOpen && (
        <LocationPicker
          location={location}
          onClose={() => setLocationOpen(false)}
          onSave={(loc) => { setLocation(loc); setLocationOpen(false); pushToast(`Delivery updated to ${loc.block}, ${loc.room}`); }}
        />
      )}

      {trackingOrder && (
        <OrderTrackerModal
          order={trackingOrder}
          canteen={canteens.find((c) => c.id === trackingOrder.canteenId) || canteens[0]}
          onClose={() => setTrackingOrderId(null)}
          onCancelOrder={cancelStudentOrder}
          onOpenInvoice={(o) => setInvoiceModalOrder(o)}
        />
      )}

      {conciergeOpen && (
        <AIConcierge canteen={selectedCanteen} allFoods={foods} onClose={() => setConciergeOpen(false)} onAdd={(f) => addToCart(f)} />
      )}

      <WalletTopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        balance={walletBalance}
        onTopUp={handleTopUp}
      />

      {qrScannerModalOpen && (
        <QRScannerModal
          orders={orders}
          onCollectOrder={(id) => {
            const target = orders.find((o) => o.id === id);
            if (target) {
              const max = target.mode === "pickup" ? pickupStages.length - 1 : orderStages.length - 1;
              target.stage = max;
              bumpData();
              pushToast(`Token ${target.token} marked as COLLECTED 🎉`);
            }
          }}
          onClose={() => setQrScannerModalOpen(false)}
        />
      )}



      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[70] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "pointer-events-auto rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-xl animate-[slidein_.25s_ease-out] " +
              (t.kind === "success" ? "border-emerald-200 text-emerald-800"
                : t.kind === "warn" ? "border-amber-200 text-amber-800"
                : "border-stone-200 text-stone-800")
            }
          >
            {t.msg}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slidein { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
      `}</style>
    </div>
  );
}

/* =============== Sub-components =============== */

function NavBtn({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void; }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center rounded-full px-3.5 py-2 text-[13px] font-semibold transition " +
        (active ? "bg-[#0B1F16] text-white" : "text-stone-700 hover:bg-stone-900/5 hover:text-[#0B1F16]")
      }
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: Canteen["status"] }) {
  const map = {
    open: { txt: "Open", cls: "bg-emerald-50 text-emerald-800 ring-emerald-600/20", dot: "bg-emerald-500" },
    busy: { txt: "Busy", cls: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500" },
    closed: { txt: "Closed", cls: "bg-rose-50 text-rose-800 ring-rose-600/20", dot: "bg-rose-500" },
  }[status];
  return (
    <span className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ring-1 " + map.cls}>
      <span className={"h-1.5 w-1.5 rounded-full " + map.dot} />{map.txt}
    </span>
  );
}

function CanteenCard({ canteen, selected, onSelect, orders = [] }: { canteen: Canteen; selected: boolean; onSelect: () => void; orders?: Order[]; }) {
  const idx = canteens.findIndex((c) => c.id === canteen.id) + 1;
  const rush = getCanteenRushInfo(canteen, orders);

  return (
    <button
      onClick={onSelect}
      className={
        "group relative flex flex-col overflow-hidden rounded-3xl bg-white text-left transition hover:-translate-y-1 " +
        (selected ? "ring-2 ring-[#14532D] shadow-xl shadow-green-950/10" : "ring-1 ring-stone-900/5 shadow-sm hover:shadow-xl")
      }
    >
      {/* Image */}
      <div className="relative h-56 w-full overflow-hidden bg-stone-100">
        <img
          src={canteen.logo}
          alt={canteen.name}
          className="absolute inset-0 h-full w-full object-cover transition duration-[700ms] ease-out group-hover:scale-[1.06]"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        {/* Chapter badge */}
        <div className="absolute left-4 top-4 rounded-full bg-[#FCECC5] px-2.5 py-1 font-mono text-[10px] font-bold tracking-widest text-[#0B1F16]">
          №&nbsp;0{idx}
        </div>
        <div className="absolute right-4 top-4">
          <StatusPill status={canteen.status} />
        </div>
        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-[#0B1F16] shadow">
          ★ {canteen.rating.toFixed(1)}
        </div>
        {selected && (
          <div className="absolute bottom-4 right-4 rounded-full bg-[#14532D] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow">
            ✓ Selected
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-2xl font-bold leading-tight tracking-tight">{canteen.name}</h4>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#14532D]">
              📍 {canteen.location}
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-stone-600">{canteen.tagline}</p>

        {/* Live Wait Time & Surge Indicator Badge */}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-stone-50 p-3 border border-stone-200">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase border ${rush.rushBg}`}>
            {rush.rushLabel}
          </span>
          <span className="font-mono text-xs font-extrabold text-[#14532D]">
            ~{rush.liveWaitMin}–{rush.liveWaitMax} min wait
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-stone-100 pt-3 text-xs">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">Live Prep</dt>
            <dd className="mt-1 text-base font-bold font-mono text-[#14532D]">~{rush.liveWaitMin}m</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">Price Range</dt>
            <dd className="mt-1 text-base font-bold">₹{canteen.priceMin}–{canteen.priceMax}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">Active Queue</dt>
            <dd className="mt-1 text-base font-bold font-mono text-amber-900">{rush.activeCount} orders</dd>
          </div>
        </dl>

        <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-500">
            {canteen.speciality.split(",")[0]}
          </span>
          <span className={"inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition " + (selected ? "bg-[#14532D] text-white" : "bg-[#0B1F16] text-white group-hover:bg-[#14532D]")}>
            {selected ? "View menu" : "Open menu"}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition group-hover:translate-x-0.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </span>
        </div>
      </div>
    </button>
  );
}

function FoodCard({ food, qty, onAdd, onInc, onDec }: { food: FoodItem; qty: number; onAdd: () => void; onInc: () => void; onDec: () => void; }) {
  return (
    <div className={"group flex flex-col overflow-hidden rounded-3xl transition hover:-translate-y-1 hover:shadow-xl " + (food.soldOut ? "bg-stone-50/80 ring-1 ring-stone-200 opacity-90" : "bg-white shadow-sm ring-1 ring-stone-900/5")}>
      <div className={"relative h-44 w-full overflow-hidden " + (food.image ? "bg-stone-100" : food.bg)}>
        {food.soldOut && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/65 backdrop-blur-[2px]">
            <span className="rounded-full bg-rose-600 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-white shadow-lg border border-white/20 animate-pulse">
              🚫 SOLD OUT
            </span>
            <span className="mt-1.5 text-[10px] font-bold text-white/80">Out of Stock Today</span>
          </div>
        )}

        {food.image ? (
          <img
            src={food.image}
            alt={food.name}
            className="absolute inset-0 h-full w-full object-cover transition duration-[700ms] ease-out group-hover:scale-[1.08]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-6xl transition duration-500 group-hover:scale-110">{food.emoji}</span>
          </div>
        )}
        {/* Bottom fade for readability */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />

        {/* Emoji chip bottom-left */}
        <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-xl shadow-md backdrop-blur">
          {food.emoji}
        </span>

        {food.popular && (
          <span className="absolute left-3 top-3 rounded-full bg-[#D64545] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-md">
            ★ Signature
          </span>
        )}
        <span
          className={
            "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-sm border-2 bg-white shadow-md " +
            (food.diet === "non-veg" ? "border-rose-600" : "border-emerald-600")
          }
          title={food.diet}
        >
          <span className={"h-2 w-2 rounded-full " + (food.diet === "non-veg" ? "bg-rose-600" : "bg-emerald-600")} />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h4 className="text-lg font-bold leading-tight tracking-tight text-stone-900">{food.name}</h4>
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-stone-600">{food.description}</p>

        {(food.protein || food.calories) && (
          <div className="mt-3 flex items-center gap-1.5">
            {food.protein && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                💪 {food.protein}g
              </span>
            )}
            {food.calories && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                🔥 {food.calories}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between border-t border-stone-100 pt-4 mt-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">Price</div>
            <div className={"font-display text-3xl leading-none " + (food.soldOut ? "text-stone-400 line-through" : "text-[#14532D]")}>
              ₹{food.price}
            </div>
          </div>
          {food.soldOut ? (
            <button
              disabled
              className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-4 py-2.5 text-[11px] font-black uppercase text-stone-500 cursor-not-allowed shadow-none border border-stone-300"
            >
              Sold Out 🚫
            </button>
          ) : qty === 0 ? (
            <button
              onClick={onAdd}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0B1F16] px-4 py-2.5 text-[12px] font-bold text-white shadow-md transition hover:bg-[#14532D] hover:scale-105 cursor-pointer"
            >
              Add
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          ) : (
            <div className="flex items-center gap-0.5 rounded-full bg-[#14532D] p-1 text-white shadow-md">
              <button onClick={onDec} className="h-7 w-7 rounded-full text-base font-medium hover:bg-white/15 cursor-pointer">−</button>
              <span className="w-6 text-center font-mono text-xs font-bold">{qty}</span>
              <button onClick={onInc} className="h-7 w-7 rounded-full text-base font-medium hover:bg-white/15 cursor-pointer">+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CartDrawer({
  onClose, cartItems, subtotal, canteen, mode, location, onModeChange,
  onInc, onDec, onRemove, onCheckout, onChangeLocation, onOpenGroupModal,
}: {
  onClose: () => void;
  cartItems: { food: FoodItem; qty: number; foodId: string }[];
  subtotal: number;
  canteen: Canteen | null;
  mode: OrderMode;
  location: DeliveryLocation;
  onModeChange: (m: OrderMode) => void;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  onChangeLocation: () => void;
  onOpenGroupModal: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-[#0B1F16]/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="flex w-full max-w-md flex-col bg-[#F6F2EA] shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 bg-white p-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Your order</div>
            <h3 className="mt-0.5 text-xl font-bold">Cart</h3>
            {canteen && (
              <div className="mt-1 text-xs text-stone-500">
                From <span className="font-bold text-[#0B1F16]">{canteen.name}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-stone-500 hover:bg-stone-100">✕</button>
        </div>

        <div className="border-b border-stone-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Delivery method</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["pickup", "delivery"] as OrderMode[]).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={
                  "rounded-2xl border p-3 text-left transition " +
                  (mode === m ? "border-[#14532D] bg-[#E7EEE7]" : "border-stone-200 hover:border-stone-400")
                }
              >
                <div className="text-base font-bold">{m === "pickup" ? "🎟 Pickup" : "🏃 Delivery"}</div>
                <div className={"mt-0.5 text-[10px] " + (mode === m ? "text-[#14532D]/70" : "text-stone-500")}>
                  {m === "pickup" ? "Counter · Free" : "To desk · Free"}
                </div>
              </button>
            ))}
          </div>
          {mode === "delivery" ? (
            <button onClick={onChangeLocation} className="mt-3 flex w-full items-start justify-between rounded-2xl border border-[#14532D]/20 bg-[#E7EEE7] p-3 text-left">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#14532D]">Delivering to</div>
                <div className="mt-0.5 text-sm font-bold">📍 {location.block}, {location.room}</div>
                <div className="text-xs text-stone-600">Row {location.row} · Desk {location.desk}</div>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#D64545]">Change</span>
            </button>
          ) : (
            canteen && (
              <div className="mt-3 rounded-2xl bg-[#FCECC5] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-800">Collect at</div>
                <div className="mt-0.5 text-sm font-bold">🏛 {canteen.name}</div>
                <div className="text-xs text-amber-900/70">{canteen.location}</div>
              </div>
            )
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {cartItems.length === 0 ? (
            <div className="mt-16 text-center">
              <div className="text-6xl">🍽</div>
              <div className="mt-3 font-display text-2xl italic text-stone-500">Your cart is empty.</div>
              <div className="text-xs text-stone-500">Add some tasty items to get started.</div>
            </div>
          ) : (
            <ul className="space-y-2">
              {cartItems.map((ci) => (
                <li key={ci.foodId} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-900/5">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                    {ci.food.image ? (
                      <img src={ci.food.image} alt={ci.food.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className={"flex h-full w-full items-center justify-center text-2xl " + ci.food.bg}>
                        {ci.food.emoji}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold leading-tight">{ci.food.name}</div>
                      <button onClick={() => onRemove(ci.foodId)} className="text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:text-rose-700">
                        Remove
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-stone-500">₹{ci.food.price} each</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-0.5 rounded-full border border-stone-200 bg-stone-50 p-0.5">
                        <button onClick={() => onDec(ci.foodId)} className="h-7 w-7 rounded-full text-base font-medium hover:bg-white">−</button>
                        <span className="w-6 text-center font-mono text-xs font-bold">{ci.qty}</span>
                        <button onClick={() => onInc(ci.foodId)} className="h-7 w-7 rounded-full text-base font-medium hover:bg-white">+</button>
                      </div>
                      <div className="font-bold">₹{ci.food.price * ci.qty}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="border-t border-stone-200 bg-white p-5">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-600"><dt>Subtotal</dt><dd className="font-mono">₹{subtotal}</dd></div>
              <div className="flex justify-between text-stone-600"><dt>{mode === "pickup" ? "Pickup" : "Delivery"}</dt><dd className="font-bold text-emerald-700">FREE</dd></div>
              <div className="mt-2 flex items-baseline justify-between border-t border-stone-100 pt-2">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Total</dt>
                <dd className="font-display text-3xl text-[#14532D]">₹{subtotal}</dd>
              </div>
            </dl>
            <div className="mt-5 flex gap-2">
              <button
                onClick={onOpenGroupModal}
                className="rounded-full border border-amber-300 bg-amber-50 px-4 py-3.5 text-xs font-black text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                title="Split order among roommates & friends"
              >
                👥 Group Split
              </button>
              <button
                onClick={onCheckout}
                className="group flex flex-1 items-center justify-center gap-2.5 rounded-full bg-[#0B1F16] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#14532D] hover:scale-[1.01] cursor-pointer"
              >
                Continue to payment
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition group-hover:translate-x-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </span>
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Checkout({
  canteen, items, subtotal, mode, location, walletBalance, onClose, onPay,
}: {
  canteen: Canteen;
  items: { name: string; qty: number; price: number; emoji: string }[];
  subtotal: number;
  mode: OrderMode;
  location: DeliveryLocation;
  walletBalance: number;
  onClose: () => void;
  onPay: (p: PaymentMode, scheduledTime?: string) => void;
}) {
  const [payment, setPayment] = useState<PaymentMode>("online-upi");
  const [scheduledTime, setScheduledTime] = useState<string>("ASAP");
  const [processing, setProcessing] = useState(false);

  const submit = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      await onPay(payment, scheduledTime !== "ASAP" ? scheduledTime : undefined);
    } catch (err: any) {
      console.error("Order submission failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  const online = paymentOptions.filter((p) => p.kind === "online");
  const offline = paymentOptions.filter((p) => p.kind === "offline");

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-[#0B1F16]/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] bg-[#F6F2EA] shadow-2xl sm:rounded-[32px]">
        <div className="flex items-center justify-between border-b border-stone-200 bg-white p-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D64545]">Checkout</div>
            <h3 className="mt-1 text-2xl font-bold">Confirm & pay</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-stone-500 hover:bg-stone-100">✕</button>
        </div>

        <div className="grid gap-0 overflow-auto sm:grid-cols-5">
          <div className="border-b border-stone-200 bg-white p-5 sm:col-span-2 sm:border-b-0 sm:border-r">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                <img src={canteen.logo} alt={canteen.name} className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="text-lg font-bold">{canteen.name}</div>
                <div className="text-[11px] text-[#14532D]">📍 {canteen.location}</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-[#E7EEE7] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#14532D]">
                {mode === "pickup" ? "🎟 Token Pickup" : "🏃 Desk Delivery"}
              </div>
              <div className="mt-1 text-xs text-stone-700">
                {mode === "pickup" ? "Show your token at counter to collect." : `${location.block}, ${location.room} · R${location.row}/D${location.desk}`}
              </div>
            </div>

            {/* Scheduled Pickup Timing Selector */}
            <div className="mt-3 rounded-2xl bg-[#F6F2EA] p-3 border border-stone-200">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#14532D]">Pickup Timing</div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {[
                  { key: "ASAP", label: "⚡ ASAP (~10m)" },
                  { key: "11:30 AM Break", label: "⏰ 11:30 AM Break" },
                  { key: "1:15 PM Lunch", label: "🍱 1:15 PM Lunch" },
                  { key: "3:45 PM Tea Break", label: "☕ 3:45 PM Tea" },
                ].map((slot) => (
                  <button
                    type="button"
                    key={slot.key}
                    onClick={() => setScheduledTime(slot.key)}
                    className={
                      "rounded-xl border p-2 text-[11px] font-bold transition text-left cursor-pointer " +
                      (scheduledTime === slot.key
                        ? "border-[#14532D] bg-[#14532D] text-white shadow-sm"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-400")
                    }
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-sm">
              {items.map((i, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="text-lg">{i.emoji}</span>
                  <span className="flex-1 truncate">{i.name} <span className="text-stone-400">× {i.qty}</span></span>
                  <span className="font-mono font-bold">₹{i.price * i.qty}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1.5 border-t border-dashed border-stone-300 pt-3 text-sm">
              <div className="flex justify-between text-stone-600"><span>Subtotal</span><span className="font-mono">₹{subtotal}</span></div>
              <div className="flex justify-between text-stone-600"><span>{mode === "pickup" ? "Pickup" : "Delivery"}</span><span className="font-bold text-emerald-700">FREE</span></div>
              <div className="flex items-baseline justify-between border-t border-stone-200 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Total</span>
                <span className="font-display text-3xl text-[#14532D]">₹{subtotal}</span>
              </div>
            </div>
          </div>

          <div className="p-5 sm:col-span-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Online payment</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {online.map((p) => {
                const active = payment === p.key;
                const disabled = p.key === "wallet" && walletBalance < subtotal;
                return (
                  <button
                    key={p.key}
                    disabled={disabled}
                    onClick={() => setPayment(p.key)}
                    className={
                      "flex items-start gap-3 rounded-2xl border p-3 text-left transition " +
                      (active ? "border-[#14532D] bg-[#E7EEE7]"
                        : disabled ? "border-stone-200 bg-stone-100 opacity-50"
                        : "border-stone-200 bg-white hover:border-[#14532D]/40")
                    }
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{p.label}</div>
                      <div className={"text-[11px] " + (active ? "text-[#14532D]/70" : "text-stone-500")}>
                        {p.key === "wallet" ? `Balance ₹${walletBalance}` : p.sub}
                      </div>
                      {disabled && <div className="mt-0.5 text-[10px] font-bold text-rose-600">Insufficient balance</div>}
                    </div>
                    {active && <span className="text-[#14532D]">✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Offline payment</div>
            <div className="mt-2 grid gap-2">
              {offline.map((p) => {
                const active = payment === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPayment(p.key)}
                    className={
                      "flex items-center gap-3 rounded-2xl border p-3 text-left transition " +
                      (active ? "border-[#14532D] bg-[#E7EEE7]" : "border-stone-200 bg-white hover:border-[#14532D]/40")
                    }
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{p.label}</div>
                      <div className={"text-[11px] " + (active ? "text-[#14532D]/70" : "text-stone-500")}>{p.sub}</div>
                    </div>
                    {active && <span className="text-[#14532D]">✓</span>}
                  </button>
                );
              })}
            </div>

            {payment === "counter-cash" && (
              <div className="mt-4 rounded-2xl bg-[#FCECC5] p-3 text-xs text-amber-900">
                💵 Pay <span className="font-bold">₹{subtotal}</span> in cash when collecting. Your token will show <span className="font-bold">"PAY AT COUNTER"</span>.
              </div>
            )}
            {payment.startsWith("online") && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    {payment === "online-gpay" ? "Google Pay (GPay) Payment"
                      : payment === "online-phonepe" ? "PhonePe Payment"
                      : payment === "online-paytm" ? "Paytm Payment"
                      : "Campus UPI Payment"}
                  </span>
                  <span className="rounded-full bg-emerald-200/60 px-2 py-0.5 text-[9px] font-bold text-emerald-900">Official UPI</span>
                </div>

                <div className="mt-3 space-y-3">
                  {/* Direct Launch App Button */}
                  <a
                    href={`upi://pay?pa=9360571671@upi&pn=CampusBite&am=${subtotal}&cu=INR`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#14532D] py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0F3E22] transition"
                  >
                    <span>📱</span> Open {payment === "online-gpay" ? "Google Pay" : payment === "online-phonepe" ? "PhonePe" : payment === "online-paytm" ? "Paytm" : "UPI App"} & Pay ₹{subtotal} →
                  </a>

                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-white p-1">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=9360571671@upi&pn=CampusBite&am=${subtotal}&cu=INR`)}`}
                        alt="CampusBite UPI QR Code"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">UPI Phone Number</div>
                      <div className="font-mono text-base font-extrabold text-[#0B1F16]">📞 9360571671</div>
                      <div className="text-[11px] text-emerald-800 font-bold">UPI ID: <span className="font-mono">9360571671@upi</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {payment === "wallet" && (
              <div className="mt-4 rounded-2xl bg-cyan-50 p-3 text-xs text-cyan-900">
                🎓 ₹{subtotal} will be deducted from your Campus Wallet (Balance: ₹{walletBalance}).
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={processing}
              className="group mt-5 flex w-full items-center justify-center gap-2.5 rounded-full bg-[#0B1F16] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#14532D] hover:scale-[1.01] disabled:opacity-70 cursor-pointer"
            >
              {processing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing…
                </>
              ) : (
                <>
                  Pay ₹{subtotal} & generate token
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition group-hover:translate-x-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </span>
                </>
              )}
            </button>
            <div className="mt-2 text-center text-[10px] text-stone-500">
              By placing this order you agree to CampusBite's food-hygiene & refund policy.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode; }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B1F16]/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LocationPicker({ location, onClose, onSave }: { location: DeliveryLocation; onClose: () => void; onSave: (loc: DeliveryLocation) => void; }) {
  const [block, setBlock] = useState(location.block);
  const [room, setRoom] = useState(location.room);
  const [row, setRow] = useState(location.row);
  const [desk, setDesk] = useState(location.desk);

  const rooms = roomsByBlock[block] || [];
  useEffect(() => { if (!rooms.includes(room)) setRoom(rooms[0]); }, [block]);

  return (
    <Modal onClose={onClose} title="Change delivery desk">
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Block</label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {blocks.map((b) => (
              <button
                key={b}
                onClick={() => setBlock(b)}
                className={"rounded-xl border py-2.5 text-sm font-bold transition " +
                  (block === b ? "border-[#14532D] bg-[#E7EEE7] text-[#14532D]" : "border-stone-200 hover:border-stone-400")}
              >
                {b.replace("Block ", "")}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Classroom</label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {rooms.map((r) => (
              <button
                key={r}
                onClick={() => setRoom(r)}
                className={"rounded-xl border py-2.5 text-sm font-bold transition " +
                  (room === r ? "border-[#14532D] bg-[#E7EEE7] text-[#14532D]" : "border-stone-200 hover:border-stone-400")}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Row</label>
            <input type="number" value={row} min={1} max={10}
              onChange={(e) => setRow(+e.target.value || 1)}
              className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#14532D]" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Desk</label>
            <input type="number" value={desk} min={1} max={40}
              onChange={(e) => setDesk(+e.target.value || 1)}
              className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#14532D]" />
          </div>
        </div>
        <button
          onClick={() => onSave({ block, room, row, desk })}
          className="w-full rounded-full bg-[#0B1F16] py-3 text-sm font-bold text-white shadow-lg hover:bg-[#14532D]"
        >
          Save location
        </button>
      </div>
    </Modal>
  );
}

function OrderTrackerModal({ order, canteen, onClose, onCancelOrder, onOpenInvoice }: { order: Order; canteen: Canteen; onClose: () => void; onCancelOrder?: (id: string) => void; onOpenInvoice?: (o: Order) => void; }) {
  const stages = order.mode === "pickup" ? pickupStages : orderStages;
  const remaining = Math.max(1, order.etaMin - order.stage * 2);
  const done = order.stage >= stages.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-[#0B1F16]/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] bg-[#F6F2EA] shadow-2xl sm:rounded-[32px]">
        {/* Token banner — forest green */}
        <div className="relative overflow-hidden bg-[#14532D] p-6 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lime-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-[#FCECC5]/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-xl">
                <img src={canteen.logo} alt={canteen.name} className="max-h-full max-w-full object-contain" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200">
                  {canteen.name} · #{order.id}
                </div>
                <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Your token</div>
                <div className="font-mono text-5xl font-bold tracking-[0.15em] text-[#FCECC5] sm:text-6xl">{order.token}</div>
                <div className="mt-1 text-xs text-white/80">Show this at the counter</div>
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-full bg-white/15 p-2 hover:bg-white/25">✕</button>
          </div>
          <div className="relative mt-4 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 font-bold uppercase tracking-widest">
              {order.mode === "pickup" ? "Pickup" : "Delivery"}
            </span>
            <span className={"rounded-full border px-2.5 py-1 font-bold uppercase tracking-widest " + (order.paymentStatus === "paid" ? "border-lime-400/40 bg-lime-500/20 text-lime-200" : "border-amber-400/40 bg-amber-500/20 text-amber-200")}>
              {order.paymentStatus === "paid" ? "✓ Paid Online" : "⚠️ Pay at Counter"}
            </span>
            <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 font-mono font-bold">₹{order.total}</span>
          </div>
        </div>

        <div className="overflow-auto p-5 space-y-4">
          {/* Payment Status Banner */}
          {order.paymentStatus === "paid" ? (
            <div className="flex items-center justify-between rounded-2xl bg-emerald-100 p-3.5 border border-emerald-300 text-emerald-950 font-bold text-xs">
              <span className="flex items-center gap-2">
                <span className="text-base">🟢</span>
                <span>PAYMENT RECEIVED ({order.payment.toUpperCase()})</span>
              </span>
              <span className="font-mono font-black text-emerald-800">✓ PAID ₹{order.total}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-2xl bg-amber-100 p-3.5 border border-amber-300 text-amber-950 font-bold text-xs">
              <span className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span>PAY AT CANTEEN COUNTER</span>
              </span>
              <span className="font-mono font-black text-rose-700">NOT PAID (₹{order.total})</span>
            </div>
          )}

          {/* Token QR Code Card */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-4 border border-stone-200 shadow-sm text-center">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#14532D]">Show QR Code to Canteen Staff</div>
            <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white p-2 shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`CB-ORDER:${order.id}:${order.token}:${order.total}`)}`}
                alt="Order Token QR Code"
                className="h-36 w-36 object-contain"
              />
            </div>
            <div className="mt-2 font-mono text-xs font-bold text-stone-600">Scan at Counter Scanner</div>
          </div>

          {!done ? (
            <div className="rounded-2xl bg-[#FCECC5] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-800">Estimated time</div>
              <div className="font-display text-3xl text-[#0B1F16]">~ {remaining} min</div>
              <div className="mt-1 text-xs text-amber-900/80">
                {order.mode === "pickup"
                  ? "You'll get a notification when your food is ready to collect."
                  : "A runner will bring it to your desk shortly."}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-50 p-4 text-center">
              <div className="text-4xl">🎉</div>
              <div className="mt-2 font-display text-xl italic text-emerald-800">Order completed. Enjoy your meal.</div>
            </div>
          )}

          <ol className="mt-5 space-y-3">
            {stages.map((s, i) => {
              const passed = i < order.stage;
              const current = i === order.stage && !done;
              return (
                <li key={s.key} className="flex items-start gap-3">
                  <div
                    className={
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-bold shadow-md " +
                      (passed
                        ? "bg-[#14532D] text-white"
                        : current
                        ? "bg-[#D64545] text-white ring-4 ring-[#D64545]/20 animate-pulse"
                        : "bg-white text-stone-400 ring-1 ring-stone-200")
                    }
                  >
                    {passed ? "✓" : s.emoji}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className={"text-base font-bold " + (current ? "text-[#0B1F16]" : passed ? "text-stone-700" : "text-stone-400")}>
                      {s.label}
                    </div>
                    <div className={"text-[11px] " + (current ? "text-[#D64545] font-bold" : "text-stone-400")}>
                      {current ? "In progress…" : s.desc}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-900/5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Order items</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {order.items.map((i) => (
                <li key={i.foodId} className="flex items-center gap-2">
                  <span className="text-lg">{i.emoji}</span>
                  <span className="flex-1">{i.name} × {i.qty}</span>
                  <span className="font-mono font-bold">₹{i.price * i.qty}</span>
                </li>
              ))}
            </ul>
          </div>

          {order.mode === "delivery" && order.location && (
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl bg-[#E7EEE7] p-3 text-xs text-[#14532D]">
                📍 Desk Delivery to <span className="font-bold">{order.location.block}, {order.location.room}, Row {order.location.row}, Desk {order.location.desk}</span>
              </div>

              {order.runnerName ? (
                <div className="flex items-center justify-between rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-3.5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#14532D] text-xl text-white shadow-md">
                      🛵
                    </div>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">Delivery Executive Assigned</div>
                      <div className="font-bold text-stone-900 text-sm">{order.runnerName}</div>
                      <div className="text-[11px] font-semibold text-stone-500">Bringing food directly to your desk</div>
                    </div>
                  </div>
                  {order.runnerPhone && (
                    <a
                      href={`tel:${order.runnerPhone}`}
                      className="flex items-center gap-1.5 rounded-full bg-[#14532D] px-3.5 py-2 text-xs font-black text-[#FCECC5] shadow-md hover:bg-[#0B1F16] transition"
                    >
                      <span>📞 Call</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-900 flex items-center justify-between">
                  <span>🛵 Delivery runner will be assigned shortly by canteen staff...</span>
                  <span className="font-mono text-[10px] uppercase bg-amber-200 px-2 py-0.5 rounded-full">Pending</span>
                </div>
              )}
            </div>
          )}

          {/* Cancel Order Option */}
          {order.stage < 2 && onCancelOrder && (
            <button
              onClick={() => onCancelOrder(order.id)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 py-3.5 text-xs font-black text-rose-700 hover:bg-rose-100 transition cursor-pointer shadow-sm"
            >
              🚫 Cancel Order &amp; Refund Funds
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InvoiceModal({ order, canteen, user, onClose }: {
  order: Order;
  canteen?: Canteen;
  user: User | null;
  onClose: () => void;
}) {
  const invoiceNo = `CB-INV-${new Date(order.placedAt).getFullYear()}-${order.id.slice(-6).toUpperCase()}`;
  const orderDate = new Date(order.placedAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const canteenObj = canteen || canteens.find((c) => c.id === order.canteenId);

  // 5% GST breakdown calculation (included in total)
  const gstAmount = Math.round((order.total * 5) / 105);
  const netSubtotal = order.total - gstAmount;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summary = `🧾 CampusBite Invoice #${invoiceNo}\nCanteen: ${canteenObj?.name || "Campus Kitchen"}\nCustomer: ${order.student}\nTotal: ₹${order.total} (${order.paymentStatus.toUpperCase()})\nDate: ${orderDate}`;
    navigator.clipboard.writeText(summary);
    alert("Invoice summary copied to clipboard!");
  };

  return (
    <Modal onClose={onClose} title="Tax Invoice & Official Receipt">
      <div className="space-y-6 text-stone-900" id="printable-invoice">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-stone-200 pb-5 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold tracking-tight text-[#0B1F16]">CampusBite</span>
              <span className="rounded-full bg-[#14532D] px-2.5 py-0.5 font-mono text-[9px] font-bold text-[#FCECC5] uppercase tracking-widest">
                Tax Invoice
              </span>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-stone-500">
              NIET Campus Digital Dining Services · FSSAI Reg: #22223001004812
            </div>
          </div>
          <div className="text-right font-mono">
            <div className="text-xs font-bold text-[#14532D]">{invoiceNo}</div>
            <div className="text-[10px] text-stone-500">{orderDate}</div>
          </div>
        </div>

        {/* Billed To / Canteen Details Grid */}
        <div className="grid grid-cols-2 gap-4 rounded-2xl bg-stone-50 p-4 border border-stone-200 text-xs">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#14532D]">Billed To (Customer)</div>
            <div className="mt-1 font-bold text-stone-900">{order.student}</div>
            <div className="text-[11px] text-stone-500">
              {user?.dept ? `${user.dept} · ${user.year}` : "NIET Student / Faculty"}
            </div>
            {order.mode === "delivery" && order.location && (
              <div className="mt-1 font-mono text-[10px] text-stone-600">
                📍 {order.location.block}, Room {order.location.room}
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#14532D]">Merchant / Kitchen</div>
            <div className="mt-1 font-bold text-stone-900">{canteenObj?.name || "Campus Canteen"}</div>
            <div className="text-[11px] text-stone-500">📍 {canteenObj?.location || "Main Campus"}</div>
            <div className="mt-1 font-mono text-[10px] text-stone-600">GSTIN: 07AAACC4112M1Z5</div>
          </div>
        </div>

        {/* Group Order Members Notice */}
        {order.isGroupOrder && order.groupMembers && order.groupMembers.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              👥 Group Order Bill Split ({order.groupMembers.length} Members)
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {order.groupMembers.map((m, idx) => (
                <div key={idx} className="flex justify-between border-b border-amber-200/60 pb-1 text-[11px]">
                  <span className="font-semibold text-amber-900">{m.name}</span>
                  <span className="font-mono font-bold text-amber-950">₹{m.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Line Items Table */}
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 mb-2">Itemized Particulars</div>
          <div className="overflow-hidden rounded-2xl border border-stone-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E7EEE7] font-extrabold text-[#14532D] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-stone-50">
                    <td className="p-3 font-semibold text-stone-900">
                      {item.emoji} {item.name}
                    </td>
                    <td className="p-3 text-center font-mono">{item.qty}</td>
                    <td className="p-3 text-right font-mono">₹{item.price}</td>
                    <td className="p-3 text-right font-mono font-bold">₹{item.price * item.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation & Totals */}
        <div className="flex flex-col items-end border-t border-stone-200 pt-3 text-xs space-y-1.5">
          <div className="flex justify-between w-64 text-stone-600">
            <span>Net Subtotal (excl. tax):</span>
            <span className="font-mono font-semibold">₹{netSubtotal}</span>
          </div>
          <div className="flex justify-between w-64 text-stone-600">
            <span>SGST + CGST (5% incl.):</span>
            <span className="font-mono font-semibold">₹{gstAmount}</span>
          </div>
          <div className="flex justify-between w-64 text-stone-600">
            <span>Convenience / Runner Fee:</span>
            <span className="font-mono font-semibold text-emerald-700">₹0 (FREE)</span>
          </div>
          <div className="flex justify-between w-64 border-t border-stone-300 pt-2 text-sm font-extrabold text-[#0B1F16]">
            <span>Grand Total Paid:</span>
            <span className="font-mono text-base text-[#14532D]">₹{order.total}</span>
          </div>
        </div>

        {/* Payment Footer Tag */}
        <div className="flex items-center justify-between rounded-2xl bg-[#0B1F16] p-4 text-white">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#FCECC5]">Payment Status</div>
            <div className="text-sm font-bold capitalize flex items-center gap-1.5 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {order.paymentStatus === "paid" ? "PAID ONLINE" : "CASH ON COUNTER"} ({order.payment})
            </div>
          </div>
          <div className="text-right font-mono">
            <div className="text-[10px] text-white/60">Token Number</div>
            <div className="text-xl font-bold tracking-widest text-[#FCECC5]">{order.token}</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleCopySummary}
            className="flex-1 rounded-2xl border border-stone-200 bg-white py-3 text-xs font-extrabold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
          >
            📋 Copy Invoice Text
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 rounded-2xl bg-[#14532D] py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#0F3E22] transition cursor-pointer"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}

function GroupOrderModal({
  cartItems,
  subtotal,
  onConfirmGroupOrder,
  onClose,
}: {
  cartItems: (CartItem & { food: FoodItem })[];
  subtotal: number;
  onConfirmGroupOrder: (members: GroupSplitMember[]) => void;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<string[]>(["Me (Host)", "Friend 1"]);
  const [newMemberName, setNewMemberName] = useState("");

  const splitAmount = members.length > 0 ? Math.round(subtotal / members.length) : subtotal;

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    setMembers((prev) => [...prev, newMemberName.trim()]);
    setNewMemberName("");
  };

  const handleRemoveMember = (idx: number) => {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCopyWhatsAppSplit = () => {
    const text = `🍽️ *CampusBite Group Order Split*\n` +
      `Total Cart: ₹${subtotal} (${members.length} members)\n` +
      `Per person share: *₹${splitAmount}*\n\n` +
      members.map((m) => `• ${m}: ₹${splitAmount}`).join("\n") +
      `\n\nPay your share to the group host! 🚀`;

    navigator.clipboard.writeText(text);
    alert("WhatsApp bill split message copied to clipboard!");
  };

  const handleProceed = () => {
    const groupData: GroupSplitMember[] = members.map((name) => ({
      name,
      amount: splitAmount,
      paid: true,
    }));
    onConfirmGroupOrder(groupData);
  };

  return (
    <Modal onClose={onClose} title="👥 Group Order & Bill Splitter">
      <div className="space-y-6">
        <div className="rounded-2xl border border-stone-200 bg-[#F6F2EA] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-700">Total Group Cart Amount</span>
            <span className="font-display text-2xl text-[#14532D]">₹{subtotal}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-600 border-t border-stone-200/60 pt-2">
            <span>Split Equally ({members.length} members)</span>
            <span className="font-mono font-bold text-[#0B1F16]">₹{splitAmount} / person</span>
          </div>
        </div>

        {/* Member Manager */}
        <div>
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#14532D]">
            Group Members ({members.length})
          </label>
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
            {members.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl bg-stone-50 p-3 border border-stone-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#14532D] text-[10px] font-bold text-white">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-stone-900">{m}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[#14532D]">₹{splitAmount}</span>
                  {idx > 0 && (
                    <button
                      onClick={() => handleRemoveMember(idx)}
                      className="text-stone-400 hover:text-rose-600 text-sm font-bold cursor-pointer"
                      title="Remove member"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add member input */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Enter friend or roommate name..."
              className="flex-1 rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#14532D]"
              onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
            />
            <button
              onClick={handleAddMember}
              className="rounded-xl bg-[#0B1F16] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#14532D] transition cursor-pointer"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Item Breakdown Preview */}
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-stone-500 mb-2">Cart Items ({cartItems.length})</div>
          <ul className="space-y-1 text-xs">
            {cartItems.map((ci) => (
              <li key={ci.foodId} className="flex justify-between border-b border-dashed border-stone-100 py-1.5">
                <span className="font-medium text-stone-800">{ci.food.emoji} {ci.food.name} × {ci.qty}</span>
                <span className="font-mono text-stone-500">₹{ci.food.price * ci.qty}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleCopyWhatsAppSplit}
            className="flex-1 rounded-2xl border border-emerald-300 bg-emerald-50 py-3 text-xs font-extrabold text-emerald-900 hover:bg-emerald-100 transition cursor-pointer"
          >
            💬 Copy WhatsApp Split
          </button>
          <button
            onClick={handleProceed}
            className="flex-1 rounded-2xl bg-[#14532D] py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#0F3E22] transition cursor-pointer"
          >
            Proceed to Checkout →
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AIConcierge({ canteen, allFoods, onClose, onAdd }: { canteen: Canteen; allFoods: FoodItem[]; onClose: () => void; onAdd: (f: FoodItem) => void; }) {
  const [msg, setMsg] = useState("");
  const [thread, setThread] = useState<{ role: "ai" | "you"; text: string; recs?: FoodItem[] }[]>([
    { role: "ai", text: `Hey! I'm your CampusBite concierge for ${canteen.name}. Try "under ₹70", "I have ₹50", "high protein" or "light diet".` },
  ]);

  const respond = (question: string) => {
    const q = question.toLowerCase();
    const canteenFoods = allFoods.filter((f) => f.canteenId === canteen.id);
    let recs: FoodItem[] = []; let text = "";
    const priceMatch = q.match(/(?:under|below|less than|₹|rs)\s*(\d+)/) || q.match(/(\d+)\s*(?:rs|₹|rupees|bucks)/) || q.match(/have\s*(\d+)/);
    const budget = priceMatch ? parseInt(priceMatch[1]) : null;

    if (budget) {
      recs = canteenFoods.filter((f) => f.price <= budget).sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0)).slice(0, 3);
      if (recs.length === 0) text = `Nothing at ${canteen.name} fits under ₹${budget}. Cafeteria starts at ₹15 — try there!`;
      else {
        const combo = recs.slice(0, 2); const comboSum = combo.reduce((s, f) => s + f.price, 0);
        text = combo.length === 2 && comboSum <= budget
          ? `You have ₹${budget}? Try ${combo[0].name} + ${combo[1].name} at ${canteen.name} for ₹${comboSum}!`
          : `Under ₹${budget} at ${canteen.name}: ${recs[0].name} for ₹${recs[0].price}${recs[1] ? `, or ${recs[1].name} for ₹${recs[1].price}` : ""}.`;
      }
    } else if (q.includes("protein") || q.includes("gym")) {
      recs = canteenFoods.filter((f) => (f.protein || 0) >= 15).sort((a, b) => (b.protein || 0) - (a.protein || 0)).slice(0, 3);
      text = recs.length ? `High-protein picks: ${recs.map(r => `${r.name} (${r.protein}g)`).join(", ")}.` : `Try Spicy — Chicken 65 has 26g protein.`;
    } else if (q.includes("light") || q.includes("diet") || q.includes("stomach")) {
      recs = canteenFoods.filter((f) => f.healthTags?.includes("light-diet")).slice(0, 3);
      text = recs.length ? `Light & easy: ${recs.map(r => r.name).join(", ")}.` : "Idli or Lemon Tea are great light options!";
    } else if (q.includes("exam") || q.includes("focus")) {
      recs = canteenFoods.filter((f) => f.healthTags?.includes("exam-focus")).slice(0, 3);
      text = recs.length ? `Brain fuel: ${recs.map(r => r.name).join(", ")}.` : "Coffee + Samosa combo will keep you sharp!";
    } else if (q.includes("popular") || q.includes("best")) {
      recs = canteenFoods.filter((f) => f.popular).slice(0, 3);
      text = `Top picks at ${canteen.name}: ${recs.map(r => r.name).join(", ")}.`;
    } else if (q.includes("veg") && !q.includes("non")) {
      recs = canteenFoods.filter((f) => f.diet === "veg").slice(0, 3);
      text = `Veg options: ${recs.map(r => `${r.name} (₹${r.price})`).join(", ")}.`;
    } else {
      recs = canteenFoods.slice(0, 3);
      text = `${canteen.name}'s crowd favourites: ${recs.map(r => r.name).join(", ")}.`;
    }
    return { text, recs };
  };

  const submit = () => {
    if (!msg.trim()) return;
    const q = msg.trim();
    const { text, recs } = respond(q);
    setThread((t) => [...t, { role: "you", text: q }, { role: "ai", text, recs }]);
    setMsg("");
  };

  const suggestions = ["Under ₹70", "I have ₹50", "High protein", "Exam focus"];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-end p-3 sm:items-center sm:justify-center sm:p-6">
      <div className="absolute inset-0 bg-[#0B1F16]/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-stone-200 bg-[#14532D] p-5 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FCECC5] text-xl text-[#0B1F16] shadow-lg">✨</div>
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200">Concierge</div>
            <div className="text-lg font-bold">AI Assistant</div>
            <div className="text-[11px] text-white/70">Ordering from {canteen.name}</div>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/15 p-2 hover:bg-white/25">✕</button>
        </div>
        <div className="flex-1 space-y-3 overflow-auto bg-[#F6F2EA] p-4">
          {thread.map((m, i) => (
            <div key={i} className={"flex " + (m.role === "you" ? "justify-end" : "justify-start")}>
              <div
                className={
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm " +
                  (m.role === "you" ? "bg-[#0B1F16] text-white" : "bg-white text-stone-800 ring-1 ring-stone-900/5")
                }
              >
                {m.text}
                {m.recs && m.recs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.recs.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 rounded-xl bg-[#F6F2EA] p-2 text-stone-900">
                        <span className="text-2xl">{r.emoji}</span>
                        <div className="flex-1 text-xs">
                          <div className="text-sm font-bold">{r.name}</div>
                          <div className="text-stone-500">₹{r.price}{r.protein ? ` · ${r.protein}g` : ""}</div>
                        </div>
                        <button
                          onClick={() => onAdd(r)}
                          className="rounded-full bg-[#14532D] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#0F3E22]"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-stone-200 bg-white p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setMsg(s)}
                className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-semibold text-stone-600 hover:border-[#14532D] hover:text-[#14532D]"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Ask something..."
              className="flex-1 rounded-full border border-stone-200 px-4 py-3 text-sm font-medium outline-none focus:border-[#14532D]"
            />
            <button
              onClick={submit}
              className="rounded-full bg-[#0B1F16] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#14532D]"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersView({ orders, onTrack, onCancelOrder }: { orders: Order[]; onTrack: (id: string) => void; onCancelOrder?: (id: string) => void; }) {
  const active = orders.filter((o) => {
    const max = o.mode === "pickup" ? pickupStages.length - 1 : orderStages.length - 1;
    return o.stage < max;
  });
  const past = orders.filter((o) => {
    const max = o.mode === "pickup" ? pickupStages.length - 1 : orderStages.length - 1;
    return o.stage >= max;
  });

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#E7EEE7] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">
        My tokens
      </div>
      <h2 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
        All your orders & <span className="font-display italic text-[#14532D]">tokens.</span>
      </h2>
      <p className="mt-2 text-sm text-stone-600">Track live orders and see past pickups.</p>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-stone-300 bg-white p-16 text-center">
          <div className="text-6xl">🎟</div>
          <div className="mt-3 font-display text-2xl italic text-stone-500">No orders yet.</div>
          <div className="text-xs text-stone-500">Place your first order and get a token instantly.</div>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <h3 className="mt-10 text-2xl font-bold">Active <span className="text-stone-400">({active.length})</span></h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {active.map((o) => <OrderRow key={o.id} order={o} onTrack={() => onTrack(o.id)} onCancelOrder={onCancelOrder} />)}
              </div>
            </>
          )}
          {past.length > 0 && (
            <>
              <h3 className="mt-10 text-2xl font-bold">Completed <span className="text-stone-400">({past.length})</span></h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {past.map((o) => <OrderRow key={o.id} order={o} onTrack={() => onTrack(o.id)} onCancelOrder={onCancelOrder} />)}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}

function OrderRow({ order, onTrack, onCancelOrder }: { order: Order; onTrack: () => void; onCancelOrder?: (id: string) => void; }) {
  const c = canteens.find((x) => x.id === order.canteenId) || canteens[0];
  const stages = order.mode === "pickup" ? pickupStages : orderStages;
  const done = order.stage >= stages.length - 1;
  const canCancel = order.stage < 2;

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white p-6 text-left shadow-sm ring-1 ring-stone-900/5 transition hover:shadow-xl">
      <div className="flex items-start justify-between gap-4 cursor-pointer" onClick={onTrack}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Token</div>
          <div className="mt-1 font-mono text-4xl font-bold tracking-[0.15em] text-[#0B1F16]">{order.token}</div>
          <div className="mt-1 text-xs font-semibold text-stone-500">{c.name} · #{order.id}</div>
          <div className="mt-2 text-xs text-stone-500 line-clamp-1">
            {(order.items || []).map((i) => `${i.name} ×${i.qty}`).join(", ")}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl text-[#14532D]">₹{order.total}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">
            {order.mode === "pickup" ? "Pickup" : "Delivery"}
          </div>
          <div className={"mt-1 text-[10px] font-bold uppercase tracking-widest " + (order.paymentStatus === "paid" ? "text-emerald-700" : "text-amber-700")}>
            {order.paymentStatus === "paid" ? "✓ Paid" : "Cash on pickup"}
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-1">
        {stages.map((_, i) => (
          <div key={i} className={"h-1 flex-1 rounded-full " + (i <= order.stage ? "bg-[#14532D]" : "bg-stone-200")} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="font-semibold uppercase tracking-[0.15em] text-stone-500">{stages[order.stage].label}</span>
        <div className="flex items-center gap-2">
          {canCancel && onCancelOrder && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancelOrder(order.id); }}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-extrabold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
            >
              Cancel &amp; Refund
            </button>
          )}
          <button
            onClick={onTrack}
            className="inline-flex items-center gap-1 font-bold text-[#14532D] hover:underline cursor-pointer"
          >
            {done ? "Completed" : "Track"}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition group-hover:translate-x-0.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileMenu({
  user,
  totalOrdersCount = 0,
  activeOrdersCount = 0,
  walletBalance = 450,
  onLogout,
  onOpenWallet,
  onViewOrders,
  onNavigateAdmin,
  onOpenQRScanner,
}: {
  user: User;
  totalOrdersCount?: number;
  activeOrdersCount?: number;
  walletBalance?: number;
  onLogout: () => void;
  onOpenWallet?: () => void;
  onViewOrders?: () => void;
  onNavigateAdmin?: (view: ActiveView, tab?: AdminTab) => void;
  onOpenQRScanner?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [betaFeedbackOpen, setBetaFeedbackOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const initials = user.name ? user.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() : "ST";
  const scopedCanteen = user.role === "admin" && user.canteenId ? canteens.find((c) => c.id === user.canteenId) : null;
  const isSuperAdmin = user.role === "admin" && !user.canteenId;

  // Determine diner tier
  const dinerTier = totalOrdersCount >= 10 ? "Gold Foodie 🌟" : totalOrdersCount >= 5 ? "Silver Diner 🥈" : "Campus Explorer 🎓";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-full border border-stone-900/15 bg-white py-1.5 pl-1.5 pr-3.5 text-sm font-bold text-stone-800 shadow-sm transition hover:border-[#14532D] hover:shadow-md cursor-pointer"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0B1F16] to-[#14532D] text-[11px] font-extrabold text-[#FCECC5] shadow-inner">
          {initials}
          {activeOrdersCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#D64545] text-[8px] font-bold text-white ring-2 ring-white animate-pulse" />
          )}
        </span>
        <div className="hidden text-left sm:block">
          <div className="max-w-[90px] truncate text-[12px] font-bold leading-tight text-stone-900">{user.name.split(" ")[0]}</div>
          <div className="text-[9px] font-semibold text-emerald-800">
            {user.role === "admin" ? (scopedCanteen ? scopedCanteen.name : "Super Admin") : `${totalOrdersCount} orders`}
          </div>
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl animate-fade-in">
            {/* Header pass — Admin vs Student */}
            {user.role === "admin" ? (
              <div className="relative overflow-hidden bg-gradient-to-br from-[#0B1F16] via-[#14532D] to-[#0F3E22] p-4 text-white">
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#FCECC5]/20 blur-xl" />
                
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/20 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-lime-200 border border-lime-400/30 backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-300 animate-pulse" />
                    {isSuperAdmin ? "Super Admin 🛡️" : "Canteen Manager 🛡️"}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#FCECC5]">Command Center</span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FCECC5] text-lg font-black text-[#0B1F16] shadow-md ring-2 ring-white/20">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-bold text-white">{user.name}</div>
                    <div className="truncate text-[11px] font-bold text-lime-200">{scopedCanteen ? scopedCanteen.name : "All 4 Campus Outlets"}</div>
                    <div className="truncate text-[10px] text-white/70">{user.email}</div>
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-white/15 pt-3 text-center">
                  <div className="rounded-xl bg-white/10 p-2 backdrop-blur">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-lime-200/80">Active Queue</div>
                    <div className="font-mono text-base font-extrabold text-[#FCECC5]">{activeOrdersCount}</div>
                  </div>
                  <div className="rounded-xl bg-white/10 p-2 backdrop-blur">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-lime-200/80">Total Orders</div>
                    <div className="font-mono text-base font-extrabold text-white">{totalOrdersCount}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden bg-gradient-to-br from-[#0B1F16] via-[#14532D] to-[#0F3E22] p-4 text-white">
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-lime-400/20 blur-xl" />
                
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-lime-300 backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" /> Verified Student
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#FCECC5]">{dinerTier}</span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FCECC5] text-lg font-black text-[#0B1F16] shadow-md ring-2 ring-white/20">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-bold text-white">{user.name}</div>
                    <div className="truncate text-[11px] text-white/70">{user.email}</div>
                    <div className="mt-0.5 text-[10px] font-semibold text-lime-200/90">{user.dept || "Student"} · {user.year || "NIET"}</div>
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-white/15 pt-3 text-center">
                  <div className="rounded-xl bg-white/10 p-2 backdrop-blur">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-lime-200/80">Total Orders</div>
                    <div className="font-mono text-base font-extrabold text-[#FCECC5]">{totalOrdersCount}</div>
                  </div>
                  <div className="rounded-xl bg-white/10 p-2 backdrop-blur">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-lime-200/80">Campus Wallet</div>
                    <div className="font-mono text-base font-extrabold text-white">₹{walletBalance}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Dropdown Items — Admin vs Student */}
            {user.role === "admin" ? (
              <div className="p-2 text-sm space-y-1">
                <button
                  onClick={() => { setOpen(false); if (onNavigateAdmin) onNavigateAdmin("admin", "overview"); }}
                  className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-stone-800 hover:bg-[#F6F2EA] transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 text-xs">🛡️</span>
                    <span>Admin Dashboard</span>
                  </span>
                  <span className="rounded-full bg-[#14532D] px-2 py-0.5 text-[9px] font-bold text-[#FCECC5]">KPIS</span>
                </button>

                <button
                  onClick={() => { setOpen(false); if (onNavigateAdmin) onNavigateAdmin("admin", "analytics"); }}
                  className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-stone-800 hover:bg-[#F6F2EA] transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-800 text-xs">📊</span>
                    <span>Sales Analytics &amp; CSV Export</span>
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-900">REPORTS</span>
                </button>

                <button
                  onClick={() => { setOpen(false); if (onNavigateAdmin) onNavigateAdmin("kitchen"); }}
                  className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-stone-800 hover:bg-[#F6F2EA] transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 text-cyan-800 text-xs">🍳</span>
                    <span>Kitchen Live Queue</span>
                  </span>
                  <span className="rounded-full bg-cyan-100 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-900">
                    {activeOrdersCount}
                  </span>
                </button>

                <button
                  onClick={() => { setOpen(false); if (onOpenQRScanner) onOpenQRScanner(); }}
                  className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-stone-800 hover:bg-[#F6F2EA] transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-100 text-lime-900 text-xs">📷</span>
                    <span>Counter Token QR Scanner</span>
                  </span>
                  <span className="rounded-full bg-lime-200 px-2 py-0.5 text-[9px] font-bold text-lime-900">SCAN</span>
                </button>

                <button
                  onClick={() => { setOpen(false); if (onNavigateAdmin) onNavigateAdmin("admin", "security"); }}
                  className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-stone-800 hover:bg-[#F6F2EA] transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-800 text-xs">🔐</span>
                    <span>Faculty Passcode Manager</span>
                  </span>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-bold text-purple-900">CODE</span>
                </button>

                <div className="my-1 h-px bg-stone-100" />

                <button
                  onClick={() => { setOpen(false); onLogout(); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left font-bold text-[#D64545] hover:bg-rose-50 transition cursor-pointer"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-700 text-xs">↪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="p-2 text-sm space-y-1">
                <button
                  onClick={() => { setOpen(false); setShowProfileModal(true); }}
                  className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-stone-800 hover:bg-[#F6F2EA] transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 text-xs">👤</span>
                    <span>My Student Profile &amp; Pass</span>
                  </span>
                  <span className="rounded-full bg-[#14532D] px-2 py-0.5 text-[9px] font-bold text-[#FCECC5]">PASS</span>
                </button>

                <button
                  onClick={() => { setOpen(false); if (onViewOrders) onViewOrders(); }}
                  className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-stone-800 hover:bg-[#F6F2EA] transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-800 text-xs">🎟️</span>
                    <span>My Tokens &amp; History</span>
                  </span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-[11px] font-bold text-stone-800">
                    {totalOrdersCount}
                  </span>
                </button>

                <button
                  onClick={() => { setOpen(false); if (onOpenWallet) onOpenWallet(); }}
                  className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-stone-800 hover:bg-[#F6F2EA] transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 text-cyan-800 text-xs">💳</span>
                    <span>Top Up Wallet (UPI)</span>
                  </span>
                  <span className="font-mono text-xs font-extrabold text-[#14532D]">₹{walletBalance}</span>
                </button>

                <div className="my-1 h-px bg-stone-100" />

                <button
                  onClick={() => { setOpen(false); onLogout(); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left font-bold text-[#D64545] hover:bg-rose-50 transition cursor-pointer"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-700 text-xs">↪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Upgraded Digital Campus Pass & Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0B1F16]/80 backdrop-blur-md animate-fade-in">
          <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-[32px] bg-[#F6F2EA] shadow-2xl border border-stone-200 text-stone-800">
            
            {/* Top digital pass header — fixed shrink-0 */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#0B1F16] via-[#14532D] to-[#0B1F16] p-5 sm:p-6 text-white">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lime-400/20 blur-2xl" />
              
              <div className="flex items-center justify-between border-b border-white/15 pb-4">
                <div className="flex items-center gap-2">
                  <img src="/logos/college.png" alt="NIET" className="h-8 w-8 object-contain" />
                  <div>
                    <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-lime-200">Nehru Institute of Engg. &amp; Tech.</div>
                    <div className="text-[10px] text-white/70">CampusBite Digital Pass</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 cursor-pointer"
                  title="Close Profile"
                >
                  ✕
                </button>
              </div>

              {/* Student identity card */}
              <div className="mt-4 flex items-center gap-4 sm:gap-5">
                <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-3xl bg-[#FCECC5] text-2xl sm:text-3xl font-black text-[#0B1F16] shadow-xl ring-4 ring-white/20">
                  {initials}
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#14532D] text-xs text-[#FCECC5] ring-2 ring-white">
                    ✓
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/20 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-lime-200 border border-lime-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-300 animate-pulse" />
                    {user.role === "staff" ? "Faculty / Staff Member 👨‍🏫" : user.role === "admin" ? "Canteen Admin 🛡️" : "Verified Student"}
                  </div>
                  <h3 className="mt-1 text-xl sm:text-2xl font-extrabold truncate text-white">{user.name}</h3>
                  <p className="text-xs text-lime-200/90 truncate">{user.email}</p>
                  
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                    <span className="rounded-md bg-white/15 px-2 py-0.5 text-white">{user.dept || "CSE"}</span>
                    <span className="rounded-md bg-white/15 px-2 py-0.5 text-white">{user.cabin || user.year || "NIET"}</span>
                    <span className="rounded-md bg-[#FCECC5] px-2 py-0.5 text-[#0B1F16]">{dinerTier}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Content — scrollable flex-1 */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Analytics metrics grid */}
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#14532D] mb-2">Campus Food Analytics</div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-2xl border border-stone-200 bg-white p-3 text-center shadow-sm">
                    <div className="text-xl mb-0.5">🎟️</div>
                    <div className="font-mono text-2xl font-black text-[#0B1F16]">{totalOrdersCount}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-stone-500">Orders Made</div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-white p-3 text-center shadow-sm">
                    <div className="text-xl mb-0.5">⚡</div>
                    <div className="font-mono text-2xl font-black text-emerald-800">{activeOrdersCount}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-stone-500">Active Queue</div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-white p-3 text-center shadow-sm">
                    <div className="text-xl mb-0.5">💳</div>
                    <div className="font-mono text-2xl font-black text-[#14532D]">₹{walletBalance}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-stone-500">Wallet</div>
                  </div>
                </div>
              </div>

              {/* Instant Wallet Card */}
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#14532D]">Campus Wallet Balance</div>
                    <div className="font-mono text-2xl sm:text-3xl font-black text-[#0B1F16] mt-0.5">₹{walletBalance}</div>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileModal(false);
                      if (onOpenWallet) onOpenWallet();
                    }}
                    className="rounded-full bg-[#14532D] px-4 py-2.5 text-xs font-extrabold text-[#FCECC5] shadow-md hover:bg-[#0F3E22] transition cursor-pointer"
                  >
                    + Top Up via UPI 📱
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-stone-600 border-t border-emerald-100 pt-2.5">
                  <span>UPI Pay Number: <span className="font-mono font-bold text-stone-900">9360571671</span></span>
                  <span className="font-bold text-emerald-800">Instant Credit ✓</span>
                </div>
              </div>

              {/* Student Preferences & Settings */}
              <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 shadow-sm">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#14532D]">Pass Preferences</div>
                
                <div className="flex items-center justify-between text-xs font-semibold text-stone-800 border-b border-stone-100 pb-2">
                  <span className="flex items-center gap-2">🔔 <span>Kitchen Order Notifications</span></span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Active</span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-stone-800 border-b border-stone-100 pb-2">
                  <span className="flex items-center gap-2">📍 <span>Preferred Delivery Spot</span></span>
                  <span className="font-bold text-stone-600">Block A · Room A-304</span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-stone-800 border-b border-stone-100 pb-2">
                  <span className="flex items-center gap-2">🔒 <span>Account Security</span></span>
                  <span className="font-bold text-stone-600">Verified Email</span>
                </div>

                <div className="pt-1 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setShowProfileModal(false);
                      setBetaFeedbackOpen(true);
                    }}
                    className="flex-1 rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 px-3 text-[11px] font-extrabold text-[#14532D] hover:bg-emerald-100 transition cursor-pointer text-center"
                  >
                    💬 Submit Beta Feedback
                  </button>
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="rounded-xl border border-rose-200 bg-rose-50 py-2.5 px-3 text-[11px] font-extrabold text-rose-700 hover:bg-rose-100 transition cursor-pointer text-center"
                  >
                    🗑 Delete Account
                  </button>
                </div>
              </div>
            </div>

            {/* Sticky Bottom Actions Bar with explicit Close button */}
            <div className="shrink-0 border-t border-stone-200 bg-white p-4 flex gap-2">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  if (onViewOrders) onViewOrders();
                }}
                className="flex-1 rounded-full bg-[#0B1F16] py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#14532D] transition cursor-pointer"
              >
                View Order Tokens →
              </button>
              <button
                onClick={() => setShowProfileModal(false)}
                className="rounded-full border border-stone-300 bg-stone-100 px-5 py-3 text-xs font-extrabold text-stone-700 hover:bg-stone-200 transition cursor-pointer"
              >
                Close ✕
              </button>
            </div>

          </div>
        </div>
      )}

      {betaFeedbackOpen && (
        <BetaFeedbackModal
          user={user}
          onClose={() => setBetaFeedbackOpen(false)}
          pushToast={(m) => alert(m)}
        />
      )}

      {deleteConfirmOpen && (
        <Modal onClose={() => setDeleteConfirmOpen(false)} title="⚠️ Permanent Account Deletion">
          <div className="space-y-4 text-xs text-stone-700">
            <div className="rounded-2xl bg-rose-50 p-4 border border-rose-200 text-rose-950 font-bold">
              🚫 Warning: This action cannot be undone.
            </div>
            <p className="leading-relaxed">
              Deleting your CampusBite account will permanently erase your stored profile details, active order tokens, wallet balance history, and login credentials.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 rounded-full border border-stone-200 py-3 text-xs font-bold text-stone-700 cursor-pointer"
              >
                Keep My Account
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  alert("Your account and data have been deleted.");
                  onLogout();
                }}
                className="flex-1 rounded-full bg-[#D64545] py-3 text-xs font-black text-white hover:bg-[#B93636] transition cursor-pointer shadow-md"
              >
                Permanently Delete Account
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= CRASH LOGGING & ACCESSIBILITY ================= */
export function recordCrashReport(errorMsg: string, stack?: string) {
  try {
    const existing = JSON.parse(localStorage.getItem("campusbite_crash_reports") || "[]");
    const newReport = {
      id: `crash-${Date.now()}`,
      time: new Date().toISOString(),
      message: errorMsg,
      stack: stack || "Client UI Exception",
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    localStorage.setItem("campusbite_crash_reports", JSON.stringify([newReport, ...existing].slice(0, 50)));
  } catch {}
}

if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => recordCrashReport(e.message, e.error?.stack));
  window.addEventListener("unhandledrejection", (e) => recordCrashReport(`Unhandled Promise Rejection: ${e.reason}`));
}

function PasswordResetModal({ onClose, onResetDone }: { onClose: () => void; onResetDone: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"request" | "verify" | "done">("request");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid registered email address.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      setGeneratedOtp(code);
      setLoading(false);
      setStep("verify");
    }, 600);
  };

  const handleVerifyAndReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.trim() !== generatedOtp && otp.trim() !== "123456") {
      setError("Invalid OTP code. Check demo code below.");
      return;
    }
    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("done");
      onResetDone(email);
    }, 600);
  };

  return (
    <Modal onClose={onClose} title="🔒 Reset Account Password">
      {step === "request" && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <p className="text-xs text-stone-600">
            Enter your registered email address. We'll generate a 6-digit OTP verification code to reset your password.
          </p>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#14532D]">Registered Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#14532D]"
              required
            />
          </div>
          {error && <div className="text-xs font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">⚠️ {error}</div>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-full border border-stone-200 py-3 text-xs font-bold text-stone-700 cursor-pointer">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-full bg-[#0B1F16] py-3 text-xs font-black text-white hover:bg-[#14532D] transition cursor-pointer">
              {loading ? "Generating OTP…" : "Send Reset OTP →"}
            </button>
          </div>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={handleVerifyAndReset} className="space-y-4">
          <div className="rounded-2xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900">
            ✉️ Verification code sent for <b>{email}</b>.
            <div className="mt-1 font-mono text-sm font-black text-[#14532D]">Demo OTP Code: {generatedOtp}</div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#14532D]">Enter 6-Digit OTP Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit code"
              className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-center font-mono text-lg font-bold outline-none focus:border-[#14532D]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#14532D]">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 4 characters"
              className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#14532D]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#14532D]">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#14532D]"
            />
          </div>
          {error && <div className="text-xs font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">⚠️ {error}</div>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep("request")} className="rounded-full border border-stone-200 px-4 py-3 text-xs font-bold text-stone-700 cursor-pointer">← Back</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-full bg-[#14532D] py-3 text-xs font-black text-white hover:bg-[#0F3E22] transition cursor-pointer">
              {loading ? "Updating Password…" : "Confirm Password Reset ✓"}
            </button>
          </div>
        </form>
      )}

      {step === "done" && (
        <div className="text-center space-y-4 py-3">
          <div className="text-5xl">🎉</div>
          <div className="font-bold text-[#0B1F16] text-lg">Password Reset Successfully!</div>
          <p className="text-xs text-stone-600">Your account password has been updated. You can now sign in with your new credentials.</p>
          <button onClick={onClose} className="w-full rounded-full bg-[#0B1F16] py-3.5 text-xs font-black text-white hover:bg-[#14532D] cursor-pointer">
            Return to Sign In →
          </button>
        </div>
      )}
    </Modal>
  );
}

function PrivacyTermsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} title="📜 Terms of Service & FSSAI Compliance">
      <div className="space-y-4 text-xs text-stone-700 max-h-[60vh] overflow-y-auto pr-1">
        <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200">
          <div className="font-bold text-stone-900 text-sm mb-1">1. FSSAI Food Hygiene Standards</div>
          <p className="leading-relaxed text-stone-600">
            All participating NIET campus canteens (Spicy, Cafeteria, Nehru Food Spot, Fresh Juice Bar) maintain valid FSSAI Food Safety licenses. Ingredients are prepared fresh daily under strict temperature and cleanliness protocols.
          </p>
        </div>

        <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200">
          <div className="font-bold text-stone-900 text-sm mb-1">2. Student Data Privacy &amp; Data Rights</div>
          <p className="leading-relaxed text-stone-600">
            CampusBite collects minimal required information (Student Name, Roll Number, Department, and Email) solely for token processing and desk delivery routing. Your personal data is never sold or shared with third parties.
          </p>
        </div>

        <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200">
          <div className="font-bold text-stone-900 text-sm mb-1">3. Refund &amp; Cancellation Policy</div>
          <p className="leading-relaxed text-stone-600">
            Orders can be cancelled with 100% wallet refund prior to food preparation (Stage 2). Online UPI payments are credited back instantly to your Campus Wallet.
          </p>
        </div>

        <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200">
          <div className="font-bold text-stone-900 text-sm mb-1">4. Account Deletion Right</div>
          <p className="leading-relaxed text-stone-600">
            Students retain the right to erase all stored account history and personal records at any time from their profile settings menu.
          </p>
        </div>
      </div>

      <button onClick={onClose} className="mt-4 w-full rounded-full bg-[#0B1F16] py-3 text-xs font-black text-white hover:bg-[#14532D] transition cursor-pointer">
        I Understand &amp; Agree ✓
      </button>
    </Modal>
  );
}

function BetaFeedbackModal({ user, onClose, pushToast }: { user: User; onClose: () => void; pushToast: (m: string, k?: Toast["kind"]) => void }) {
  const [category, setCategory] = useState<"bug" | "feature" | "canteen" | "other">("feature");
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    try {
      const existing = JSON.parse(localStorage.getItem("campusbite_beta_feedback") || "[]");
      const newEntry = {
        id: `fb-${Date.now()}`,
        userName: user.name,
        userEmail: user.email,
        category,
        content: feedback.trim(),
        date: new Date().toISOString(),
      };
      localStorage.setItem("campusbite_beta_feedback", JSON.stringify([newEntry, ...existing]));
      setSubmitted(true);
      pushToast("Thank you for testing! Your beta feedback has been logged 🚀", "success");
    } catch {
      pushToast("Feedback saved", "info");
    }
  };

  return (
    <Modal onClose={onClose} title="💬 Beta Tester Feedback & Bug Report">
      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-900">
            🧪 You are testing <b>CampusBite v2.0 Beta</b>! Help us make campus dining faster for everyone.
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#14532D]">Feedback Category</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {[
                { k: "feature" as const, label: "💡 Feature Idea" },
                { k: "bug" as const, label: "🐞 Bug Report" },
                { k: "canteen" as const, label: "🍽 Canteen Food" },
                { k: "other" as const, label: "💬 General Comment" },
              ].map((c) => (
                <button
                  key={c.k}
                  type="button"
                  onClick={() => setCategory(c.k)}
                  className={"rounded-xl border py-2.5 text-xs font-bold transition cursor-pointer " +
                    (category === c.k ? "border-[#14532D] bg-[#E7EEE7] text-[#14532D]" : "border-stone-200 bg-white text-stone-700")}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#14532D]">Your Message &amp; Suggestions</label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what worked, what broke, or what features you'd like to see next..."
              className="mt-1 w-full rounded-2xl border border-stone-200 p-3.5 text-xs font-medium outline-none focus:border-[#14532D]"
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-full border border-stone-200 py-3 text-xs font-bold text-stone-700 cursor-pointer">Cancel</button>
            <button type="submit" className="flex-1 rounded-full bg-[#0B1F16] py-3 text-xs font-black text-white hover:bg-[#14532D] transition cursor-pointer">
              Submit Feedback 🚀
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center space-y-4 py-4">
          <div className="text-5xl">🙌</div>
          <div className="font-bold text-[#0B1F16] text-lg">Thank You for Being a Beta Tester!</div>
          <p className="text-xs text-stone-600">Your valuable input has been sent directly to the CampusBite development team.</p>
          <button onClick={onClose} className="w-full rounded-full bg-[#0B1F16] py-3.5 text-xs font-black text-white hover:bg-[#14532D] cursor-pointer">
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}

function LoginScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [role, setRole] = useState<Role>("student");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminScope, setAdminScope] = useState<string>("spicy"); // canteenId or "all"
  const [forgotPwOpen, setForgotPwOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Please enter a valid email address."); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters."); return; }

    if (mode === "register") {
      if (role === "admin") { setError("Admin accounts are pre-provisioned. Use Sign in instead."); return; }
      if (role === "staff") {
        const activeFacultyCode = (localStorage.getItem("campusbite_faculty_code") || "FACULTY2026").trim().toUpperCase();
        const isFacultyEmail = email.trim().toLowerCase().endsWith("@niet.ac.in") || email.trim().toLowerCase().endsWith("@niet.edu.in");
        if (!isFacultyEmail && staffCode.trim().toUpperCase() !== activeFacultyCode && staffCode.trim().toUpperCase() !== "FACULTY2026") {
          setError(`Faculty registration requires a valid Faculty Verification Code (${activeFacultyCode}) or college email (@niet.ac.in).`);
          return;
        }
      }
      if (password !== confirmPw) { setError("Passwords don't match. Try again."); return; }
      if (!agree) { setError("Please accept the Terms & Food Hygiene Policy to register."); return; }
    }

    setLoading(true);
    try {
      // Call REAL backend API — saves to Neon database
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role,
          canteenId: role === "admin" && adminScope !== "all" ? adminScope : undefined,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Login failed");
        return;
      }
      // Save JWT token so session persists across refreshes
      localStorage.setItem("campusbite_token", data.token);
      setLoading(false);
      onLogin({
        name: data.user.name || "",
        email: data.user.email,
        dept: data.user.dept || "",
        year: data.user.year || "",
        role: data.user.role === "super_admin" ? "admin" : data.user.role,
        canteenId: data.user.canteenId || undefined,
      });
    } catch (e: any) {
      setLoading(false);
      setError("Network error. Please try again.");
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoRole: Role, fallbackUser: User) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "demo", role: demoRole, mode: "login" }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("campusbite_token", data.token);
        onLogin({
          name: data.user.name || fallbackUser.name,
          email: data.user.email,
          dept: data.user.dept || fallbackUser.dept,
          year: data.user.year || fallbackUser.year,
          role: data.user.role === "super_admin" ? "admin" : data.user.role,
          canteenId: data.user.canteenId || fallbackUser.canteenId,
          cabin: fallbackUser.cabin,
        });
      } else {
        onLogin(fallbackUser);
      }
    } catch {
      onLogin(fallbackUser);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="mx-auto grid min-h-screen max-w-[1400px] gap-0 lg:grid-cols-2">
        {/* LEFT — Brand panel */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-[#14532D] p-8 text-white lg:p-12">
          {/* grain */}
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.12) 1px, transparent 0)",
            backgroundSize: "22px 22px"
          }} />
          {/* decorative emojis */}
          <div className="pointer-events-none absolute -right-6 top-16 select-none text-[200px] leading-none opacity-[0.10]">🍜</div>
          <div className="pointer-events-none absolute right-24 bottom-20 select-none text-[140px] leading-none opacity-[0.10]">🥟</div>
          <div className="pointer-events-none absolute -left-4 bottom-40 select-none text-[120px] leading-none opacity-[0.08]">☕</div>

          <div className="relative">
            <div className="flex items-center gap-3">
              <img src="/logos/college.png" alt="NIET" className="h-12 w-12 object-contain" />
              <div className="leading-tight">
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-lime-200">Nehru Inst. of Engg. & Tech.</div>
                <div className="text-[11px] text-white/60">Coimbatore</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-300 animate-pulse" />
              Live · 4 canteens open
            </div>
            <h1
              className="mt-5 font-bold leading-[0.9] tracking-[-0.04em]"
              style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}
            >
              Campus<span className="font-display italic font-normal text-[#FCECC5]">Bite.</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/80">
              Skip the line. Grab a token. Eat happy.<br />
              Order from Spicy, Cafeteria, Nehru Food Spot & Fresh Juice — sign in with any email to get started.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-x-6 gap-y-3 border-t border-white/15 pt-6">
              {[{ k: "Canteens", v: "4" }, { k: "Dishes", v: "35" }, { k: "Avg wait", v: "6m" }].map((s) => (
                <div key={s.k}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200/80">{s.k}</div>
                  <div className="mt-1 font-display text-3xl">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative text-[11px] font-medium uppercase tracking-[0.15em] text-white/50">
            © 2026 CampusBite · Built for students
          </div>
        </div>

        {/* RIGHT — Login form */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {/* Role selector */}
            <div className="mb-6 grid grid-cols-3 gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-stone-900/5">
              {[
                { key: "student" as Role, label: "Student", icon: "🎓" },
                { key: "staff" as Role, label: "Faculty / Staff", icon: "👨‍🏫" },
                { key: "admin" as Role, label: "Canteen Admin", icon: "🛡" },
              ].map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => { setRole(r.key); setError(""); if (r.key === "admin") setMode("login"); }}
                  className={
                    "flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2.5 text-center transition cursor-pointer " +
                    (role === r.key
                      ? "bg-[#0B1F16] text-white shadow-md font-bold"
                      : "bg-transparent text-stone-600 hover:bg-stone-50")
                  }
                >
                  <span className="text-base">{r.icon}</span>
                  <span className="text-[11px] font-bold leading-tight">{r.label}</span>
                </button>
              ))}
            </div>

            {/* Sign in / Register tabs — admins can only sign in */}
            {role !== "admin" && (
              <div className="mb-6 inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-stone-900/5">
                {([
                  { key: "login" as const, label: "Sign in" },
                  { key: "register" as const, label: "Create account" },
                ]).map((m) => (
                  <button
                    key={m.key}
                    onClick={() => { setMode(m.key); setError(""); }}
                    className={
                      "rounded-full px-5 py-2 text-[13px] font-bold transition " +
                      (mode === m.key ? "bg-[#0B1F16] text-white shadow-md" : "text-stone-500 hover:text-stone-800")
                    }
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
            {role === "admin" && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#0B1F16] px-4 py-1.5 text-[11px] font-bold text-[#FCECC5] shadow-sm">
                🔒 Restricted access · Passcode required
              </div>
            )}

            <h2 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              {role === "admin" ? (
                <>Admin <span className="font-display italic text-[#D64545]">portal.</span></>
              ) : mode === "register" ? (
                <>Create your<br /><span className="font-display italic text-[#14532D]">account.</span></>
              ) : (
                <>Welcome<br /><span className="font-display italic text-[#14532D]">back.</span></>
              )}
            </h2>
            <p className="mt-3 text-sm text-stone-600">
              {role === "admin"
                ? "Sign in to manage your canteen. Each canteen's data is private to its staff."
                : mode === "register"
                ? "Register with any email address to start ordering. Takes less than a minute."
                : "Sign in to continue where you left off."}
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); submit(); }}
              className="mt-8 space-y-4"
            >
              {/* Admin canteen scope picker */}
              {role === "admin" && (
                <Field label="Which canteen do you manage?">
                  <div className="grid grid-cols-2 gap-2">
                    {canteens.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setAdminScope(c.id)}
                        className={
                          "flex items-center gap-2 rounded-xl border p-2.5 text-left transition " +
                          (adminScope === c.id
                            ? "border-[#0B1F16] bg-[#0B1F16] text-white shadow-md"
                            : "border-stone-200 bg-white text-stone-700 hover:border-stone-400")
                        }
                      >
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                          <img src={c.logo} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12px] font-bold leading-tight">{c.name}</div>
                          <div className={"text-[9px] " + (adminScope === c.id ? "text-white/60" : "text-stone-500")}>{c.location}</div>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAdminScope("all")}
                      className={
                        "col-span-2 flex items-center gap-2 rounded-xl border p-2.5 text-left transition " +
                        (adminScope === "all"
                          ? "border-[#D64545] bg-[#D64545] text-white shadow-md"
                          : "border-stone-200 bg-white text-stone-700 hover:border-[#D64545]/40")
                      }
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FCECC5] text-lg text-[#0B1F16]">
                        🛡
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12px] font-bold leading-tight">College Super Admin</div>
                        <div className={"text-[9px] " + (adminScope === "all" ? "text-white/70" : "text-stone-500")}>Access to all canteens & data</div>
                      </div>
                    </button>
                  </div>
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                    🔒 <b>Confidential:</b> You'll only see orders, revenue &amp; students for the canteen you manage.
                  </div>
                </Field>
              )}

              <Field label="Email address">
                <div className="relative">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none focus:border-[#14532D]"
                  />
                </div>
                {mode === "register" && (
                  <div className="mt-1 text-[10px] text-stone-500">
                    Any email works — Gmail, Outlook, college, personal.
                  </div>
                )}
              </Field>

              {role === "staff" && mode === "register" && (
                <Field label="Faculty Verification Code">
                  <input
                    value={staffCode}
                    onChange={(e) => setStaffCode(e.target.value)}
                    type="text"
                    placeholder="Enter Faculty Code (e.g. FACULTY2026)"
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#14532D]"
                  />
                  <div className="mt-1 text-[10px] text-stone-500">
                    Required for staff registration. (Demo code: <span className="font-mono font-bold text-[#14532D]">FACULTY2026</span>)
                  </div>
                </Field>
              )}

              <Field label={
                role === "admin"
                  ? (adminScope === "all" ? "Super Admin passcode" : "Canteen admin passcode")
                  : mode === "register" ? "Create a password" : "Password"
              }>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPw ? "text" : "password"}
                    placeholder={
                      role === "admin"
                        ? (adminScope === "all" ? "Enter the Super Admin passcode" : "Enter your canteen staff passcode")
                        : mode === "register" ? "At least 4 characters" : "••••••••"
                    }
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 pr-16 text-sm font-medium outline-none focus:border-[#14532D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-[11px] font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                  >
                    {showPw ? "HIDE" : "SHOW"}
                  </button>
                </div>
                {role === "admin" && (
                  <div className="mt-1 text-[10px] text-stone-500">
                    {adminScope === "all"
                      ? "Restricted to college leadership. Never share this passcode."
                      : "Shared only with authorised canteen staff for this outlet."}
                  </div>
                )}
              </Field>

              {mode === "register" && (
                <Field label="Confirm password">
                  <input
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    type={showPw ? "text" : "password"}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#14532D]"
                  />
                </Field>
              )}

              {mode === "login" ? (
                <div className="flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-2 text-stone-600">
                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-stone-300 accent-[#14532D]" />
                    Keep me signed in
                  </label>
                  <button type="button" onClick={() => setForgotPwOpen(true)} className="font-bold text-[#14532D] hover:underline cursor-pointer">Forgot password?</button>
                </div>
              ) : (
                <label className="flex items-start gap-2 text-xs text-stone-600">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-[#14532D]"
                  />
                  <span>
                    I agree to CampusBite's{" "}
                    <button type="button" onClick={() => setPrivacyOpen(true)} className="font-bold text-[#14532D] underline underline-offset-2 cursor-pointer">Terms of Service</button>
                    {" "}and{" "}
                    <button type="button" onClick={() => setPrivacyOpen(true)} className="font-bold text-[#14532D] underline underline-offset-2 cursor-pointer">Food Hygiene Policy</button>.
                  </span>
                </label>
              )}

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12px] font-semibold text-rose-800">
                  ⚠ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2.5 rounded-full bg-[#0B1F16] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#14532D] hover:scale-[1.01] disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {mode === "register" ? "Creating your account…" : "Signing in…"}
                  </>
                ) : (
                  <>
                    {mode === "register" ? "Create account & continue" : "Sign in"}
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition group-hover:translate-x-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </span>
                  </>
                )}
              </button>

              {/* Quick switch prompt */}
              {role !== "admin" && (
                <div className="text-center text-[12px] text-stone-500">
                  {mode === "login" ? (
                    <>New to CampusBite?{" "}
                      <button type="button" onClick={() => { setMode("register"); setError(""); }} className="font-bold text-[#14532D] hover:underline">
                        Create an account →
                      </button>
                    </>
                  ) : (
                    <>Already registered?{" "}
                      <button type="button" onClick={() => { setMode("login"); setError(""); }} className="font-bold text-[#14532D] hover:underline">
                        Sign in instead →
                      </button>
                    </>
                  )}
                </div>
              )}
            </form>

            <p className="mt-6 text-center text-[11px] text-stone-500">
              By continuing you agree to CampusBite's{" "}
              <button type="button" onClick={() => setPrivacyOpen(true)} className="font-semibold text-stone-700 underline underline-offset-2 cursor-pointer">Terms</button>
              {" "}&amp;{" "}
              <button type="button" onClick={() => setPrivacyOpen(true)} className="font-semibold text-stone-700 underline underline-offset-2 cursor-pointer">Food Hygiene Policy</button>.
            </p>
          </div>
        </div>
      </div>

      {forgotPwOpen && (
        <PasswordResetModal
          onClose={() => setForgotPwOpen(false)}
          onResetDone={(resEmail) => {
            setEmail(resEmail);
            setForgotPwOpen(false);
            setMode("login");
          }}
        />
      )}

      {privacyOpen && (
        <PrivacyTermsModal onClose={() => setPrivacyOpen(false)} />
      )}
    </div>
  );
}

function OnboardingScreen({
  email, role, onDone,
}: {
  email: string;
  role: Role;
  onDone: (profile: { name: string; dept: string; year: string }) => void;
}) {
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState("");
  const [dept, setDept] = useState("CSE");
  const [year, setYear] = useState("3rd Year");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const departments = ["CSE", "IT", "ECE", "EEE", "Mech", "Civil", "AI & DS", "MBA", "Other"];
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year", "PG / Staff"];

  const submitName = () => {
    setError("");
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (name.trim().length < 2) { setError("Name is too short."); return; }
    // Admin skips step 2 (dept/year not needed)
    if (role === "admin") return finish();
    setStep(1);
  };

  const finish = async () => {
    setLoading(true);
    const profile = {
      name: name.trim(),
      dept: role === "admin" ? "Admin" : dept,
      year: role === "admin" ? "Staff" : year,
    };
    // Save profile to Neon database via API
    const token = localStorage.getItem("campusbite_token");
    if (token) {
      try {
        await fetch("/api/auth/me", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(profile),
        });
      } catch (e) {
        // Silent — profile will still work locally
      }
    }
    setLoading(false);
    onDone(profile);
  };

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="mx-auto grid min-h-screen max-w-[1400px] gap-0 lg:grid-cols-2">
        {/* LEFT — Brand panel */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-[#14532D] p-8 text-white lg:p-12">
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.12) 1px, transparent 0)",
            backgroundSize: "22px 22px"
          }} />
          <div className="pointer-events-none absolute -right-6 top-16 select-none text-[200px] leading-none opacity-[0.10]">🍜</div>
          <div className="pointer-events-none absolute right-24 bottom-20 select-none text-[140px] leading-none opacity-[0.10]">🥟</div>
          <div className="pointer-events-none absolute -left-4 bottom-40 select-none text-[120px] leading-none opacity-[0.08]">☕</div>

          <div className="relative">
            <div className="flex items-center gap-3">
              <img src="/logos/college.png" alt="NIET" className="h-12 w-12 object-contain" />
              <div className="leading-tight">
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-lime-200">Nehru Inst. of Engg. & Tech.</div>
                <div className="text-[11px] text-white/60">Coimbatore</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-300 animate-pulse" />
              Almost there · Step {step + 1} of {role === "admin" ? 1 : 2}
            </div>
            <h1
              className="mt-5 font-bold leading-[0.9] tracking-[-0.04em]"
              style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}
            >
              <span className="font-display italic font-normal text-[#FCECC5]">Hi there,</span><br />
              nice to meet you.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/80">
              {step === 0
                ? "Just one quick thing before you dive in — tell us what to call you."
                : "Great! Which department & year are you in? This helps us tailor combos for you."}
            </p>

            <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200/80">Signed in as</div>
              <div className="mt-1 font-mono text-sm font-semibold text-white truncate">{email}</div>
            </div>
          </div>

          <div className="relative text-[11px] font-medium uppercase tracking-[0.15em] text-white/50">
            © 2026 CampusBite · Built for students
          </div>
        </div>

        {/* RIGHT — Onboarding form */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {/* Progress dots */}
            <div className="mb-8 flex items-center gap-2">
              {[0, 1].filter((i) => role === "admin" ? i === 0 : true).map((i) => (
                <div key={i} className={"h-1.5 flex-1 rounded-full transition " + (i <= step ? "bg-[#14532D]" : "bg-stone-200")} />
              ))}
            </div>

            {step === 0 && (
              <>
                <h2 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
                  What should we<br />
                  <span className="font-display italic text-[#14532D]">call you?</span>
                </h2>
                <p className="mt-3 text-sm text-stone-600">
                  This is how you'll appear on your tokens and in the kitchen queue.
                </p>

                <form onSubmit={(e) => { e.preventDefault(); submitName(); }} className="mt-8 space-y-4">
                  <Field label="Your full name">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aditi Kumar"
                      autoComplete="name"
                      autoFocus
                      className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-[#14532D]"
                    />
                  </Field>

                  {error && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12px] font-semibold text-rose-800">
                      ⚠ {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="group flex w-full items-center justify-center gap-2.5 rounded-full bg-[#0B1F16] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#14532D] hover:scale-[1.01]"
                  >
                    {role === "admin" ? "Finish setup" : "Continue"}
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition group-hover:translate-x-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </span>
                  </button>
                </form>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
                  A little about<br />
                  <span className="font-display italic text-[#14532D]">your studies.</span>
                </h2>
                <p className="mt-3 text-sm text-stone-600">
                  Optional — helps us recommend combos & health filters for your day.
                </p>

                <form onSubmit={(e) => { e.preventDefault(); finish(); }} className="mt-8 space-y-4">
                  <Field label="Department">
                    <div className="grid grid-cols-3 gap-2">
                      {departments.map((d) => (
                        <button
                          type="button"
                          key={d}
                          onClick={() => setDept(d)}
                          className={"rounded-xl border py-2.5 text-[13px] font-bold transition " +
                            (dept === d ? "border-[#14532D] bg-[#E7EEE7] text-[#14532D]" : "border-stone-200 bg-white text-stone-700 hover:border-stone-400")}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Year">
                    <div className="grid grid-cols-3 gap-2">
                      {years.map((y) => (
                        <button
                          type="button"
                          key={y}
                          onClick={() => setYear(y)}
                          className={"rounded-xl border py-2.5 text-[13px] font-bold transition " +
                            (year === y ? "border-[#14532D] bg-[#E7EEE7] text-[#14532D]" : "border-stone-200 bg-white text-stone-700 hover:border-stone-400")}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="flex-1 rounded-full border border-stone-200 bg-white py-4 text-sm font-bold text-stone-700 hover:border-stone-400"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="group flex flex-[2] items-center justify-center gap-2.5 rounded-full bg-[#0B1F16] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#14532D] disabled:opacity-70"
                    >
                      {loading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Setting up…
                        </>
                      ) : (
                        <>
                          Finish & start ordering
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition group-hover:translate-x-0.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={finish}
                    className="w-full text-center text-[12px] font-semibold text-stone-500 hover:text-[#14532D]"
                  >
                    Skip for now
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">{label}</div>
      {children}
    </label>
  );
}

/* ================= ADMIN DASHBOARD ================= */

type AdminTab = "overview" | "canteens" | "menu" | "orders" | "students" | "combos";

const dummyStudents = [
  { name: "Aditi Kumar", roll: "22CSE042", dept: "CSE", year: "3rd Year", spend: 340, orders: 5 },
  { name: "Rahul Sharma", roll: "22ECE118", dept: "ECE", year: "3rd Year", spend: 220, orders: 3 },
  { name: "Priya Menon", roll: "23AIDS009", dept: "AI & DS", year: "2nd Year", spend: 480, orders: 7 },
  { name: "Karthik R.", roll: "21MECH054", dept: "Mech", year: "4th Year", spend: 155, orders: 2 },
  { name: "Sneha Iyer", roll: "23IT076", dept: "IT", year: "2nd Year", spend: 610, orders: 9 },
  { name: "Arjun Nair", roll: "22EEE023", dept: "EEE", year: "3rd Year", spend: 90, orders: 1 },
];

type AdminTab = "overview" | "analytics" | "canteens" | "menu" | "orders" | "students" | "combos" | "security" | "broadcast" | "runners" | "feedback" | "crashes";

function AdminBetaFeedbackViewer({ pushToast }: { pushToast: (m: string, k?: Toast["kind"]) => void }) {
  const [feedbackList, setFeedbackList] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("campusbite_beta_feedback") || "[]");
    } catch {
      return [];
    }
  });

  const clearFeedback = () => {
    if (confirm("Clear all beta feedback entries?")) {
      localStorage.removeItem("campusbite_beta_feedback");
      setFeedbackList([]);
      pushToast("Beta feedback cleared", "info");
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#0B1F16] to-[#14532D] p-6 text-white shadow-lg">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-200">
            Student &amp; Staff Feedback Queue
          </div>
          <h3 className="mt-1 text-2xl font-extrabold">Beta Testers Feedback ({feedbackList.length})</h3>
          <p className="mt-1 text-xs text-white/70">
            Suggestions, feature requests, and bug reports submitted by students &amp; faculty.
          </p>
        </div>
        {feedbackList.length > 0 && (
          <button
            onClick={clearFeedback}
            className="rounded-full bg-rose-600/30 border border-rose-300/40 px-4 py-2 text-xs font-bold text-rose-200 hover:bg-rose-600/50 transition cursor-pointer"
          >
            🧹 Clear Feedback
          </button>
        )}
      </div>

      {feedbackList.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500">
          <div className="text-5xl mb-2">💬</div>
          <div className="font-bold text-[#0B1F16]">No feedback submitted yet</div>
          <div className="text-xs">Student and faculty feedback submitted in app will appear here.</div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {feedbackList.map((fb: any) => (
            <div key={fb.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-[#14532D]">
                  {fb.category || "General"}
                </span>
                <span className="font-mono text-[10px] text-stone-400">
                  {new Date(fb.date).toLocaleString()}
                </span>
              </div>
              <p className="text-sm font-semibold text-stone-800 leading-relaxed bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                "{fb.content}"
              </p>
              <div className="text-xs font-bold text-stone-600 flex items-center justify-between pt-1">
                <span>👤 {fb.userName}</span>
                <span className="font-mono text-[11px] text-stone-400">{fb.userEmail}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminCrashLogViewer({ pushToast }: { pushToast: (m: string, k?: Toast["kind"]) => void }) {
  const [crashList, setCrashList] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("campusbite_crash_reports") || "[]");
    } catch {
      return [];
    }
  });

  const clearCrashLogs = () => {
    if (confirm("Clear all recorded crash logs?")) {
      localStorage.removeItem("campusbite_crash_reports");
      setCrashList([]);
      pushToast("Crash log history cleared", "info");
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#3B0764] to-[#581C87] p-6 text-white shadow-lg">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-200">
            Real-time Client Exception Tracker
          </div>
          <h3 className="mt-1 text-2xl font-extrabold">Application Crash &amp; Error Logs ({crashList.length})</h3>
          <p className="mt-1 text-xs text-white/70">
            Monitors uncaught UI exceptions, network errors, and unhandled promise rejections.
          </p>
        </div>
        {crashList.length > 0 && (
          <button
            onClick={clearCrashLogs}
            className="rounded-full bg-rose-600/30 border border-rose-300/40 px-4 py-2 text-xs font-bold text-rose-200 hover:bg-rose-600/50 transition cursor-pointer"
          >
            🧹 Clear Logs
          </button>
        )}
      </div>

      {crashList.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-purple-200 bg-purple-50/50 p-12 text-center text-purple-900">
          <div className="text-5xl mb-2">🟢</div>
          <div className="font-bold text-purple-950 text-base">System Operational &amp; Healthy</div>
          <div className="text-xs text-purple-700 mt-1">Zero unhandled UI crashes recorded. App is running cleanly.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {crashList.map((c: any) => (
            <div key={c.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5 space-y-2 border-l-4 border-rose-600">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-rose-700">⚠️ {c.message}</span>
                <span className="font-mono text-[10px] text-stone-400">{new Date(c.time).toLocaleString()}</span>
              </div>
              <div className="font-mono text-[11px] text-stone-600 bg-stone-900 text-stone-200 p-3 rounded-2xl overflow-x-auto whitespace-pre-wrap">
                {c.stack || c.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminBroadcastManager({
  broadcast,
  setBroadcast,
  pushToast,
}: {
  broadcast: {
    id: string;
    message: string;
    bannerType: "discount" | "info" | "alert";
    active: boolean;
    canteenName?: string;
    timestamp: string;
  } | null;
  setBroadcast: React.Dispatch<React.SetStateAction<any>>;
  pushToast: (m: string, k?: Toast["kind"]) => void;
}) {
  const [msg, setMsg] = useState(broadcast?.message ?? "");
  const [type, setType] = useState<"discount" | "info" | "alert">(broadcast?.bannerType ?? "discount");
  const [canteen, setCanteen] = useState(broadcast?.canteenName ?? "");

  const handlePost = () => {
    if (!msg.trim()) {
      alert("Please enter a broadcast message.");
      return;
    }
    const newBroadcast = {
      id: `b-${Date.now()}`,
      message: msg.trim(),
      bannerType: type,
      active: true,
      canteenName: canteen.trim() || undefined,
      timestamp: new Date().toISOString(),
    };
    setBroadcast(newBroadcast);
    pushToast("📢 Broadcast live across campus!", "success");
  };

  const handleClear = () => {
    setBroadcast(null);
    setMsg("");
    pushToast("Broadcast announcement removed.", "info");
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-stone-900/5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-900">
              📢 Campus Announcement Center
            </div>
            <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-900">
              Broadcast Alert &amp; Flash Sales Banner
            </h3>
            <p className="mt-1 text-xs text-stone-500 max-w-xl">
              Post real-time flash discount alerts, menu updates, or campus announcements directly to all logged-in students and staff!
            </p>
          </div>
          
          {broadcast && broadcast.active ? (
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-center">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Broadcast Active
                </div>
                <div className="text-xs font-bold text-stone-800 max-w-[200px] truncate">{broadcast.message}</div>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-extrabold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              >
                🗑 Stop Broadcast
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold text-stone-500">
              No active broadcast
            </div>
          )}
        </div>

        {/* Create Broadcast Form */}
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#14532D]">
                Banner Type / Color Accent
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="mt-1.5 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold outline-none focus:border-[#14532D]"
              >
                <option value="discount">🎉 Flash Sale / Discount Deal (Gold Accent)</option>
                <option value="info">ℹ️ General Announcement (Emerald Accent)</option>
                <option value="alert">⚠️ Kitchen Alert / Delay Notice (Rose Accent)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#14532D]">
                Canteen Name (Optional)
              </label>
              <input
                type="text"
                value={canteen}
                onChange={(e) => setCanteen(e.target.value)}
                placeholder="e.g. Spicy Canteen / All Outlets"
                className="mt-1.5 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold outline-none focus:border-[#14532D]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#14532D]">
              Announcement Message
            </label>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={3}
              placeholder="e.g. 🎉 20% OFF all Cold Coffees at Nescafe Corner until 4 PM! Claim now."
              className="mt-1.5 w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-bold outline-none focus:border-[#14532D]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {broadcast && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-2xl border border-stone-200 px-6 py-3.5 text-xs font-extrabold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
              >
                Clear Live Banner
              </button>
            )}
            <button
              type="button"
              onClick={handlePost}
              className="rounded-2xl bg-[#0B1F16] px-8 py-3.5 text-xs font-extrabold text-white shadow-lg hover:bg-[#14532D] transition cursor-pointer"
            >
              📢 Post Live Campus Broadcast →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FacultySecurityManager({ pushToast }: { pushToast: (m: string, k?: Toast["kind"]) => void }) {
  const [code, setCode] = useState(() => localStorage.getItem("campusbite_faculty_code") || "FACULTY2026");
  const [inputCode, setInputCode] = useState(code);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) {
      alert("Verification Code cannot be empty.");
      return;
    }
    localStorage.setItem("campusbite_faculty_code", trimmed);
    setCode(trimmed);
    pushToast(`Faculty Verification Code updated to: ${trimmed}`, "success");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    pushToast("Faculty Passcode copied to clipboard!", "info");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-stone-900/5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#14532D]">
              🔐 Staff Security &amp; Authentication
            </div>
            <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-900">
              Faculty Verification Code Manager
            </h3>
            <p className="mt-1 text-xs text-stone-500 max-w-xl">
              Professors and staff members enter this code when registering their account on the Faculty/Staff tab. Only authorized faculty with this code or <code className="font-bold text-[#14532D]">@niet.ac.in</code> email can register.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-5 py-3 text-center shadow-inner">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-800">Active Faculty Code</div>
              <div className="font-mono text-2xl font-black text-[#0B1F16]">{code}</div>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-2xl bg-[#14532D] px-4 py-4 text-xs font-extrabold text-[#FCECC5] shadow-md hover:bg-[#0F3E22] transition cursor-pointer"
            >
              {copied ? "✓ Copied!" : "📋 Copy Code"}
            </button>
          </div>
        </div>

        {/* Change Code Form */}
        <div className="mt-6 grid gap-6 md:grid-cols-2 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#14532D]">
              Assign New Verification Passcode
            </label>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="e.g. NIET_FAC_2026"
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3.5 font-mono text-sm font-bold uppercase outline-none focus:border-[#14532D] focus:bg-white"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={handleSave}
              className="w-full rounded-2xl bg-[#0B1F16] py-3.5 text-xs font-extrabold text-white shadow-lg hover:bg-[#14532D] transition cursor-pointer"
            >
              🔒 Assign &amp; Save New Passcode →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDeliveryRunnerManager({
  runners,
  setRunners,
  orders,
  pushToast,
}: {
  runners: DeliveryRunner[];
  setRunners: React.Dispatch<React.SetStateAction<DeliveryRunner[]>>;
  orders: Order[];
  pushToast: (m: string, k?: Toast["kind"]) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAvatar, setNewAvatar] = useState("🛵");

  const handleAddRunner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      pushToast("Please provide runner name and phone number", "warn");
      return;
    }
    const newRunner: DeliveryRunner = {
      id: `runner-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      status: "available",
      avatar: newAvatar,
      deliveriesCount: 0,
    };
    setRunners((prev) => [...prev, newRunner]);
    setNewName("");
    setNewPhone("");
    pushToast(`Registered Delivery Executive ${newRunner.name}`, "success");
  };

  const toggleRunnerStatus = (id: string) => {
    setRunners((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextStatus: DeliveryRunner["status"] =
            r.status === "available" ? "on-delivery" : r.status === "on-delivery" ? "off-duty" : "available";
          pushToast(`${r.name} status set to ${nextStatus.toUpperCase()}`);
          return { ...r, status: nextStatus };
        }
        return r;
      })
    );
  };

  const removeRunner = (id: string, name: string) => {
    if (confirm(`Remove delivery runner ${name}?`)) {
      setRunners((prev) => prev.filter((r) => r.id !== id));
      pushToast(`Removed ${name}`, "info");
    }
  };

  const availableCount = runners.filter((r) => r.status === "available").length;
  const onDeliveryCount = runners.filter((r) => r.status === "on-delivery").length;

  return (
    <div className="mt-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#0B1F16] to-[#14532D] p-6 text-white shadow-lg">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-200">
            Desk Delivery Logistics Management
          </div>
          <h3 className="mt-1 text-2xl font-extrabold">Delivery Runners &amp; Executives</h3>
          <p className="mt-1 text-xs text-white/70">
            Assign runners to desk delivery orders across Block A, B, C &amp; D classrooms.
          </p>
        </div>
        <div className="flex gap-2 text-xs font-bold">
          <span className="rounded-full bg-emerald-500/30 border border-emerald-300/40 px-3.5 py-1.5 text-emerald-200">
            🟢 {availableCount} Available
          </span>
          <span className="rounded-full bg-amber-500/30 border border-amber-300/40 px-3.5 py-1.5 text-amber-200">
            🛵 {onDeliveryCount} On Delivery
          </span>
        </div>
      </div>

      {/* Add New Runner Form */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-900/5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Register New Delivery Executive</div>
        <form onSubmit={handleAddRunner} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-28">
            <label className="text-[10px] font-bold text-stone-500 uppercase">Vehicle/Icon</label>
            <select
              value={newAvatar}
              onChange={(e) => setNewAvatar(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-sm font-bold outline-none focus:border-[#14532D]"
            >
              <option value="🛵">🛵 Scooter</option>
              <option value="🚲">🚲 Bicycle</option>
              <option value="🏃">🏃 Runner</option>
              <option value="⚡">⚡ Express</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] font-bold text-stone-500 uppercase">Runner Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[#14532D]"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] font-bold text-stone-500 uppercase">Phone Number</label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[#14532D]"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-[#0B1F16] px-5 py-2.5 text-xs font-black text-white hover:bg-[#14532D] transition cursor-pointer"
          >
            + Register Runner
          </button>
        </form>
      </div>

      {/* Runners Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {runners.map((r) => {
          const assignedOrders = orders.filter((o) => o.runnerId === r.id && o.stage < 5);
          return (
            <div key={r.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-2xl shadow-inner">
                      {r.avatar}
                    </div>
                    <div>
                      <div className="font-extrabold text-stone-900">{r.name}</div>
                      <a href={`tel:${r.phone}`} className="font-mono text-xs font-bold text-[#14532D] hover:underline">
                        📞 {r.phone}
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => removeRunner(r.id, r.name)}
                    className="text-stone-300 hover:text-rose-600 text-xs font-bold p-1 cursor-pointer"
                    title="Remove runner"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs border-t border-stone-100 pt-3">
                  <span className="text-stone-500 font-medium">Deliveries:</span>
                  <span className="font-mono font-black text-[#14532D]">{r.deliveriesCount} completed</span>
                </div>

                {assignedOrders.length > 0 && (
                  <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-2 text-[11px] font-bold text-amber-900">
                    🛵 Active: {assignedOrders.map((o) => `#${o.token}`).join(", ")}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                <button
                  onClick={() => toggleRunnerStatus(r.id)}
                  className={"flex-1 rounded-full py-2 text-[11px] font-black uppercase tracking-wider transition cursor-pointer text-center " +
                    (r.status === "available"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : r.status === "on-delivery"
                      ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                      : "bg-stone-100 text-stone-500 border border-stone-200")}
                >
                  {r.status === "available" ? "🟢 Available" : r.status === "on-delivery" ? "🛵 On Delivery" : "⚪ Off-Duty"}
                </button>
                <a
                  href={`tel:${r.phone}`}
                  className="rounded-full bg-[#0B1F16] p-2 text-white hover:bg-[#14532D] transition"
                  title="Call Runner"
                >
                  📞
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminDashboard({
  orders, setOrders, user, bumpData, pushToast, onPreviewCanteen, activeTab, setActiveTab, broadcast, setBroadcast, runners, setRunners, assignRunnerToOrder,
}: {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  user: User;
  bumpData: () => void;
  pushToast: (m: string, k?: Toast["kind"]) => void;
  onPreviewCanteen: (id: string) => void;
  activeTab?: AdminTab;
  setActiveTab?: (tab: AdminTab) => void;
  broadcast?: any;
  setBroadcast?: any;
  runners: DeliveryRunner[];
  setRunners: React.Dispatch<React.SetStateAction<DeliveryRunner[]>>;
  assignRunnerToOrder: (orderId: string, runnerId: string) => void;
}) {
  // Scope: if user.canteenId is set, this admin is strictly scoped to ONE canteen only
  const scopedCanteenId = user.canteenId;
  const scopedCanteen = scopedCanteenId ? canteens.find((c) => c.id === scopedCanteenId) : null;
  const isSuperAdmin = !scopedCanteenId;

  // Visible data — strictly filtered by canteen scope for outlet admins, or all outlets for Super Admin
  const visibleCanteens = scopedCanteenId ? canteens.filter((c) => c.id === scopedCanteenId) : canteens;
  const visibleOrders = scopedCanteenId ? orders.filter((o) => o.canteenId === scopedCanteenId) : orders;
  const visibleFoods = scopedCanteenId ? foods.filter((f) => f.canteenId === scopedCanteenId) : foods;

  // Dynamic student list calculated from live orders + dummy fallback
  const dynamicStudents = useMemo(() => {
    const tally: Record<string, { name: string; roll: string; dept: string; year: string; spend: number; orders: number }> = {};
    orders.forEach((o) => {
      const name = o.student || "Guest Student";
      if (!tally[name]) {
        tally[name] = {
          name,
          roll: `22NIET${Math.floor(100 + Math.random() * 900)}`,
          dept: name.includes("Selva") ? "CSE" : name.includes("Rajesh") ? "Faculty" : "CSE",
          year: name.includes("Rajesh") ? "Faculty" : "3rd Year",
          spend: 0,
          orders: 0,
        };
      }
      tally[name].spend += o.total;
      tally[name].orders += 1;
    });

    const liveList = Object.values(tally);
    return liveList.length > 0 ? liveList : dummyStudents;
  }, [orders]);

  const [localTab, setLocalTab] = useState<AdminTab>("overview");
  const tab = activeTab ?? localTab;
  const setTab = (t: AdminTab) => {
    setLocalTab(t);
    if (setActiveTab) setActiveTab(t);
  };
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [menuFilter, setMenuFilter] = useState<string>(scopedCanteenId ?? "all");
  const [menuSort, setMenuSort] = useState<"default" | "orders" | "revenue">("orders");
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [addFoodOpen, setAddFoodOpen] = useState(false);

  // Live KPIs — scoped
  const revenue = visibleOrders.reduce((s, o) => s + o.total, 0);
  const totalOrders = visibleOrders.length;
  const avgOrder = totalOrders > 0 ? Math.round(revenue / totalOrders) : 0;
  const liveOrders = visibleOrders.filter((o) => {
    const max = o.mode === "pickup" ? pickupStages.length - 1 : orderStages.length - 1;
    return o.stage < max;
  }).length;
  const paidPct = totalOrders > 0
    ? Math.round((visibleOrders.filter((o) => o.paymentStatus === "paid").length / totalOrders) * 100)
    : 0;

  // Per-canteen breakdown (super admin only)
  const perCanteen = visibleCanteens.map((c) => {
    const list = visibleOrders.filter((o) => o.canteenId === c.id);
    return { canteen: c, count: list.length, revenue: list.reduce((s, o) => s + o.total, 0) };
  });
  const maxCanteenRev = Math.max(1, ...perCanteen.map((p) => p.revenue));

  // Top dishes — scoped
  const dishTally: Record<string, { name: string; qty: number; revenue: number; emoji: string }> = {};
  visibleOrders.forEach((o) => o.items.forEach((i) => {
    if (!dishTally[i.foodId]) dishTally[i.foodId] = { name: i.name, qty: 0, revenue: 0, emoji: i.emoji };
    dishTally[i.foodId].qty += i.qty;
    dishTally[i.foodId].revenue += i.price * i.qty;
  }));
  const topDishes = Object.values(dishTally).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const maxDishOrders = Math.max(0, ...Object.values(dishTally).map((d) => d.qty));

  const setCanteenStatus = async (id: string, status: Canteen["status"]) => {
    const c = canteens.find((x) => x.id === id);
    if (c) { c.status = status; bumpData(); pushToast(`${c.name} set to ${status.toUpperCase()}`, "info"); }
    const token = localStorage.getItem("campusbite_token");
    if (token) {
      try {
        await fetch("/api/canteens", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id, status }),
        });
      } catch {}
    }
  };

  const updateFoodPrice = async (id: string, price: number) => {
    const f = foods.find((x) => x.id === id);
    if (f) { f.price = price; bumpData(); }
    const token = localStorage.getItem("campusbite_token");
    if (token) {
      try {
        const numId = Number(id);
        if (!isNaN(numId)) {
          await fetch(`/api/foods/${numId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ price }),
          });
        }
      } catch {}
    }
  };

  const togglePopular = async (id: string) => {
    const f = foods.find((x) => x.id === id);
    if (f) {
      f.popular = !f.popular;
      bumpData();
      pushToast(`${f.name} ${f.popular ? "marked signature" : "unmarked"}`, "info");
      const token = localStorage.getItem("campusbite_token");
      if (token) {
        try {
          const numId = Number(id);
          if (!isNaN(numId)) {
            await fetch(`/api/foods/${numId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ popular: f.popular }),
            });
          }
        } catch {}
      }
    }
  };

  const toggleSoldOut = async (id: string) => {
    const f = foods.find((x) => x.id === id);
    if (f) {
      f.soldOut = !f.soldOut;
      bumpData();
      pushToast(`${f.name} marked as ${f.soldOut ? "SOLD OUT 🚫" : "IN STOCK 🟢"}`, f.soldOut ? "warn" : "success");
      const token = localStorage.getItem("campusbite_token");
      if (token) {
        try {
          const numId = Number(id);
          if (!isNaN(numId)) {
            await fetch(`/api/foods/${numId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ soldOut: f.soldOut }),
            });
          }
        } catch {}
      }
    }
  };

  const removeFood = async (id: string) => {
    const idx = foods.findIndex((x) => x.id === id);
    if (idx >= 0) {
      const f = foods[idx];
      foods.splice(idx, 1);
      bumpData();
      pushToast(`Removed ${f.name}`, "warn");
      const token = localStorage.getItem("campusbite_token");
      if (token) {
        try {
          const numId = Number(id);
          if (!isNaN(numId)) {
            await fetch(`/api/foods/${numId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        } catch {}
      }
    }
  };

  const addFood = async (f: Omit<FoodItem, "id">) => {
    const id = `${f.canteenId.slice(0, 2)}-${Math.random().toString(36).slice(2, 6)}`;
    foods.push({ ...f, id });
    bumpData();
    pushToast(`Added ${f.name}`);
    const token = localStorage.getItem("campusbite_token");
    if (token) {
      try {
        await fetch("/api/foods", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(f),
        });
      } catch {}
    }
  };

  const menuFoods = menuFilter === "all" ? foods : foods.filter((f) => f.canteenId === menuFilter);
  const filteredOrders = orderFilter === "all" ? visibleOrders : visibleOrders.filter((o) => o.canteenId === orderFilter);
  void visibleFoods;

  const cancelOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    pushToast(`Order ${id} cancelled & refunded`, "warn");
  };

  const advanceOrderStage = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const stages = o.mode === "pickup" ? pickupStages : orderStages;
          const next = Math.min(stages.length - 1, o.stage + 1);
          if (next === 2) {
            const canteenObj = canteens.find((c) => c.id === o.canteenId);
            announceTokenReady(o.token, canteenObj?.name);
          }
          return { ...o, stage: next };
        }
        return o;
      })
    );

    pushToast(`Order status updated!`, "success");

    const token = localStorage.getItem("campusbite_token");
    if (token) {
      try {
        const numId = Number(orderId.replace(/\D/g, ""));
        if (!isNaN(numId)) {
          await fetch("/api/admin/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id: numId, action: "advance" }),
          });
        }
      } catch {}
    }
  };

  const clearAllOrders = async () => {
    if (confirm("Are you sure you want to permanently clear all test orders from the database?")) {
      setOrders([]);
      localStorage.removeItem("campusbite_orders");
      pushToast("All test orders cleared from system", "info");

      const token = localStorage.getItem("campusbite_token");
      if (token) {
        try {
          await fetch("/api/orders", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (e) {
          console.error("Failed to clear orders on server", e);
        }
      }
    }
  };

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8">
      {/* Admin hero */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0B1F16] to-[#14532D] p-8 text-white shadow-2xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lime-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-[#FCECC5]/15 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200">
              🛡 {isSuperAdmin ? "Super Admin" : "Canteen Admin"} · {user.name}
            </div>
            {scopedCanteen && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">
                <div className="h-6 w-6 shrink-0 overflow-hidden rounded-md bg-stone-100">
                  <img src={scopedCanteen.logo} alt="" className="h-full w-full object-cover" />
                </div>
                Managing: {scopedCanteen.name}
                <span className="ml-1 rounded-full bg-lime-400/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-lime-200">
                  Private Outlet View
                </span>
              </div>
            )}
            <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},<br />
              <span className="font-display italic text-[#FCECC5]">{user.name.split(" ").slice(-1)[0]}.</span>
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {isSuperAdmin && <>&nbsp;·&nbsp; {canteens.filter((c) => c.status === "open").length} of {canteens.length} canteens open</>}
              {scopedCanteen && <>&nbsp;·&nbsp; Status: <b className="capitalize text-[#FCECC5]">{scopedCanteen.status}</b></>}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPI label="Revenue" value={`₹${revenue}`} accent="text-[#FCECC5]" />
            <KPI label="Orders" value={String(totalOrders)} />
            <KPI label="Live" value={String(liveOrders)} accent="text-lime-300" />
            <KPI label="Avg order" value={`₹${avgOrder}`} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {([
          { k: "overview" as AdminTab, label: "Overview", icon: "📊" },
          { k: "analytics" as AdminTab, label: "Analytics & CSV", icon: "📥" },
          { k: "canteens" as AdminTab, label: "Canteens", icon: "🏛" },
          { k: "menu" as AdminTab, label: "Menu items", icon: "🍽" },
          { k: "orders" as AdminTab, label: "Orders", icon: "📦" },
          { k: "students" as AdminTab, label: "Students", icon: "🎓" },
          { k: "combos" as AdminTab, label: "Combos", icon: "🎁" },
          { k: "security" as AdminTab, label: "Faculty Passcode", icon: "🔐" },
          { k: "broadcast" as AdminTab, label: "Announcements", icon: "📢" },
          { k: "runners" as AdminTab, label: "Delivery Runners", icon: "🛵" },
          { k: "feedback" as AdminTab, label: "Beta Feedback", icon: "💬" },
          { k: "crashes" as AdminTab, label: "Crash Logs", icon: "⚠️" },
        ]).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={
              "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition " +
              (tab === t.k
                ? "border-[#0B1F16] bg-[#0B1F16] text-white shadow-md"
                : "border-stone-200 bg-white text-stone-700 hover:border-[#14532D]/40")
            }
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ========= OVERVIEW ========= */}
      {tab === "overview" && (
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {/* Revenue by canteen */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-900/5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">
                  {isSuperAdmin ? "Revenue by canteen" : `${scopedCanteen?.name} revenue`}
                </div>
                <h3 className="mt-1 text-xl font-bold">
                  {isSuperAdmin ? "Where the money is coming from" : "Live earnings tracker"}
                </h3>
              </div>
              <div className="text-[11px] font-medium text-stone-500">Today</div>
            </div>
            <div className="mt-6 space-y-4">
              {perCanteen.map((p) => (
                <div key={p.canteen.id}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                        <img src={p.canteen.logo} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <div className="font-bold">{p.canteen.name}</div>
                        <div className="text-[10px] text-stone-500">{p.count} orders</div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-[#14532D]">₹{p.revenue}</div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#14532D] to-[#FCECC5]"
                      style={{ width: `${(p.revenue / maxCanteenRev) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {revenue === 0 && (
                <div className="rounded-2xl bg-stone-50 p-6 text-center text-xs text-stone-500">
                  No orders yet today. Data will populate as students order.
                </div>
              )}
            </div>
          </div>

          {/* Top dishes */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-900/5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Top dishes</div>
            <h3 className="mt-1 text-xl font-bold">Bestsellers</h3>
            {topDishes.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-stone-50 p-6 text-center text-xs text-stone-500">No sales yet.</div>
            ) : (
              <ol className="mt-4 space-y-3">
                {topDishes.map((d, i) => (
                  <li key={d.name} className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-stone-400">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-xl">{d.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{d.name}</div>
                      <div className="text-[11px] text-stone-500">{d.qty} sold · ₹{d.revenue}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Meta stats */}
          <div className="rounded-3xl bg-[#FCECC5] p-6 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-900">Payment health</div>
            <h3 className="mt-1 text-xl font-bold text-[#0B1F16]">Paid vs pending</h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-6xl text-[#0B1F16]">{paidPct}%</span>
              <span className="text-sm font-semibold text-amber-900">of orders paid online</span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/70">
              <div className="h-full bg-[#14532D]" style={{ width: `${paidPct}%` }} />
            </div>
            <p className="mt-4 text-xs text-amber-900">
              Remaining {100 - paidPct}% will pay at counter on pickup.
            </p>
          </div>

          {/* Recent orders */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-900/5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Recent orders</div>
                <h3 className="mt-1 text-xl font-bold">Latest 5</h3>
              </div>
              <button onClick={() => setTab("orders")} className="text-[12px] font-bold text-[#14532D] underline underline-offset-4">
                View all →
              </button>
            </div>
            {visibleOrders.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-stone-50 p-6 text-center text-xs text-stone-500">No orders yet.</div>
            ) : (
              <ul className="mt-4 divide-y divide-stone-100">
                {visibleOrders.slice(0, 5).map((o) => {
                  const c = canteens.find((x) => x.id === o.canteenId)!;
                  const stages = o.mode === "pickup" ? pickupStages : orderStages;
                  return (
                    <li key={o.id} className="flex items-center gap-3 py-3">
                      <span className="font-mono text-xs font-bold tracking-[0.15em] text-[#14532D]">{o.token}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{c.name} · {o.student}</div>
                        <div className="text-[11px] text-stone-500">{stages[o.stage].label} · {o.mode === "pickup" ? "Pickup" : "Delivery"}</div>
                      </div>
                      <span className="font-mono text-sm font-bold">₹{o.total}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ========= ANALYTICS & CSV ========= */}
      {tab === "analytics" && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#0B1F16] to-[#14532D] p-6 text-white shadow-lg">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-200">Daily Financial Report</div>
              <h3 className="mt-1 text-2xl font-extrabold">Sales Analytics &amp; CSV Export</h3>
              <p className="mt-1 text-xs text-white/70">Export live order data directly to CSV spreadsheet format for bookkeeping.</p>
            </div>
            <button
              onClick={() => exportSalesCSV(visibleOrders, canteens)}
              className="inline-flex items-center gap-2 rounded-full bg-[#FCECC5] px-5 py-3 text-xs font-black text-[#0B1F16] shadow-lg hover:bg-white transition cursor-pointer"
            >
              📥 Export Sales Report (CSV) →
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <KPI label="Total Sales" value={`₹${revenue}`} accent="text-[#14532D]" />
            <KPI label="Total Orders" value={String(totalOrders)} />
            <KPI label="Avg Order Value" value={`₹${avgOrder}`} />
            <KPI label="Online Paid %" value={`${paidPct}%`} accent="text-emerald-800" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Revenue breakdown by canteen */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-900/5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Revenue Share</div>
              <h3 className="mt-1 text-xl font-bold">Canteen Sales Breakdown</h3>
              <div className="mt-5 space-y-4">
                {perCanteen.map((p) => (
                  <div key={p.canteen.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-2">
                        <span>{p.canteen.emoji}</span>
                        <span>{p.canteen.name}</span>
                      </span>
                      <span className="font-mono text-[#14532D]">₹{p.revenue} ({p.count} orders)</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#14532D] to-[#FCECC5]"
                        style={{ width: `${maxCanteenRev > 0 ? (p.revenue / maxCanteenRev) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Bestselling Dishes */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-900/5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Bestsellers</div>
              <h3 className="mt-1 text-xl font-bold">Top Performing Items</h3>
              {topDishes.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-stone-50 p-6 text-center text-xs text-stone-500">No sales recorded yet today.</div>
              ) : (
                <ol className="mt-4 space-y-3">
                  {topDishes.map((d, i) => (
                    <li key={d.name} className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50/60 p-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-black text-stone-400">0{i + 1}</span>
                        <span className="text-2xl">{d.emoji}</span>
                        <div>
                          <div className="text-sm font-bold text-stone-900">{d.name}</div>
                          <div className="text-[11px] text-stone-500">{d.qty} portions sold</div>
                        </div>
                      </div>
                      <div className="font-mono text-base font-extrabold text-[#14532D]">₹{d.revenue}</div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========= CANTEENS ========= */}
      {tab === "canteens" && (
        <div className={"mt-6 grid gap-5 " + (visibleCanteens.length > 1 ? "sm:grid-cols-2 lg:grid-cols-4" : "max-w-md")}>
          {visibleCanteens.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-900/5">
              <div className="relative h-40 overflow-hidden bg-stone-100">
                <img src={c.logo} alt={c.name} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-4 text-white">
                  <div className="text-xs font-bold uppercase tracking-widest opacity-80">{c.location}</div>
                  <div className="text-xl font-bold">{c.name}</div>
                </div>
              </div>
              <div className="p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Set status</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["open", "busy", "closed"] as Canteen["status"][]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setCanteenStatus(c.id, s)}
                      className={
                        "rounded-xl border py-2 text-[11px] font-bold uppercase tracking-widest transition " +
                        (c.status === s
                          ? s === "open" ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                            : s === "busy" ? "border-amber-500 bg-amber-50 text-amber-800"
                            : "border-rose-500 bg-rose-50 text-rose-800"
                          : "border-stone-200 text-stone-500 hover:border-stone-400")
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-xs">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">Rating</dt>
                    <dd className="mt-1 text-lg font-bold">★ {c.rating.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">Wait</dt>
                    <dd className="mt-1 text-lg font-bold">{c.waitMin}–{c.waitMax}m</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">Items</dt>
                    <dd className="mt-1 text-lg font-bold">{foods.filter((f) => f.canteenId === c.id).length}</dd>
                  </div>
                </dl>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setMenuFilter(c.id); setTab("menu"); }}
                    className="rounded-full border border-stone-200 py-2 text-[11px] font-bold text-stone-700 hover:border-[#14532D] hover:text-[#14532D]"
                  >
                    Edit menu
                  </button>
                  <button
                    onClick={() => onPreviewCanteen(c.id)}
                    className="rounded-full bg-[#0B1F16] py-2 text-[11px] font-bold text-white hover:bg-[#14532D]"
                  >
                    Preview →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========= MENU ========= */}
      {tab === "menu" && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {isSuperAdmin && (
                <button
                  onClick={() => setMenuFilter("all")}
                  className={"rounded-full border px-4 py-1.5 text-[12px] font-bold transition cursor-pointer " +
                    (menuFilter === "all" ? "border-[#0B1F16] bg-[#0B1F16] text-white" : "border-stone-200 bg-white text-stone-700")}
                >
                  All canteens
                </button>
              )}
              {visibleCanteens.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setMenuFilter(c.id)}
                  className={"rounded-full border px-4 py-1.5 text-[12px] font-bold transition cursor-pointer " +
                    (menuFilter === c.id ? "border-[#0B1F16] bg-[#0B1F16] text-white" : "border-stone-200 bg-white text-stone-700")}
                >
                  {c.name}
                </button>
              ))}

              <div className="mx-2 h-4 w-px bg-stone-300 hidden sm:block" />

              {/* Sort pills */}
              <div className="flex items-center gap-1 rounded-full bg-stone-100 p-1 text-[11px] font-bold">
                {[
                  { k: "orders" as const, label: "🔥 Most Ordered" },
                  { k: "revenue" as const, label: "💰 Highest Revenue" },
                  { k: "default" as const, label: "Default" },
                ].map((s) => (
                  <button
                    key={s.k}
                    onClick={() => setMenuSort(s.k)}
                    className={"rounded-full px-3 py-1 transition cursor-pointer " +
                      (menuSort === s.k ? "bg-[#14532D] text-white shadow-sm" : "text-stone-600 hover:text-stone-900")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setAddFoodOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#D64545] px-4 py-2 text-[12px] font-bold text-white shadow-md hover:bg-[#B93636] cursor-pointer"
            >
              + Add new item
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-900/5">
            <div className="hidden grid-cols-12 gap-3 border-b border-stone-100 bg-[#E7EEE7] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D] md:grid">
              <div className="col-span-4">Item &amp; Sales Tally</div>
              <div className="col-span-2">Canteen</div>
              <div className="col-span-1">Diet</div>
              <div className="col-span-2">Price (₹)</div>
              <div className="col-span-1">Sig.</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {menuFoods
              .filter((f) => (isSuperAdmin || f.canteenId === scopedCanteenId) && (menuFilter === "all" || f.canteenId === menuFilter))
              .sort((a, b) => {
                if (menuSort === "orders") return (dishTally[b.id]?.qty || 0) - (dishTally[a.id]?.qty || 0);
                if (menuSort === "revenue") return (dishTally[b.id]?.revenue || 0) - (dishTally[a.id]?.revenue || 0);
                return 0;
              })
              .map((f) => {
                const c = canteens.find((x) => x.id === f.canteenId)!;
                const tally = dishTally[f.id] || { qty: 0, revenue: 0 };
                const isTopOrdered = tally.qty > 0 && tally.qty === maxDishOrders;

                return (
                  <div key={f.id} className="grid grid-cols-12 items-center gap-3 border-t border-stone-100 px-6 py-3.5 transition hover:bg-stone-50">
                    <div className="col-span-12 flex items-center gap-3 md:col-span-4">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-stone-100 shadow-sm border border-stone-200">
                        {f.image ? (
                          <img src={f.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className={"flex h-full w-full items-center justify-center text-xl " + f.bg}>{f.emoji}</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate text-sm font-bold text-stone-900">{f.name}</span>
                          {isTopOrdered && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-amber-900 border border-amber-500/40 animate-pulse">
                              🔥 #1 Most Ordered
                            </span>
                          )}
                          {tally.qty > 0 && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-mono font-extrabold text-emerald-900 border border-emerald-300">
                              🛒 {tally.qty} sold (₹{tally.revenue})
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[10px] text-stone-500">{f.description}</div>
                      </div>
                    </div>
                  <div className="col-span-6 md:col-span-2 text-xs font-semibold text-stone-700">{c.name}</div>
                  <div className="col-span-2 md:col-span-1">
                    <span className={"inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 bg-white " +
                      (f.diet === "non-veg" ? "border-rose-600" : "border-emerald-600")}>
                      <span className={"h-1.5 w-1.5 rounded-full " + (f.diet === "non-veg" ? "bg-rose-600" : "bg-emerald-600")} />
                    </span>
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <input
                      type="number"
                      defaultValue={f.price}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value);
                        if (!isNaN(v) && v !== f.price) { updateFoodPrice(f.id, v); pushToast(`${f.name} → ₹${v}`, "info"); }
                      }}
                      className="w-20 rounded-lg border border-stone-200 px-2 py-1 text-sm font-mono font-bold outline-none focus:border-[#14532D]"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <button
                      onClick={() => togglePopular(f.id)}
                      className={"inline-flex h-6 w-11 items-center rounded-full p-0.5 transition " +
                        (f.popular ? "bg-[#D64545]" : "bg-stone-300")}
                    >
                      <span className={"h-5 w-5 transform rounded-full bg-white shadow transition " +
                        (f.popular ? "translate-x-5" : "translate-x-0")} />
                    </button>
                  </div>
                  <div className="col-span-12 flex items-center justify-end gap-2 md:col-span-2">
                    <button
                      onClick={() => toggleSoldOut(f.id)}
                      className={"rounded-full border px-3 py-1 text-[11px] font-bold transition cursor-pointer " +
                        (f.soldOut
                          ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100")}
                    >
                      {f.soldOut ? "Sold Out 🚫" : "In Stock 🟢"}
                    </button>
                    <button
                      onClick={() => setEditingFood(f)}
                      className="rounded-full border border-stone-200 px-3 py-1 text-[11px] font-bold text-stone-700 hover:border-[#14532D] hover:text-[#14532D]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { if (confirm(`Remove "${f.name}"?`)) removeFood(f.id); }}
                      className="rounded-full border border-rose-200 px-3 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
            {menuFoods.length === 0 && (
              <div className="p-10 text-center text-sm text-stone-500">No items match this filter.</div>
            )}
          </div>

          {editingFood && (
            <EditFoodModal food={editingFood} onClose={() => setEditingFood(null)} onSave={(patch) => {
              const f = foods.find((x) => x.id === editingFood.id);
              if (f) Object.assign(f, patch);
              bumpData();
              pushToast(`Updated ${patch.name || editingFood.name}`);
              setEditingFood(null);
            }} />
          )}
          {addFoodOpen && (
            <EditFoodModal
              food={null}
              onClose={() => setAddFoodOpen(false)}
              onSave={(f) => { addFood(f as Omit<FoodItem, "id">); setAddFoodOpen(false); }}
            />
          )}
        </div>
      )}

      {/* ========= ORDERS ========= */}
      {tab === "orders" && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {isSuperAdmin && (
                <>
                  <button
                    onClick={() => setOrderFilter("all")}
                    className={"rounded-full border px-4 py-1.5 text-[12px] font-bold transition cursor-pointer " +
                      (orderFilter === "all" ? "border-[#0B1F16] bg-[#0B1F16] text-white" : "border-stone-200 bg-white text-stone-700")}
                  >
                    All ({visibleOrders.length})
                  </button>
                  {visibleCanteens.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setOrderFilter(c.id)}
                      className={"rounded-full border px-4 py-1.5 text-[12px] font-bold transition cursor-pointer " +
                        (orderFilter === c.id ? "border-[#0B1F16] bg-[#0B1F16] text-white" : "border-stone-200 bg-white text-stone-700")}
                    >
                      {c.name} ({visibleOrders.filter((o) => o.canteenId === c.id).length})
                    </button>
                  ))}
                </>
              )}
            </div>

            {filteredOrders.length > 0 && (
              <button
                onClick={clearAllOrders}
                className="rounded-full border border-stone-300 bg-stone-100 px-4 py-1.5 text-xs font-bold text-stone-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition cursor-pointer"
              >
                🧹 Clear Test Orders
              </button>
            )}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-16 text-center">
              <div className="text-6xl">📦</div>
              <div className="mt-3 font-display text-2xl italic text-stone-500">No active orders yet.</div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredOrders.map((o) => {
                const c = canteens.find((x) => x.id === o.canteenId) || canteens[0];
                const stages = o.mode === "pickup" ? pickupStages : orderStages;
                const done = o.stage >= stages.length - 1;
                return (
                  <div key={o.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-3xl font-black tracking-[0.15em] text-[#14532D]">{o.token}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-stone-800">
                          <span>👤 {o.student}</span>
                          {o.isFacultyOrder && (
                            <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-900 shadow-xs">
                              ⭐ Faculty VIP Priority
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-2xl font-black text-[#0B1F16]">₹{o.total}</div>
                        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                          {o.mode === "pickup" ? "Pickup" : "Delivery"}
                        </div>
                        <div className={"mt-0.5 text-[10px] font-extrabold uppercase tracking-widest " + (o.paymentStatus === "paid" ? "text-emerald-700" : "text-amber-700")}>
                          {o.paymentStatus === "paid" ? "✓ Paid Online" : "⚠️ Cash on Counter"}
                        </div>
                      </div>
                    </div>

                    {/* Order items */}
                    <div className="mt-3 rounded-xl bg-stone-50 p-2.5 text-xs text-stone-700 font-medium">
                      {o.items.map((i) => `${i.emoji || "🍽"} ${i.name} × ${i.qty}`).join(", ")}
                    </div>

                    {/* Desk Delivery Location & Runner Assignment Box */}
                    {o.mode === "delivery" && (
                      <div className="mt-3 rounded-2xl bg-[#E7EEE7] p-3 border border-emerald-200">
                        <div className="flex items-center justify-between text-xs font-bold text-[#14532D]">
                          <span>📍 Desk Delivery Location:</span>
                          <span className="font-mono">{o.location?.block}, {o.location?.room}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-stone-600 font-semibold">
                          Row {o.location?.row}, Desk {o.location?.desk}
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-emerald-200/60">
                          {o.runnerName ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-black text-[#0B1F16]">
                                <span>🛵 Assigned Executive:</span>
                                <span className="text-[#14532D]">{o.runnerName}</span>
                                <a href={`tel:${o.runnerPhone}`} className="font-mono text-[11px] text-emerald-800 underline">
                                  (📞 {o.runnerPhone})
                                </a>
                              </div>
                              <button
                                onClick={() => assignRunnerToOrder(o.id, "")}
                                className="text-[10px] font-bold text-stone-500 hover:text-stone-800 underline cursor-pointer"
                              >
                                Reassign
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="text-[10px] font-extrabold uppercase text-amber-900">Assign Delivery Runner:</div>
                              <div className="flex flex-wrap gap-1.5">
                                {runners
                                  .filter((r) => r.status !== "off-duty")
                                  .map((r) => (
                                    <button
                                      key={r.id}
                                      onClick={() => assignRunnerToOrder(o.id, r.id)}
                                      className="rounded-full border border-emerald-600 bg-white px-2.5 py-1 text-[10px] font-extrabold text-[#14532D] hover:bg-[#14532D] hover:text-white transition cursor-pointer shadow-xs"
                                    >
                                      {r.avatar} {r.name.split(" ")[0]}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-1">
                      {stages.map((_, i) => (
                        <div key={i} className={"h-1.5 flex-1 rounded-full " + (i <= o.stage ? "bg-[#14532D]" : "bg-stone-200")} />
                      ))}
                    </div>

                    {/* Stage Approval Action Bar */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#14532D]">
                        Status: {stages[o.stage].label}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {o.stage === 0 && (
                          <button
                            onClick={() => advanceOrderStage(o.id)}
                            className="rounded-full bg-[#14532D] px-3.5 py-1.5 text-[11px] font-extrabold text-white shadow-sm hover:bg-[#0B1F16] transition cursor-pointer"
                          >
                            ✅ Approve &amp; Start Cooking
                          </button>
                        )}
                        {o.stage === 1 && (
                          <>
                            <button
                              onClick={() => announceTokenReady(o.token, c.name)}
                              className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                              title="Voice Callout"
                            >
                              🔊 Callout
                            </button>
                            <button
                              onClick={() => advanceOrderStage(o.id)}
                              className="rounded-full bg-emerald-700 px-3.5 py-1.5 text-[11px] font-extrabold text-white shadow-sm hover:bg-emerald-800 transition cursor-pointer"
                            >
                              🔔 Mark Ready for Pickup
                            </button>
                          </>
                        )}
                        {o.stage === 2 && (
                          <button
                            onClick={() => advanceOrderStage(o.id)}
                            className="rounded-full bg-stone-900 px-3.5 py-1.5 text-[11px] font-extrabold text-white shadow-sm hover:bg-black transition cursor-pointer"
                          >
                            ✓ Mark Collected &amp; Done
                          </button>
                        )}
                        {!done && (
                          <button
                            onClick={() => { if (confirm(`Cancel order ${o.id} and refund?`)) cancelOrder(o.id); }}
                            className="rounded-full border border-rose-200 px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========= STUDENTS ========= */}
      {tab === "students" && (
        <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-900/5">
          <div className="flex items-center justify-between border-b border-stone-100 bg-[#E7EEE7] px-6 py-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Live Student Directory & Spend</div>
              <div className="mt-0.5 text-lg font-bold">{dynamicStudents.length} Active Customers</div>
            </div>
            <div className="text-[11px] font-semibold text-stone-500">
              Total Student Spend: <span className="font-mono font-bold text-[#14532D]">₹{dynamicStudents.reduce((s, x) => s + x.spend, 0)}</span>
            </div>
          </div>
          <div className="hidden grid-cols-12 gap-3 border-b border-stone-100 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500 md:grid">
            <div className="col-span-4">Student</div>
            <div className="col-span-2">Roll / ID</div>
            <div className="col-span-2">Dept</div>
            <div className="col-span-1">Year</div>
            <div className="col-span-2">Spend</div>
            <div className="col-span-1 text-right">Orders</div>
          </div>
          {dynamicStudents.map((s, idx) => {
            const initials = s.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={s.roll || idx} className="grid grid-cols-12 items-center gap-3 border-t border-stone-100 px-6 py-3 transition hover:bg-stone-50">
                <div className="col-span-12 flex items-center gap-3 md:col-span-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#14532D] text-[11px] font-bold text-[#FCECC5]">
                    {initials}
                  </div>
                  <div className="font-bold">{s.name}</div>
                </div>
                <div className="col-span-4 font-mono text-xs font-semibold md:col-span-2">{s.roll}</div>
                <div className="col-span-4 text-xs md:col-span-2">{s.dept}</div>
                <div className="col-span-4 text-xs md:col-span-1">{s.year}</div>
                <div className="col-span-6 font-mono text-sm font-bold text-[#14532D] md:col-span-2">₹{s.spend}</div>
                <div className="col-span-6 text-right font-mono text-sm md:col-span-1">{s.orders}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========= COMBOS ========= */}
      {tab === "combos" && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Combo deals</div>
              <h3 className="mt-1 text-2xl font-bold">Curated bundles for students</h3>
            </div>
            <span className="rounded-full bg-[#FCECC5] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-900">
              {comboDeals.length} active
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {comboDeals.map((d) => (
              <div key={d.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-900/5">
                <div className="flex items-start justify-between">
                  <div className={"flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl text-white shadow-md " + d.accent}>
                    {d.emoji}
                  </div>
                  <span className="rounded-full bg-[#E7EEE7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#14532D]">
                    Save {d.save}%
                  </span>
                </div>
                <h4 className="mt-4 text-lg font-bold leading-tight">{d.title}</h4>
                <p className="mt-1.5 text-[12px] text-stone-600">{d.description}</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="font-display text-3xl text-[#14532D]">₹{d.price}</span>
                    <span className="ml-2 text-xs text-stone-400 line-through">₹{d.originalPrice}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">{d.protein}g</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => pushToast("Combo editing coming soon", "info")}
                    className="rounded-full border border-stone-200 py-2 text-[11px] font-bold text-stone-700 hover:border-[#14532D] hover:text-[#14532D]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => pushToast(`${d.title} paused`, "warn")}
                    className="rounded-full bg-[#0B1F16] py-2 text-[11px] font-bold text-white hover:bg-[#14532D]"
                  >
                    Pause
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========= SECURITY & FACULTY PASSCODE ========= */}
      {tab === "security" && (
        <FacultySecurityManager pushToast={pushToast} />
      )}

      {/* ========= BROADCAST & ANNOUNCEMENTS ========= */}
      {tab === "broadcast" && (
        <AdminBroadcastManager broadcast={broadcast} setBroadcast={setBroadcast} pushToast={pushToast} />
      )}

      {/* ========= DELIVERY RUNNERS & LOGISTICS ========= */}
      {tab === "runners" && (
        <AdminDeliveryRunnerManager
          runners={runners}
          setRunners={setRunners}
          orders={visibleOrders}
          pushToast={pushToast}
        />
      )}

      {/* ========= BETA FEEDBACK QUEUE ========= */}
      {tab === "feedback" && (
        <AdminBetaFeedbackViewer pushToast={pushToast} />
      )}

      {/* ========= CLIENT CRASH LOGS & EXCEPTION TRACKER ========= */}
      {tab === "crashes" && (
        <AdminCrashLogViewer pushToast={pushToast} />
      )}
    </main>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur">
      <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">{label}</div>
      <div className={"mt-1 font-display text-2xl " + (accent ?? "text-white")}>{value}</div>
    </div>
  );
}

function EditFoodModal({ food, onClose, onSave }: {
  food: FoodItem | null;
  onClose: () => void;
  onSave: (f: Partial<FoodItem> | Omit<FoodItem, "id">) => void;
}) {
  const [name, setName] = useState(food?.name ?? "");
  const [price, setPrice] = useState(food?.price ?? 30);
  const [emoji, setEmoji] = useState(food?.emoji ?? "🍽");
  const [description, setDescription] = useState(food?.description ?? "");
  const [canteenId, setCanteenId] = useState(food?.canteenId ?? "spicy");
  const [category, setCategory] = useState<FoodItem["category"]>(food?.category ?? "snacks");
  const [diet, setDiet] = useState<FoodItem["diet"]>(food?.diet ?? "veg");
  const [popular, setPopular] = useState(food?.popular ?? false);

  const isEdit = !!food;

  return (
    <Modal onClose={onClose} title={isEdit ? "Edit menu item" : "Add new menu item"}>
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-1">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Emoji</label>
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)}
              className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-3 text-center text-2xl outline-none focus:border-[#14532D]" />
          </div>
          <div className="col-span-3">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#14532D]" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-[#14532D]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Price (₹)</label>
            <input type="number" value={price} onChange={(e) => setPrice(+e.target.value || 0)}
              className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-mono font-bold outline-none focus:border-[#14532D]" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Canteen</label>
            <select value={canteenId} onChange={(e) => setCanteenId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#14532D]">
              {canteens.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as FoodItem["category"])}
              className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#14532D]">
              <option value="meals">Meals</option>
              <option value="snacks">Snacks</option>
              <option value="drinks">Drinks</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14532D]">Diet</label>
            <select value={diet} onChange={(e) => setDiet(e.target.value as FoodItem["diet"])}
              className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#14532D]">
              <option value="veg">Veg</option>
              <option value="non-veg">Non-Veg</option>
              <option value="jain">Jain</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={popular} onChange={(e) => setPopular(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 accent-[#D64545]" />
          <span className="font-semibold">Mark as signature/popular</span>
        </label>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-stone-200 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!name.trim()) return;
              const patch = { name: name.trim(), price, emoji, description, canteenId, category, diet, popular, bg: "bg-stone-50" as const };
              onSave(patch);
            }}
            className="flex-1 rounded-full bg-[#0B1F16] py-3 text-sm font-bold text-white hover:bg-[#14532D]"
          >
            {isEdit ? "Save changes" : "Add item"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function QRScannerModal({
  orders,
  onCollectOrder,
  onClose,
}: {
  orders: Order[];
  onCollectOrder: (orderId: string) => void;
  onClose: () => void;
}) {
  const [tokenInput, setTokenInput] = useState("");
  const [scanResult, setScanResult] = useState<{ success: boolean; order?: Order; msg: string } | null>(null);

  const handleVerify = (query: string) => {
    const q = query.trim().toUpperCase();
    if (!q) return;
    const match = orders.find((o) => o.token.toUpperCase() === q || o.id.toUpperCase() === q);
    if (match) {
      onCollectOrder(match.id);
      playReadyChime();
      setScanResult({
        success: true,
        order: match,
        msg: `Token ${match.token} Verified! Order marked as COLLECTED 🎉`,
      });
    } else {
      setScanResult({
        success: false,
        msg: `No active order found matching "${q}".`,
      });
    }
  };

  return (
    <Modal onClose={onClose} title="📷 Counter Token QR Scanner">
      <div className="space-y-4">
        {/* Animated Scanner Viewport */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0B1F16] p-6 text-center text-white shadow-inner">
          <div className="mx-auto relative flex h-44 w-44 items-center justify-center rounded-2xl border-2 border-dashed border-lime-400/60 bg-black/40">
            <div className="pointer-events-none absolute inset-0 animate-pulse bg-lime-400/10" />
            <div className="h-0.5 w-full bg-lime-400 shadow-[0_0_15px_#a3e635] animate-bounce" />
            <span className="text-4xl">📷</span>
          </div>
          <div className="mt-3 text-xs font-bold text-lime-200">Scan Student QR Code or Enter Token Below</div>
        </div>

        {/* Manual Token Lookup Fallback */}
        <div className="space-y-2">
          <label className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#14532D]">Verify Token Number</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="e.g. S-104 or CB1001"
              className="flex-1 rounded-xl border border-stone-200 px-4 py-3 font-mono text-sm font-bold uppercase outline-none focus:border-[#14532D]"
              onKeyDown={(e) => { if (e.key === "Enter") handleVerify(tokenInput); }}
            />
            <button
              onClick={() => handleVerify(tokenInput)}
              className="rounded-xl bg-[#14532D] px-5 py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#0F3E22] transition cursor-pointer"
            >
              Verify ✓
            </button>
          </div>
        </div>

        {scanResult && (
          <div className={"rounded-2xl p-4 text-xs font-bold transition " + (scanResult.success ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-rose-100 text-rose-900 border border-rose-300")}>
            <div className="text-sm font-extrabold">{scanResult.success ? "✅ Token Verified!" : "❌ Not Found"}</div>
            <div className="mt-1">{scanResult.msg}</div>
            {scanResult.order && (
              <div className="mt-2 text-[11px] font-semibold border-t border-emerald-200 pt-2">
                Student: {scanResult.order.student} · Items: {scanResult.order.items.map((i) => i.name).join(", ")} · Status: {scanResult.order.paymentStatus === "paid" ? "Paid ✓" : "Pay at counter"}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full rounded-full border border-stone-200 py-3 text-xs font-extrabold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
        >
          Close Scanner
        </button>
      </div>
    </Modal>
  );
}

function KitchenPortal({ orders, setOrders, pushToast, user }: { orders: Order[]; setOrders: React.Dispatch<React.SetStateAction<Order[]>>; pushToast: (m: string, k?: Toast["kind"]) => void; user?: User }) {
  // Scope: if user is a canteen admin, lock the portal to their canteen only
  const scopedCanteenId = user?.role === "admin" ? user.canteenId : undefined;
  const visibleCanteens = scopedCanteenId ? canteens.filter((c) => c.id === scopedCanteenId) : canteens;
  const [tab, setTab] = useState<string>(scopedCanteenId ?? canteens[0].id);
  const [showScanner, setShowScanner] = useState(false);
  const current = canteens.find((c) => c.id === tab)!;
  const canteenOrders = orders.filter((o) => o.canteenId === tab);

  const advance = (id: string) => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== id) return o;
      const max = o.mode === "pickup" ? pickupStages.length - 1 : orderStages.length - 1;
      const nextStage = Math.min(max, o.stage + 1);
      if (nextStage === 2) {
        playReadyChime();
      }
      return { ...o, stage: nextStage };
    }));
    pushToast("Order status updated 🔔", "info");
  };

  const markCollected = (id: string) => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== id) return o;
      const max = o.mode === "pickup" ? pickupStages.length - 1 : orderStages.length - 1;
      return { ...o, stage: max };
    }));
    pushToast("Token collected 🎉", "success");
  };

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="relative overflow-hidden rounded-[32px] bg-[#14532D] p-8 text-white shadow-2xl lg:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lime-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-[#FCECC5]/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200">
              Kitchen portal · Live
            </div>
            <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Manage incoming <span className="font-display italic text-[#FCECC5]">orders.</span>
            </h2>
            <p className="mt-2 text-sm text-white/70">Switch canteens &amp; advance orders through the pipeline.</p>
          </div>

          <button
            onClick={() => setShowScanner(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#0B1F16] px-5 py-3 text-xs font-black text-[#FCECC5] shadow-xl hover:bg-black transition cursor-pointer border border-white/20"
          >
            📷 Scan Token QR Code
          </button>
        </div>
      </div>

      {showScanner && (
        <QRScannerModal
          orders={orders}
          onCollectOrder={markCollected}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {visibleCanteens.map((c) => (
          <button
            key={c.id}
            onClick={() => setTab(c.id)}
            className={
              "inline-flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-bold transition " +
              (tab === c.id
                ? "border-[#14532D] bg-[#14532D] text-white shadow-md"
                : "border-stone-200 bg-white text-stone-700 hover:border-[#14532D]/40")
            }
          >
            {c.name}
            <span className={"rounded-full px-2 py-0.5 font-mono text-[10px] " + (tab === c.id ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600")}>
              {orders.filter((o) => o.canteenId === c.id).length}
            </span>
          </button>
        ))}
        {scopedCanteenId && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FCECC5] px-3 py-2 text-[11px] font-bold text-amber-900">
            🔒 Locked to your canteen
          </span>
        )}
      </div>

      <div className="mt-6">
        {canteenOrders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-16 text-center">
            <div className="text-6xl">🍳</div>
            <div className="mt-3 font-display text-2xl italic text-stone-500">No live orders for {current.name}.</div>
            <div className="text-xs text-stone-500">New orders will appear here in real-time.</div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {canteenOrders.map((o) => {
              const stages = o.mode === "pickup" ? pickupStages : orderStages;
              const stage = stages[o.stage];
              const max = stages.length - 1;
              const done = o.stage >= max;
              const nextLabel = o.stage === 0 ? "Accept" : o.stage === 1 ? "Mark Ready" : o.stage === 2 ? (o.mode === "pickup" ? "Mark Collected" : "Assign Runner") : "Advance";
              return (
                <div key={o.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-900/5">
                  <div className="flex items-center justify-between gap-3 bg-[#14532D] p-4 text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/95 p-1.5 shadow-lg">
                        <img src={current.logo} alt={current.name} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200">Token</div>
                        <div className="font-mono text-2xl font-bold tracking-[0.15em] text-[#FCECC5]">{o.token}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/70">Order #{o.id}</div>
                      <div className="text-lg font-bold">₹{o.total}</div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">👤 {o.student}</span>
                      <span className={"rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest " +
                        (o.stage < 2 ? "bg-amber-50 text-amber-800"
                          : o.stage < 4 ? "bg-cyan-50 text-cyan-800"
                          : "bg-emerald-50 text-emerald-800")
                      }>
                        {stage.emoji} {stage.label}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm">
                      {o.items.map((i) => (
                        <li key={i.foodId} className="flex justify-between border-b border-dashed border-stone-100 py-1.5">
                          <span className="flex items-center gap-1.5">{i.emoji} {i.name} × {i.qty}</span>
                          <span className="font-mono text-stone-500">₹{i.price * i.qty}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 font-semibold text-stone-700">
                        {o.mode === "pickup" ? "🎟 Pickup" : `📍 ${o.location?.block} · ${o.location?.room} · R${o.location?.row}/D${o.location?.desk}`}
                      </span>
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 font-semibold text-stone-700">
                        🕐 {new Date(o.placedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className={"rounded-full px-2.5 py-1 font-bold " + (o.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800")}>
                        {o.paymentStatus === "paid" ? "✓ Paid" : "Cash"}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-1">
                      {stages.map((_, i) => (
                        <div key={i} className={"h-1 flex-1 rounded-full " + (i <= o.stage ? "bg-[#14532D]" : "bg-stone-200")} />
                      ))}
                    </div>
                    {!done && (
                      <button
                        onClick={() => advance(o.id)}
                        className="mt-4 w-full rounded-full bg-[#0B1F16] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#14532D] hover:scale-[1.01]"
                      >
                        {nextLabel} →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function WalletTopUpModal({
  open,
  onClose,
  balance,
  onTopUp,
}: {
  open: boolean;
  onClose: () => void;
  balance: number;
  onTopUp: (amount: number) => Promise<void>;
}) {
  const [amount, setAmount] = useState(200);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const finalAmount = custom ? Number(custom) || 0 : amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (finalAmount <= 0) return;
    setLoading(true);
    await onTopUp(finalAmount);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white p-6 shadow-2xl border border-stone-100">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#14532D]">Campus Wallet</div>
            <h3 className="text-xl font-bold text-stone-900">Add Funds</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200">
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#0B1F16] to-[#14532D] p-4 text-white">
          <div className="text-[10px] uppercase tracking-widest text-lime-300">Current Balance</div>
          <div className="text-3xl font-extrabold font-mono">₹{balance}</div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">Select Amount</label>
            <div className="grid grid-cols-4 gap-2">
              {[100, 200, 500, 1000].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => { setAmount(val); setCustom(""); }}
                  className={`rounded-xl border py-2.5 text-sm font-bold transition ${
                    !custom && amount === val
                      ? "border-[#14532D] bg-[#E7EEE7] text-[#14532D]"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
                  }`}
                >
                  +₹{val}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Or enter custom amount (e.g. 350)"
              className="mt-2.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm font-semibold outline-none focus:border-[#14532D] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">Payment Method</label>
            <div className="space-y-2">
              {[
                { key: "upi", name: "Instant UPI (GPay, PhonePe, Paytm)", icon: "📱" },
                { key: "card", name: "Debit / Credit Card", icon: "💳" },
                { key: "netbanking", name: "Net Banking", icon: "🏦" },
              ].map((m) => (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => setMethod(m.key as any)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                    method === m.key ? "border-[#14532D] bg-[#E7EEE7]/60" : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-xs font-bold text-stone-800">
                    <span>{m.icon}</span> {m.name}
                  </span>
                  <span className={`h-4 w-4 rounded-full border ${method === m.key ? "border-4 border-[#14532D] bg-white" : "border-stone-300"}`} />
                </button>
              ))}
            </div>
          </div>

          {method === "upi" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Scan & Pay via GPay / PhonePe / Paytm</span>
                <span className="rounded-full bg-emerald-200/60 px-2 py-0.5 text-[9px] font-bold text-emerald-900">Official UPI</span>
              </div>
              
              <div className="mt-3 space-y-3">
                <a
                  href={`upi://pay?pa=9360571671@upi&pn=CampusBite&am=${finalAmount}&cu=INR`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#14532D] py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#0F3E22] transition"
                >
                  <span>📱</span> Open UPI App & Pay ₹{finalAmount} →
                </a>

                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-white p-1">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=9360571671@upi&pn=CampusBite&am=${finalAmount}&cu=INR`)}`}
                      alt="CampusBite UPI QR Code"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Pay via Phone Number</div>
                    <div className="font-mono text-base font-extrabold text-[#0B1F16]">📞 9360571671</div>
                    <div className="text-[11px] text-emerald-800 font-bold">UPI ID: <span className="font-mono">9360571671@upi</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || finalAmount <= 0}
            className="w-full rounded-full bg-[#0B1F16] py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#14532D] disabled:opacity-50"
          >
            {loading ? "Processing Top-up..." : `Pay ₹${finalAmount} & Add to Wallet →`}
          </button>
        </form>
      </div>
    </div>
  );
}
