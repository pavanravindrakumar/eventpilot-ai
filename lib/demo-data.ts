/**
 * Sample / demo event data for EventPilot AI.
 * Used when no API key is configured (demo mode).
 * All AI-generated content is clearly labeled as demo data.
 */
import {
  EventPlanState,
  BudgetCategory,
  PlanningTask,
  Vendor,
  AIIdea,
  Budget,
} from "./schemas";
import { nanoid } from "./utils";

const DEMO_EVENT_ID = "demo-wedding-2025";
const DEMO_DATE = (() => {
  // Set demo event ~6 months from now
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split("T")[0];
})();

const demoBudgetCategories: BudgetCategory[] = [
  { id: nanoid(), name: "Venue & Catering", percentage: 40, plannedAmount: 20000, actualSpent: 5000, notes: "Includes hall rental and full-service catering" },
  { id: nanoid(), name: "Photography & Video", percentage: 12, plannedAmount: 6000, actualSpent: 3000, notes: "Photographer booked" },
  { id: nanoid(), name: "Florals & Décor", percentage: 10, plannedAmount: 5000, actualSpent: 0, notes: "" },
  { id: nanoid(), name: "Music & Entertainment", percentage: 8, plannedAmount: 4000, actualSpent: 0, notes: "" },
  { id: nanoid(), name: "Attire & Beauty", percentage: 10, plannedAmount: 5000, actualSpent: 2000, notes: "" },
  { id: nanoid(), name: "Invitations & Stationery", percentage: 3, plannedAmount: 1500, actualSpent: 1500, notes: "Completed" },
  { id: nanoid(), name: "Transportation", percentage: 5, plannedAmount: 2500, actualSpent: 0, notes: "" },
  { id: nanoid(), name: "Honeymoon Fund", percentage: 7, plannedAmount: 3500, actualSpent: 0, notes: "" },
  { id: nanoid(), name: "Miscellaneous", percentage: 5, plannedAmount: 2500, actualSpent: 500, notes: "Gifts, tips, unexpected" },
];

const demoBudget: Budget = {
  eventId: DEMO_EVENT_ID,
  totalBudget: 50000,
  contingencyPercent: 10,
  categories: demoBudgetCategories,
  currency: "USD",
};

const demoTasks: PlanningTask[] = [
  {
    id: nanoid(), eventId: DEMO_EVENT_ID,
    title: "Book the venue", description: "Visit at least 3 venues and compare packages.",
    deadline: offsetDate(DEMO_DATE, -180), priority: "high", completed: true, category: "Venue",
  },
  {
    id: nanoid(), eventId: DEMO_EVENT_ID,
    title: "Hire wedding photographer",
    description: "Review portfolios and sign contract with chosen photographer.",
    deadline: offsetDate(DEMO_DATE, -150), priority: "high", completed: true, category: "Photography",
  },
  {
    id: nanoid(), eventId: DEMO_EVENT_ID,
    title: "Send save-the-dates",
    description: "Mail or email save-the-dates to all guests.",
    deadline: offsetDate(DEMO_DATE, -120), priority: "medium", completed: true, category: "Guest Management",
  },
  {
    id: nanoid(), eventId: DEMO_EVENT_ID,
    title: "Book caterer and confirm menu",
    description: "Schedule menu tasting and finalize the catering contract.",
    deadline: offsetDate(DEMO_DATE, -90), priority: "high", completed: false, category: "Catering",
  },
  {
    id: nanoid(), eventId: DEMO_EVENT_ID,
    title: "Order wedding cake",
    description: "Visit bakeries, taste options, and place cake order.",
    deadline: offsetDate(DEMO_DATE, -75), priority: "medium", completed: false, category: "Catering",
  },
  {
    id: nanoid(), eventId: DEMO_EVENT_ID,
    title: "Send formal invitations",
    description: "Mail all formal invitations with RSVP deadline 4 weeks out.",
    deadline: offsetDate(DEMO_DATE, -60), priority: "high", completed: false, category: "Guest Management",
  },
  {
    id: nanoid(), eventId: DEMO_EVENT_ID,
    title: "Confirm florist order",
    description: "Finalize floral arrangements with vendor.",
    deadline: offsetDate(DEMO_DATE, -45), priority: "medium", completed: false, category: "Décor",
  },
  {
    id: nanoid(), eventId: DEMO_EVENT_ID,
    title: "Final RSVP count",
    description: "Collect all RSVPs and provide final headcount to venue.",
    deadline: offsetDate(DEMO_DATE, -30), priority: "high", completed: false, category: "Guest Management",
  },
  {
    id: nanoid(), eventId: DEMO_EVENT_ID,
    title: "Rehearsal dinner",
    description: "Rehearse ceremony with wedding party.",
    deadline: offsetDate(DEMO_DATE, -1), priority: "high", completed: false, category: "Ceremony",
  },
];

