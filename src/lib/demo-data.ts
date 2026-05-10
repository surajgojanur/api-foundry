import type { ChangeEvent, CompetitorProject, FeedItem, InsightCard, ProjectSnapshot } from "@/lib/types";

const nowIso = "2026-05-10T12:00:00.000Z";

function product(
  id: string,
  projectId: string,
  name: string,
  category: string,
  price: number,
  oldPrice: number,
  availability: string,
  sourceUrl: string,
): FeedItem {
  return {
    id,
    blockType: "products",
    title: `${name} - ${availability}`,
    name,
    brand: projectId === "bigbasket" ? "bb Popular" : "Farm Fresh",
    category,
    price,
    oldPrice,
    currency: "INR",
    availability,
    sourceUrl,
    extractedAt: nowIso,
    metadata: {
      packSize: name.includes("1L") ? "1L" : "1kg",
      promoTag: oldPrice > price,
    },
  };
}

function offer(id: string, title: string, description: string, sourceUrl: string): FeedItem {
  return {
    id,
    blockType: "offers",
    title,
    description,
    sourceUrl,
    extractedAt: nowIso,
    metadata: {
      active: true,
    },
  };
}

function availability(id: string, title: string, status: string, sourceUrl: string): FeedItem {
  return {
    id,
    blockType: "availability",
    title,
    availability: status,
    sourceUrl,
    extractedAt: nowIso,
    metadata: {
      slot: "10-20 min",
    },
  };
}

function announcement(id: string, title: string, description: string, sourceUrl: string): FeedItem {
  return {
    id,
    blockType: "announcements",
    title,
    description,
    sourceUrl,
    extractedAt: nowIso,
  };
}

function snapshot(
  id: string,
  projectId: string,
  capturedAt: string,
  sourceUrls: string[],
  data: ProjectSnapshot["data"],
): ProjectSnapshot {
  return {
    id,
    projectId,
    capturedAt,
    sourceUrls,
    data,
  };
}

function change(
  id: string,
  projectId: string,
  type: ChangeEvent["type"],
  title: string,
  entity: string,
  oldValue: ChangeEvent["oldValue"],
  newValue: ChangeEvent["newValue"],
  severity: ChangeEvent["severity"],
  sourceUrl: string,
  detectedAt: string,
  explanation: string,
): ChangeEvent {
  return {
    id,
    projectId,
    type,
    title,
    entity,
    oldValue,
    newValue,
    severity,
    sourceUrl,
    detectedAt,
    explanation,
  };
}

function insight(
  id: string,
  title: string,
  description: string,
  recommendation: string,
  severity: InsightCard["severity"],
  confidenceScore: number,
): InsightCard {
  return {
    id,
    title,
    description,
    recommendation,
    severity,
    confidenceScore,
  };
}

const blinkitUrls = [
  "https://blinkit.com/",
  "https://blinkit.com/cn/fresh-fruits-vegetables/cid/1487",
  "https://blinkit.com/cn/dairy-bread-eggs/cid/14",
  "https://blinkit.com/cn/atta-rice-oil-dals/cid/16",
  "https://blinkit.com/offers",
  "https://blinkit.com/announcements",
];

const zeptoUrls = [
  "https://www.zeptonow.com/",
  "https://www.zeptonow.com/cn/fruits-vegetables/cid/11",
  "https://www.zeptonow.com/cn/dairy-breakfast/cid/24",
  "https://www.zeptonow.com/cn/grocery-staples/cid/39",
  "https://www.zeptonow.com/offers",
  "https://www.zeptonow.com/blog",
];

const bigbasketUrls = [
  "https://www.bigbasket.com/",
  "https://www.bigbasket.com/pc/fruits-vegetables/",
  "https://www.bigbasket.com/pc/bakery-cakes-dairy/",
  "https://www.bigbasket.com/pc/foodgrains-oil-masala/",
  "https://www.bigbasket.com/offers/",
  "https://www.bigbasket.com/media/",
];