const demoVendors: Vendor[] = [
  {
    id: nanoid(), eventId: DEMO_EVENT_ID,
    name: "Sunrise Gardens Venue", category: "Venue",
    estimatedCost: 12000,
    contactNotes: "Contact: events@sunrisegardens.com | Package: Garden Ceremony + Ballroom Reception",
    bookingStatus: "booked",
    checklistItems: ["Venue walkthrough completed", "Contract signed", "Deposit paid"],
    isVerified: false,
  },
  {
    id: nanoid(), eventId: DEMO_EVENT_ID,
    name: "Lens & Light Photography Studio", category: "Photography",
    estimatedCost: 4500,
    contactNotes: "Photographer available for 8 hours. Includes engagement shoot.",
    bookingStatus: "booked",
    checklistItems: ["Portfolio reviewed", "Contract signed"],
    isVerified: false,
  },
  {
    id: nanoid(), eventId: DEMO_EVENT_ID,
    name: "Bloom & Petal Florals", category: "Florals",
    estimatedCost: 3500,
    contactNotes: "Quote received for bouquets, centerpieces, and arch arrangements.",
    bookingStatus: "quote_received",
    checklistItems: ["Initial consultation done"],
    isVerified: false,
  },
  {
    id: nanoid(), eventId: DEMO_EVENT_ID,
    name: "Harvest Moon Catering Co.", category: "Catering",
    estimatedCost: 8000,
    contactNotes: "Menu tasting scheduled. Buffet-style for 150 guests.",
    bookingStatus: "contacted",
    checklistItems: [],
    isVerified: false,
  },
];

const demoIdeas: AIIdea = {
  themes: [
    "Rustic Garden Romance — natural wood, soft linens, wildflower arrangements",
    "Timeless Elegance — white and gold palette, candlelit atmosphere",
    "Modern Botanical — lush greenery, geometric accents, minimalist chic",
  ],
  decorations: [
    "Suspended floral chandeliers over reception tables",
    "Lantern-lined ceremony aisle with rose petals",
    "Personalized wooden table numbers with wildflowers",
    "Photo wall with vintage frames and string lights",
  ],
  catering: [
    "Farm-to-table seasonal menu with locally sourced produce",
    "Interactive food stations: carving station, pasta bar, dessert tower",
    "Signature cocktail named after the couple",
    "Midnight snack cart with late-night bites",
  ],
  activities: [
    "Photo booth with custom props and instant printing",
    "Live jazz quartet during cocktail hour",
    "Guest book alternative: polaroid memory wall",
    "First dance choreography surprise performance",
  ],
  recommendations: [
    "Book vendors at least 6 months in advance for peak season dates",
    "Consider a day-of coordinator to manage logistics",
    "Create a detailed timeline for vendors to follow on the day",
    "Plan for weather contingencies if any outdoor elements are included",
    "Designate a trusted person to handle tips and final vendor payments",
  ],
};

export function getDemoEventPlanState(): EventPlanState {
  return {
    event: {
      id: DEMO_EVENT_ID,
      name: "Sarah & James — Garden Wedding",
      type: "wedding",
      date: DEMO_DATE,
      location: "Sunrise Gardens Estate, Napa Valley, CA",
      guestCount: 150,
      budget: 50000,
      currency: "USD",
      themePreference: "Rustic Garden Romance with elegant touches",
      requirements: "Outdoor ceremony, indoor reception. Vegetarian and vegan options needed. Pet-friendly venue required.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    budget: demoBudget,
    tasks: demoTasks,
    vendors: demoVendors,
    ideas: demoIdeas,
    lastGeneratedAt: new Date().toISOString(),
    isDemo: true,
  };
}

export function getLiveGeneratedPlanState(): EventPlanState {
  const eventId = "live-three-model-wedding-01";
  const weddingDate = "2027-05-15";
  const totalBudget = 200000;
  const contingencyPercent = 10;
  const allocatable = totalBudget - (totalBudget * contingencyPercent) / 100; // 180,000

  return {
    event: {
      id: eventId,
      name: "Elegant Garden Wedding",
      type: "wedding",
      date: weddingDate,
      location: "Bhimavaram, Andhra Pradesh, India",
      guestCount: 200,
      budget: totalBudget,
      currency: "INR",
      themePreference: "Traditional with modern elegance",
      requirements:
        "Traditional South Indian coastal Andhra wedding with modern elegant decor and local catering",
      createdAt: "2026-11-01T15:45:00.000Z",
      updatedAt: "2026-11-01T15:48:59.389Z",
    },
    budget: {
      eventId,
      totalBudget,
      contingencyPercent,
      categories: [
        {
          id: nanoid(),
          name: "Catering & Food",
          percentage: 35,
          plannedAmount: allocatable * 0.35,
          actualSpent: 0,
          notes: "Authentic coastal Andhra feast for 200 guests.",
        },
        {
          id: nanoid(),
          name: "Venue & Mandap Setup",
          percentage: 20,
          plannedAmount: allocatable * 0.2,
          actualSpent: 0,
          notes: "Traditional garden venue rental with floral mandap structures.",
        },
        {
          id: nanoid(),
          name: "Decor & Lighting",
          percentage: 15,
          plannedAmount: allocatable * 0.15,
          actualSpent: 0,
          notes: "Marigold flowers, banana trunk pillars, and fairy lights.",
        },
        {
          id: nanoid(),
          name: "Attire & Styling",
          percentage: 10,
          plannedAmount: allocatable * 0.1,
          actualSpent: 0,
          notes: "Traditional silk sarees and dhoti/kurta sets.",
        },
        {
          id: nanoid(),
          name: "Photography & Videography",
          percentage: 10,
          plannedAmount: allocatable * 0.1,
          actualSpent: 0,
          notes: "Capturing traditional rituals and candid moments.",
        },
      ],
      currency: "INR",
    },
    tasks: [
      {
        id: nanoid(),
        eventId,
        title: "Book Venue and Date",
        description: "Secure the garden venue in Bhimavaram for the wedding date.",
        deadline: "2026-11-06",
        priority: "high",
        completed: false,
        category: "Venue",
      },
      {
        id: nanoid(),
        eventId,
        title: "Finalize Caterer for Coastal Andhra Menu",
        description:
          "Taste test and book local caterers specializing in Pulusu, Biryani, and traditional sweets like Pootharekulu.",
        deadline: "2026-12-16",
        priority: "high",
        completed: false,
        category: "Catering",
      },
      {
        id: nanoid(),
        eventId,
        title: "Purchase Wedding Attire",
        description: "Shop for traditional silk sarees and groom's attire.",
        deadline: "2027-01-15",
        priority: "high",
        completed: false,
        category: "Attire",
      },
      {
        id: nanoid(),
        eventId,
        title: "Book Photographer and Videographer",
        description: "Hire media team familiar with South Indian wedding rituals.",
        deadline: "2027-02-04",
        priority: "medium",
        completed: false,
        category: "Media",
      },
      {
        id: nanoid(),
        eventId,
        title: "Design and Send Invitations",
        description: "Print traditional paper invitations and create digital versions for guests.",
        deadline: "2027-03-01",
        priority: "medium",
        completed: false,
        category: "Stationery",
      },
      {
        id: nanoid(),
        eventId,
        title: "Finalize Decor and Mandap Design",
        description: "Confirm floral arrangements, banana trunk pillars, and lighting with the decorator.",
        deadline: "2027-03-31",
        priority: "medium",
        completed: false,
        category: "Decor",
      },
      {
        id: nanoid(),
        eventId,
        title: "Final Guest Count Confirmation",
        description: "Confirm exact headcount with the caterer for 200 guests.",
        deadline: "2027-04-30",
        priority: "high",
        completed: false,
        category: "Catering",
      },
      {
        id: nanoid(),
        eventId,
        title: "Rehearsal and Ritual Walkthrough",
        description: "Coordinate with the Purohit (priest) regarding the auspicious timings (muhurtam).",
        deadline: "2027-05-12",
        priority: "high",
        completed: false,
        category: "Ceremony",
      },
      {
        id: nanoid(),
        eventId,
        title: "Wedding Day Execution",
        description: "Manage venue setup, guest arrival, catering, and ceremonial sequences.",
        deadline: "2027-05-15",
        priority: "high",
        completed: false,
        category: "Execution",
      },
    ],
    vendors: [
      {
        id: nanoid(),
        eventId,
        name: "[Add Venue Management Vendor]",
        category: "Venue Management",
        estimatedCost: 0,
        contactNotes: "",
        bookingStatus: "not_contacted",
        checklistItems: [],
        isVerified: false,
      },
      {
        id: nanoid(),
        eventId,
        name: "[Add Catering Services Vendor]",
        category: "Catering Services",
        estimatedCost: 0,
        contactNotes: "",
        bookingStatus: "not_contacted",
        checklistItems: [],
        isVerified: false,
      },
      {
        id: nanoid(),
        eventId,
        name: "[Add Decor & Florist Vendor]",
        category: "Decor & Florist",
        estimatedCost: 0,
        contactNotes: "",
        bookingStatus: "not_contacted",
        checklistItems: [],
        isVerified: false,
      },
      {
        id: nanoid(),
        eventId,
        name: "[Add Photography & Videography Vendor]",
        category: "Photography & Videography",
        estimatedCost: 0,
        contactNotes: "",
        bookingStatus: "not_contacted",
        checklistItems: [],
        isVerified: false,
      },
      {
        id: nanoid(),
        eventId,
        name: "[Add Priest (Purohit) Services Vendor]",
        category: "Priest (Purohit) Services",
        estimatedCost: 0,
        contactNotes: "",
        bookingStatus: "not_contacted",
        checklistItems: [],
        isVerified: false,
      },
      {
        id: nanoid(),
        eventId,
        name: "[Add Sound & Lighting Vendor]",
        category: "Sound & Lighting",
        estimatedCost: 0,
        contactNotes: "",
        bookingStatus: "not_contacted",
        checklistItems: [],
        isVerified: false,
      },
      {
        id: nanoid(),
        eventId,
        name: "[Add Traditional Musicians (Melam) Vendor]",
        category: "Traditional Musicians (Melam)",
        estimatedCost: 0,
        contactNotes: "",
        bookingStatus: "not_contacted",
        checklistItems: [],
        isVerified: false,
      },
    ],
    ideas: {
      themes: [
        "Traditional Royal Andhra with Pastel Modern Accents",
        "Botanical Garden Elegance with Marigold and Jasmine",
        "Coastal Heritage Fusion",
      ],
      decorations: [
        "Traditional mandap decorated with fresh marigolds, tuberoses, and banana tree trunks",
        "Fairy lights and brass hanging urlis with floating candles for evening reception",
        "Handloom fabric table runners and cane seating elements for a rustic modern touch",
      ],
      catering: [
        "Traditional Banana Leaf feast featuring Godavari-style spicy fish curry and Royyala Iguru (prawn masala)",
        "Vegetarian staples including Pulihora, Gutti Vankaya Kura, and Appadalu",
        "Desserts featuring Atreyapuram Pootharekulu and Bobbattu",
      ],
      activities: [
        "Traditional Nadaswaram and Melam background music during rituals",
        "Flower showering (Talambralu ceremony) with traditional enthusiasm",
        "Interactive return-gift counter featuring local handicrafts",
      ],
      recommendations: [
        "Plan rituals strictly according to the auspicious muhurtam provided by the priest.",
        "Keep umbrellas and cooling stations ready given Bhimavaram's warm climate.",
        "Ensure a dedicated logistics helper is assigned for guest seating and hospitality.",
      ],
    },
    lastGeneratedAt: "2026-11-01T15:48:59.389Z",
    isDemo: false,
    generatedBy: "gemini-3.5-flash-lite",
  };
}

export function getSyntheticWeddingPlanState(): EventPlanState {
  const eventId = "synthetic-bhimavaram-wedding";
  const weddingDate = offsetDate(new Date().toISOString().split("T")[0], 90);
  const totalBudget = 200000;
  const contingencyPercent = 10;
  const allocatable = totalBudget - (totalBudget * contingencyPercent) / 100; // 180,000

  const categories: BudgetCategory[] = [
    { id: nanoid(), name: "Venue & Mandap Setup", percentage: 35, plannedAmount: allocatable * 0.35, actualSpent: 25000, notes: "Lawn and open-air mandap" },
    { id: nanoid(), name: "Traditional Catering & Sweets", percentage: 35, plannedAmount: allocatable * 0.35, actualSpent: 15000, notes: "South Indian plantain leaf feast for 200 guests" },
    { id: nanoid(), name: "Photography & Videography", percentage: 12, plannedAmount: allocatable * 0.12, actualSpent: 10000, notes: "Candid and traditional photo coverage" },
    { id: nanoid(), name: "Traditional Music & Nadaswaram", percentage: 8, plannedAmount: allocatable * 0.08, actualSpent: 0, notes: "Live musicians during ceremony" },
    { id: nanoid(), name: "Attire & Jewellery Reserve", percentage: 10, plannedAmount: allocatable * 0.10, actualSpent: 12000, notes: "Pattu sarees and groom traditional wear" },
  ];

  const tasks: PlanningTask[] = [
    { id: nanoid(), eventId, title: "Book open-air lawn / Kalyana Mandapam in Bhimavaram", description: "Confirm site availability and booking advance.", deadline: offsetDate(weddingDate, -60), priority: "high", completed: true, category: "Venue" },
    { id: nanoid(), eventId, title: "Finalize traditional Andhra catering menu", description: "Select sweets, curries, and banquet timings for 200 guests.", deadline: offsetDate(weddingDate, -45), priority: "high", completed: true, category: "Catering" },
    { id: nanoid(), eventId, title: "Order floral mandap décor & fresh jasmine garlands", description: "Coordinate with local florist for fresh floral arch and entryway.", deadline: offsetDate(weddingDate, -30), priority: "high", completed: false, category: "Décor" },
    { id: nanoid(), eventId, title: "Book local photographer and drone videographer", description: "Review portfolios and confirm ceremony timestamps.", deadline: offsetDate(weddingDate, -25), priority: "medium", completed: false, category: "Photography" },
    { id: nanoid(), eventId, title: "Send formal wedding invitations to 200 guests", description: "Deliver print and digital wedding invitations.", deadline: offsetDate(weddingDate, -20), priority: "high", completed: false, category: "Guests" },
    { id: nanoid(), eventId, title: "Arrange Nadaswaram ensemble & sound system", description: "Confirm auspicious timing rituals and musical cues.", deadline: offsetDate(weddingDate, -14), priority: "medium", completed: false, category: "Music" },
    { id: nanoid(), eventId, title: "Final head count confirmation with caterer", description: "Verify 200 plates headcount and buffer.", deadline: offsetDate(weddingDate, -7), priority: "high", completed: false, category: "Catering" },
  ];

  const vendors: Vendor[] = [
    { id: nanoid(), eventId, name: "Sri Lakshmi Garden & Mandapam", category: "Venue", estimatedCost: 60000, contactNotes: "Bhimavaram bypass road. Contact: 08816-XXXXXX", bookingStatus: "booked", checklistItems: ["Advance paid", "Walkthrough completed"], isVerified: false },
    { id: nanoid(), eventId, name: "Annapurna Grand Traditional Caterers", category: "Catering", estimatedCost: 65000, contactNotes: "Specialist in traditional vegetarian feasts. 200 plates confirmed.", bookingStatus: "booked", checklistItems: ["Tasting done"], isVerified: false },
    { id: nanoid(), eventId, name: "Godavari Moments Photography", category: "Photography", estimatedCost: 22000, contactNotes: "Full day candid & traditional coverage with drone.", bookingStatus: "quote_received", checklistItems: [], isVerified: false },
    { id: nanoid(), eventId, name: "Srinivasa Floral & Nadaswaram Decor", category: "Florals", estimatedCost: 15000, contactNotes: "Fresh marigold, jasmine and rose decorations.", bookingStatus: "contacted", checklistItems: [], isVerified: false },
  ];

  const ideas: AIIdea = {
    themes: [
      "Royal South Indian Garden — Marigold, Mogra & Brass Urli Accents",
      "Contemporary Telugu Serenity — Pastel linens with traditional lotus motifs",
      "Emerald & Temple Gold — Rich velvet and floral canopy styling",
    ],
    decorations: [
      "Traditional brass Urlis filled with floating water, lotus and tea candles at entryway",
      "Open canopy Mandap adorned with cascading marigold and tender coconut leaves",
      "Photo booth designed like a vintage Andhra courtyard with traditional wooden swing",
      "Pathway illuminated with traditional clay diyas and warm fairy lighting",
    ],
    catering: [
      "Authentic Andhra banana-leaf banquet featuring Pootharekulu and Bobbatlu",
      "Live Panasapottu biryani and Gongura specialties station",
      "Filter coffee & tender coconut water welcome bar",
      "Kulfi and Badam milk evening refresh station",
    ],
    activities: [
      "Talambralu ceremony interactive family games",
      "Live Nadaswaram and Carnatic instrumental fusion during dinner",
      "Instant polaroid photo wall with handwritten guest blessings in Telugu & English",
    ],
    recommendations: [
      "Ensure proper shade or cooling fans for open-air afternoon rituals in coastal Andhra weather",
      "Confirm power generator backup with venue for lighting and sound systems",
      "Designate a trusted family coordinator for sweet deliveries and pooja inventory",
    ],
  };

  return {
    event: {
      id: eventId,
      name: "Elegant Garden Wedding",
      type: "wedding",
      date: weddingDate,
      location: "Bhimavaram, Andhra Pradesh",
      guestCount: 200,
      budget: totalBudget,
      currency: "INR",
      themePreference: "Traditional South Indian Garden Elegance",
      requirements: "Outdoor lawn, South Indian traditional catering, auspicious timing",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    budget: {
      eventId,
      totalBudget,
      contingencyPercent,
      categories,
      currency: "INR",
    },
    tasks,
    vendors,
    ideas,
    lastGeneratedAt: new Date().toISOString(),
    isDemo: true,
  };
}

function offsetDate(baseDate: string, days: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