const blinkitPrevious = snapshot("snap-blinkit-prev", "blinkit", "2026-05-10T08:00:00.000Z", blinkitUrls, {
  products: [
    product("bl-p1", "blinkit", "Apple 1kg", "fruits", 120, 120, "in_stock", blinkitUrls[1]),
    product("bl-p2", "blinkit", "Toned Milk 1L", "dairy", 62, 62, "in_stock", blinkitUrls[2]),
    product("bl-p3", "blinkit", "Banana 1kg", "fruits", 55, 55, "in_stock", blinkitUrls[1]),
  ],
  offers: [
    offer("bl-o1", "Weekend Saver", "Save up to 15% on fruits", blinkitUrls[4]),
    offer("bl-o2", "Free Delivery", "Free delivery above Rs 199", blinkitUrls[4]),
  ],
  availability: [
    availability("bl-a1", "Fresh Bread 400g", "in_stock", blinkitUrls[2]),
    availability("bl-a2", "Sunflower Oil 1L", "in_stock", blinkitUrls[3]),
  ],
  announcements: [
    announcement("bl-an1", "10-minute delivery in Indiranagar", "Expanded quick delivery zones in Bengaluru.", blinkitUrls[5]),
  ],
});

const blinkitCurrent = snapshot("snap-blinkit-cur", "blinkit", nowIso, blinkitUrls, {
  products: [
    product("bl-p1", "blinkit", "Apple 1kg", "fruits", 99, 120, "in_stock", blinkitUrls[1]),
    product("bl-p2", "blinkit", "Toned Milk 1L", "dairy", 65, 62, "out_of_stock", blinkitUrls[2]),
    product("bl-p3", "blinkit", "Banana 1kg", "fruits", 52, 55, "in_stock", blinkitUrls[1]),
    product("bl-p4", "blinkit", "Basmati Rice 5kg", "staples", 529, 579, "in_stock", blinkitUrls[3]),
  ],
  offers: [
    offer("bl-o1", "Weekend Saver", "Save up to 25% on fruits", blinkitUrls[4]),
    offer("bl-o2", "Free Delivery", "Free delivery above Rs 149", blinkitUrls[4]),
    offer("bl-o3", "Midnight Grocery Rush", "Extra 10% off between 10pm-1am", blinkitUrls[4]),
  ],
  availability: [
    availability("bl-a1", "Fresh Bread 400g", "in_stock", blinkitUrls[2]),
    availability("bl-a2", "Sunflower Oil 1L", "limited_stock", blinkitUrls[3]),
  ],
  announcements: [
    announcement("bl-an1", "10-minute delivery in Indiranagar", "Expanded quick delivery zones in Bengaluru.", blinkitUrls[5]),
    announcement("bl-an2", "New delivery location: HSR Layout", "Blinkit now serves HSR Layout with express slots.", blinkitUrls[5]),
  ],
});

const zeptoPrevious = snapshot("snap-zepto-prev", "zepto", "2026-05-10T08:00:00.000Z", zeptoUrls, {
  products: [
    product("zp-p1", "zepto", "Apple 1kg", "fruits", 110, 110, "in_stock", zeptoUrls[1]),
    product("zp-p2", "zepto", "Whole Wheat Bread", "bakery", 45, 45, "in_stock", zeptoUrls[2]),
    product("zp-p3", "zepto", "Fortified Rice 5kg", "staples", 545, 545, "in_stock", zeptoUrls[3]),
  ],
  offers: [
    offer("zp-o1", "Mega Grocery Sale", "Flat 20% on essentials", zeptoUrls[4]),
    offer("zp-o2", "Free Delivery Blast", "No delivery fee this weekend", zeptoUrls[4]),
  ],
  availability: [
    availability("zp-a1", "Banana 1kg", "in_stock", zeptoUrls[1]),
    availability("zp-a2", "Cooking Oil 1L", "in_stock", zeptoUrls[3]),
  ],
  announcements: [
    announcement("zp-an1", "Delivery promise update", "10-minute delivery in select pin codes.", zeptoUrls[5]),
  ],
});

const zeptoCurrent = snapshot("snap-zepto-cur", "zepto", nowIso, zeptoUrls, {
  products: [
    product("zp-p1", "zepto", "Apple 1kg", "fruits", 99, 110, "in_stock", zeptoUrls[1]),
    product("zp-p2", "zepto", "Whole Wheat Bread", "bakery", 39, 45, "in_stock", zeptoUrls[2]),
    product("zp-p3", "zepto", "Fortified Rice 5kg", "staples", 529, 545, "in_stock", zeptoUrls[3]),
    product("zp-p4", "zepto", "Refined Sunflower Oil 1L", "staples", 149, 169, "in_stock", zeptoUrls[3]),
  ],
  offers: [
    offer("zp-o1", "Mega Grocery Sale", "Flat 30% on essentials", zeptoUrls[4]),
    offer("zp-o2", "Free Delivery Blast", "No delivery fee + Rs 40 cashback", zeptoUrls[4]),
    offer("zp-o3", "Banana Bonanza", "Buy 2 get 1 on fresh bananas", zeptoUrls[4]),
  ],
  availability: [
    availability("zp-a1", "Banana 1kg", "in_stock", zeptoUrls[1]),
    availability("zp-a2", "Cooking Oil 1L", "in_stock", zeptoUrls[3]),
    availability("zp-a3", "Toned Milk 1L", "out_of_stock", zeptoUrls[2]),
  ],
  announcements: [
    announcement("zp-an1", "Delivery promise update", "10-minute delivery now active in more Bengaluru zones.", zeptoUrls[5]),
    announcement("zp-an2", "Campaign: Savings Week", "Daily rotating flash offers announced.", zeptoUrls[5]),
  ],
});

const bigbasketPrevious = snapshot("snap-bb-prev", "bigbasket", "2026-05-10T08:00:00.000Z", bigbasketUrls, {
  products: [
    product("bb-p1", "bigbasket", "Apple 1kg", "fruits", 118, 118, "in_stock", bigbasketUrls[1]),
    product("bb-p2", "bigbasket", "Premium Banana 1kg", "fruits", 58, 58, "in_stock", bigbasketUrls[1]),
    product("bb-p3", "bigbasket", "Cold Pressed Oil 1L", "staples", 289, 289, "in_stock", bigbasketUrls[3]),
  ],
  offers: [
    offer("bb-o1", "Fresh Harvest Deals", "Up to 18% on vegetables", bigbasketUrls[4]),
    offer("bb-o2", "Combo Staples", "Save Rs 100 on monthly basket", bigbasketUrls[4]),
  ],
  availability: [
    availability("bb-a1", "Whole Wheat Bread", "in_stock", bigbasketUrls[2]),
    availability("bb-a2", "Basmati Rice 5kg", "in_stock", bigbasketUrls[3]),
  ],
  announcements: [
    announcement("bb-an1", "New next-day slots", "Added early morning slots in Hyderabad.", bigbasketUrls[5]),
  ],
});

const bigbasketCurrent = snapshot("snap-bb-cur", "bigbasket", nowIso, bigbasketUrls, {
  products: [
    product("bb-p1", "bigbasket", "Apple 1kg", "fruits", 112, 118, "in_stock", bigbasketUrls[1]),
    product("bb-p2", "bigbasket", "Premium Banana 1kg", "fruits", 54, 58, "in_stock", bigbasketUrls[1]),
    product("bb-p3", "bigbasket", "Cold Pressed Oil 1L", "staples", 279, 289, "limited_stock", bigbasketUrls[3]),
    product("bb-p4", "bigbasket", "Toned Milk 1L", "dairy", 64, 64, "in_stock", bigbasketUrls[2]),
  ],
  offers: [
    offer("bb-o1", "Fresh Harvest Deals", "Up to 22% on vegetables", bigbasketUrls[4]),
    offer("bb-o2", "Combo Staples", "Save Rs 150 on monthly basket", bigbasketUrls[4]),
    offer("bb-o3", "Free Delivery Fridays", "Free delivery for all orders above Rs 299", bigbasketUrls[4]),
  ],
  availability: [
    availability("bb-a1", "Whole Wheat Bread", "in_stock", bigbasketUrls[2]),
    availability("bb-a2", "Basmati Rice 5kg", "in_stock", bigbasketUrls[3]),
    availability("bb-a3", "Organic Spinach 250g", "out_of_stock", bigbasketUrls[1]),
  ],
  announcements: [
    announcement("bb-an1", "New next-day slots", "Added early morning slots in Hyderabad.", bigbasketUrls[5]),
    announcement("bb-an2", "Campaign: Smart Basket", "Personalized value packs now highlighted on homepage.", bigbasketUrls[5]),
  ],
});

const blinkitChanges: ChangeEvent[] = [
  change("bl-c1", "blinkit", "price_changed", "Apple 1kg price changed from Rs 120 to Rs 99", "Apple 1kg", 120, 99, "high", blinkitUrls[1], "2026-05-10T11:52:00.000Z", "Aggressive fruit discount indicates short-window traffic capture."),
  change("bl-c2", "blinkit", "offer_added", "Midnight Grocery Rush offer detected", "Midnight Grocery Rush", null, "10% off 10pm-1am", "medium", blinkitUrls[4], "2026-05-10T11:49:00.000Z", "New off-peak campaign suggests demand shaping after prime hours."),
  change("bl-c3", "blinkit", "availability_changed", "Toned Milk 1L changed to out_of_stock", "Toned Milk 1L", "in_stock", "out_of_stock", "high", blinkitUrls[2], "2026-05-10T11:40:00.000Z", "Stockout on key dairy SKU can influence churn toward competitors."),
  change("bl-c4", "blinkit", "announcement_added", "New delivery location announcement detected", "HSR Layout rollout", null, true, "medium", blinkitUrls[5], "2026-05-10T11:32:00.000Z", "Coverage expansion can increase market share in high-frequency neighborhoods."),
];

const zeptoChanges: ChangeEvent[] = [
  change("zp-c1", "zepto", "price_changed", "Whole Wheat Bread dropped from Rs 45 to Rs 39", "Whole Wheat Bread", 45, 39, "medium", zeptoUrls[2], "2026-05-10T11:55:00.000Z", "Frequent staple discounts indicate pricing pressure strategy."),
  change("zp-c2", "zepto", "offer_added", "Banana Bonanza offer added", "Banana Bonanza", null, "Buy 2 get 1", "medium", zeptoUrls[4], "2026-05-10T11:51:00.000Z", "Fresh produce bundle indicates basket-size optimization."),
  change("zp-c3", "zepto", "availability_changed", "Toned Milk 1L marked out_of_stock", "Toned Milk 1L", "in_stock", "out_of_stock", "high", zeptoUrls[2], "2026-05-10T11:43:00.000Z", "Dairy stock volatility may impact conversion during morning slots."),
  change("zp-c4", "zepto", "announcement_added", "Savings Week campaign launched", "Savings Week", null, true, "medium", zeptoUrls[5], "2026-05-10T11:35:00.000Z", "Daily campaign cadence can accelerate competitor response cycles."),
];

const bigbasketChanges: ChangeEvent[] = [
  change("bb-c1", "bigbasket", "price_changed", "Cold Pressed Oil reduced from Rs 289 to Rs 279", "Cold Pressed Oil 1L", 289, 279, "low", bigbasketUrls[3], "2026-05-10T11:47:00.000Z", "Moderate discount focused on premium staples."),
  change("bb-c2", "bigbasket", "offer_added", "Free Delivery Fridays campaign detected", "Free Delivery Fridays", null, "Orders above Rs 299", "medium", bigbasketUrls[4], "2026-05-10T11:41:00.000Z", "Delivery incentive targets bigger basket checkouts."),
  change("bb-c3", "bigbasket", "availability_changed", "Organic Spinach moved to out_of_stock", "Organic Spinach 250g", "in_stock", "out_of_stock", "medium", bigbasketUrls[1], "2026-05-10T11:36:00.000Z", "Fresh produce stockout may impact premium segment reliability."),
  change("bb-c4", "bigbasket", "announcement_added", "Smart Basket campaign launched", "Smart Basket", null, true, "low", bigbasketUrls[5], "2026-05-10T11:30:00.000Z", "Personalized bundle campaigns can raise retention and repeat orders."),
];

const blinkitInsights: InsightCard[] = [
  insight("bl-i1", "Delivery Positioning Advantage", "Blinkit retains strong instant-delivery brand narrative with new zone expansion.", "Track delivery promise copy every 6 hours for positioning shifts.", "medium", 94),
  insight("bl-i2", "High-Impact Fruit Discounting", "Apple pricing dropped sharply, likely to attract high-intent grocery shoppers.", "Mirror fruit basket pricing checks during evening windows.", "high", 92),
];

const zeptoInsights: InsightCard[] = [
  insight("zp-i1", "Offer Intensity Spike", "Zepto is pushing discount-heavy messaging across offers and staples.", "Prioritize monitoring offer and prices blocks at tighter intervals.", "high", 95),
  insight("zp-i2", "Campaign Cadence Acceleration", "Savings Week messaging signals rapid promotional iteration.", "Set alert thresholds for recurring new-campaign announcements.", "medium", 90),
];

const bigbasketInsights: InsightCard[] = [
  insight("bb-i1", "Catalog Depth Stability", "BigBasket maintains wider assortment with measured discounting.", "Benchmark assortment expansion against price aggressiveness weekly.", "low", 88),
  insight("bb-i2", "Conversion via Delivery Incentives", "Free delivery campaign appears tuned for larger basket growth.", "Track order-value-linked offers for campaign pattern detection.", "medium", 87),
];

// Demo-first data model keeps hackathon UX stable offline. Real extraction with Anakin is planned for Phase 4.
export const demoProjects: CompetitorProject[] = [
  {
    id: "blinkit",
    name: "Blinkit",
    companyUrl: "https://blinkit.com",
    useCase: "competitor intelligence",
    country: "India",
    status: "active",
    selectedBlocks: ["products", "offers", "availability"],
    discoveredUrls: blinkitUrls,
    endpoint: "/api/v1/projects/blinkit/feed",
    schemaEndpoint: "/api/v1/projects/blinkit/schema",
    changesEndpoint: "/api/v1/projects/blinkit/changes",
    previousSnapshot: blinkitPrevious,
    currentSnapshot: blinkitCurrent,
    changes: blinkitChanges,
    insights: blinkitInsights,
    lastUpdated: nowIso,
    createdAt: "2026-05-01T07:30:00.000Z",
  },
  {
    id: "zepto",
    name: "Zepto",
    companyUrl: "https://www.zeptonow.com",
    useCase: "competitor intelligence",
    country: "India",
    status: "active",
    selectedBlocks: ["products", "offers", "availability"],
    discoveredUrls: zeptoUrls,
    endpoint: "/api/v1/projects/zepto/feed",
    schemaEndpoint: "/api/v1/projects/zepto/schema",
    changesEndpoint: "/api/v1/projects/zepto/changes",
    previousSnapshot: zeptoPrevious,
    currentSnapshot: zeptoCurrent,
    changes: zeptoChanges,
    insights: zeptoInsights,
    lastUpdated: nowIso,
    createdAt: "2026-05-02T09:15:00.000Z",
  },
  {
    id: "bigbasket",
    name: "BigBasket",
    companyUrl: "https://www.bigbasket.com",
    useCase: "competitor intelligence",
    country: "India",
    status: "active",
    selectedBlocks: ["products", "offers", "availability"],
    discoveredUrls: bigbasketUrls,
    endpoint: "/api/v1/projects/bigbasket/feed",
    schemaEndpoint: "/api/v1/projects/bigbasket/schema",
    changesEndpoint: "/api/v1/projects/bigbasket/changes",
    previousSnapshot: bigbasketPrevious,
    currentSnapshot: bigbasketCurrent,
    changes: bigbasketChanges,
    insights: bigbasketInsights,
    lastUpdated: nowIso,
    createdAt: "2026-05-03T10:45:00.000Z",
  },
];
