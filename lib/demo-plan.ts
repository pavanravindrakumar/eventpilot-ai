/**
 * Demo plan fallback — returned when GEMINI_API_KEY is not set.
 * Clearly labeled as demo data. Never presented as AI-generated.
 * Date-aware: schedules task milestones realistically within the event timeline.
 */
import { AIGeneratedPlan, EventSetup, TaskPriority } from "./schemas";

export function getDemoPlan(event: EventSetup): AIGeneratedPlan {
  const isWedding = event.type === "wedding";
  const isBirthday = event.type === "birthday";
  const isCommunity = event.type === "community";
  const isCustom = event.type === "custom";

  // Compute days until event for date-aware task scheduling
  const now = new Date();
  const eventDate = new Date(event.date);
  const diffDays = Math.max(1, Math.round((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const rawTasks: Array<{
    title: string;
    description: string;
    defaultDays: number;
    priority: TaskPriority;
    category: string;
  }> = isWedding
    ? [
        { title: "Choose and book venue", description: "Visit venues, compare packages, and sign contract.", defaultDays: 365, priority: "high", category: "Venue" },
        { title: "Set budget and allocations", description: "Finalize budget breakdown across all categories.", defaultDays: 340, priority: "high", category: "Planning" },
        { title: "Hire wedding photographer", description: "Review portfolios and book photographer.", defaultDays: 300, priority: "high", category: "Photography" },
        { title: "Book officiant or celebrant", description: "Find and confirm ceremony officiant.", defaultDays: 270, priority: "high", category: "Ceremony" },
        { title: "Send save-the-dates", description: "Mail or email save-the-dates to guest list.", defaultDays: 240, priority: "medium", category: "Guest Management" },
        { title: "Book caterer", description: "Schedule tasting and finalize catering contract.", defaultDays: 210, priority: "high", category: "Catering" },
        { title: "Order wedding attire", description: "Purchase or order wedding dress, suits, and accessories.", defaultDays: 180, priority: "high", category: "Attire" },
        { title: "Book florist & décor", description: "Consult florist and finalize arrangements.", defaultDays: 150, priority: "medium", category: "Décor" },
        { title: "Book music / entertainment", description: "Hire band, DJ, or entertainment for reception.", defaultDays: 120, priority: "medium", category: "Entertainment" },
        { title: "Send formal invitations", description: "Mail all formal invitations with RSVP deadline.", defaultDays: 90, priority: "high", category: "Guest Management" },
        { title: "Order wedding cake", description: "Taste and order wedding cake.", defaultDays: 75, priority: "medium", category: "Catering" },
        { title: "Collect final RSVPs", description: "Follow up with outstanding RSVPs.", defaultDays: 45, priority: "high", category: "Guest Management" },
        { title: "Final venue walkthrough", description: "Walk through venue with coordinator and vendors.", defaultDays: 30, priority: "high", category: "Venue" },
        { title: "Confirm all vendor details", description: "Call all vendors to confirm times, locations, and needs.", defaultDays: 14, priority: "high", category: "Vendors" },
        { title: "Prepare vendor payments", description: "Prepare final payments and tip envelopes.", defaultDays: 7, priority: "high", category: "Finance" },
        { title: "Wedding rehearsal", description: "Conduct rehearsal with wedding party at venue.", defaultDays: 1, priority: "high", category: "Ceremony" },
      ]
    : isBirthday
    ? [
        { title: "Set date and choose theme", description: "Confirm event date and decide on party theme.", defaultDays: 60, priority: "high", category: "Planning" },
        { title: "Book venue", description: "Reserve the party venue.", defaultDays: 45, priority: "high", category: "Venue" },
        { title: "Create guest list and send invitations", description: "Finalize guest list and send invitations.", defaultDays: 30, priority: "high", category: "Guests" },
        { title: "Book caterer or plan menu", description: "Plan food and drinks.", defaultDays: 21, priority: "medium", category: "Catering" },
        { title: "Order birthday cake", description: "Order or plan custom birthday cake.", defaultDays: 14, priority: "medium", category: "Catering" },
        { title: "Purchase decorations", description: "Buy themed decorations and party supplies.", defaultDays: 10, priority: "medium", category: "Décor" },
        { title: "Confirm all bookings", description: "Confirm venue, caterer, and entertainment.", defaultDays: 7, priority: "high", category: "Vendors" },
        { title: "Set up venue", description: "Decorate and set up the party space.", defaultDays: 1, priority: "high", category: "Setup" },
      ]
    : isCommunity
    ? [
        { title: "Define event goals and agenda", description: "Clarify purpose, expected outcomes, and agenda.", defaultDays: 90, priority: "high", category: "Planning" },
        { title: "Secure venue & permits", description: "Book and confirm the event space and permits.", defaultDays: 75, priority: "high", category: "Venue" },
        { title: "Launch marketing campaign", description: "Create social media posts, flyers, and announcements.", defaultDays: 60, priority: "medium", category: "Marketing" },
        { title: "Confirm speakers and performers", description: "Book and brief all speakers and performers.", defaultDays: 45, priority: "high", category: "Programming" },
        { title: "Set up ticket/registration system", description: "Create online registration or ticketing.", defaultDays: 30, priority: "medium", category: "Guest Management" },
        { title: "Coordinate logistics & safety", description: "Plan transportation, accessibility, and parking.", defaultDays: 21, priority: "medium", category: "Logistics" },
        { title: "Confirm all vendors and volunteers", description: "Brief all staff and confirm schedules.", defaultDays: 7, priority: "high", category: "Vendors" },
        { title: "Day-of setup", description: "Arrive early to set up space and test all equipment.", defaultDays: 0, priority: "high", category: "Setup" },
      ]
    : [
        { title: "Define event scope & objectives", description: "Document purpose, attendee profiles, and milestone schedule.", defaultDays: 90, priority: "high", category: "Planning" },
        { title: "Secure primary location", description: "Confirm venue booking and facilities agreement.", defaultDays: 70, priority: "high", category: "Venue" },
        { title: "Draft budget and vendor requirements", description: "Itemize cost caps and identify supplier needs.", defaultDays: 50, priority: "high", category: "Finance" },
        { title: "Coordinate programming & content", description: "Finalize run-of-show, speakers, and activity schedules.", defaultDays: 35, priority: "medium", category: "Programming" },
        { title: "Distribute attendee communications", description: "Send invitations, agendas, and directions.", defaultDays: 21, priority: "medium", category: "Communications" },
        { title: "Final vendor confirmations", description: "Lock down equipment deliveries and setup windows.", defaultDays: 7, priority: "high", category: "Vendors" },
        { title: "On-site staging and walkthrough", description: "Final walkthrough and equipment testing.", defaultDays: 1, priority: "high", category: "Execution" },
      ];

  // Scale tasks so daysBeforeEvent fits within available window without being in the past
  const maxBaseline = Math.max(...rawTasks.map((t) => t.defaultDays), 1);
  const tasks = rawTasks.map((t) => {
    // If the window is shorter than default, scale proportionally while keeping non-negative
    const daysBeforeEvent =
      diffDays >= t.defaultDays
        ? t.defaultDays
        : Math.max(0, Math.min(diffDays, Math.round((t.defaultDays / maxBaseline) * diffDays)));

    return {
      title: t.title,
      description: t.description,
      daysBeforeEvent,
      priority: t.priority,
      category: t.category,
    };
  });

  return {
    summary: isWedding
      ? `A curated wedding plan for ${event.name}, tailored for ${event.guestCount} guests at ${event.location}. Covers all key milestones from venue coordination to the celebration.`
      : isBirthday
      ? `A festive birthday celebration plan for ${event.name}, designed for ${event.guestCount} guests at ${event.location} with coordinated decor, catering, and entertainment.`
      : isCommunity
      ? `A well-structured community gathering plan for ${event.name}, bringing together ${event.guestCount} attendees at ${event.location} with safety, permits, and volunteer coordination.`
      : `A tailored event plan for ${event.name}, designed for ${event.guestCount} attendees at ${event.location} with dedicated logistics and schedule tracking.`,
    budgetAllocations: isWedding
      ? [
          { name: "Venue & Catering", percentage: 40, notes: "Venue rental, dinner, beverages, service" },
          { name: "Photography & Videography", percentage: 12, notes: "Coverage, portraits, edited gallery" },
          { name: "Florals & Décor", percentage: 10, notes: "Ceremony altar/mandap, centerpieces, lighting" },
          { name: "Attire & Beauty", percentage: 10, notes: "Wedding attire, hair, and makeup" },
          { name: "Music & Entertainment", percentage: 8, notes: "DJ, live acoustics, sound equipment" },
          { name: "Transportation & Shuttles", percentage: 5, notes: "Guest transit and couple arrival" },
          { name: "Stationery & Invitations", percentage: 3, notes: "Invites, menus, signage" },
          { name: "Miscellaneous & Favors", percentage: 2, notes: "Guest favors and contingency buffer" },
        ]
      : isBirthday
      ? [
          { name: "Venue Rental", percentage: 30, notes: "Private event space or banquet hall" },
          { name: "Catering & Cake", percentage: 30, notes: "Food stations, appetizers, custom birthday cake" },
          { name: "Decorations & Theme", percentage: 15, notes: "Balloons, backdrop, table accents" },
          { name: "Entertainment & Music", percentage: 10, notes: "DJ, performer, or interactive games" },
          { name: "Invitations & Favors", percentage: 5, notes: "Digital/print invites and party favors" },
        ]
      : isCommunity
      ? [
          { name: "Venue & Permits", percentage: 35, notes: "Public space permits, staging, sanitation" },
          { name: "Refreshments & Water", percentage: 25, notes: "Hydration stations, snacks, local food" },
          { name: "Audio/Visual & Staging", percentage: 15, notes: "PA sound system, microphones, projection" },
          { name: "Signage & Marketing", percentage: 10, notes: "Banners, flyers, social promotion" },
          { name: "Safety & Volunteer Supplies", percentage: 5, notes: "First aid, vests, communication radios" },
        ]
      : [
          { name: "Venue & Staging", percentage: 30, notes: "Facility hire and setup arrangement" },
          { name: "Catering & Refreshments", percentage: 25, notes: "Food, beverage, and dining service" },
          { name: "Audio/Visual & Tech", percentage: 15, notes: "AV equipment, microphones, presentation support" },
          { name: "Programming & Materials", percentage: 10, notes: "Handouts, speaker honorariums, activity supplies" },
          { name: "Signage & Promotion", percentage: 10, notes: "Directions, schedules, and branding" },
        ],
    tasks,
    ideas: {
      themes: isWedding
        ? ["Rustic Garden Romance", "Modern Elegance", "Bohemian Wildflowers"]
        : isBirthday
        ? ["Tropical Sunset", "Retro Vinyl & Neon", "Intimate Garden Lounge"]
        : isCommunity
        ? ["Neighborhood Unity Festival", "Local Heritage & Arts", "Green & Sustainable Fair"]
        : ["Collaborative Summit", "Milestone Commemoration", "Evening Gala & Showcase"],
      decorations: isWedding
        ? ["Floral arbor or mandap with draped linens", "Warm fairy string lights & lanterns", "Custom calligraphy welcome easel"]
        : isBirthday
        ? ["Organic balloon installation with LED number accents", "Polaroid photo guest wall", "Coordinated monochrome table linens"]
        : isCommunity
        ? ["Vibrant welcome archway and directional banners", "Community message board canvas", "Shaded pavilion gazebos"]
        : ["Branded stage backdrop and lectern banner", "Architectural ambient uplighting", "Digital display kiosks"],
      catering: isWedding
        ? ["Multi-course local seasonal tasting menu", "Signature welcome cocktails & mocktails", "Late-night regional street food station"]
        : isBirthday
        ? ["Gourmet slider & taco grazing stations", "Artisan dessert & cake flight", "Craft mocktail bar"]
        : isCommunity
        ? ["Partnered local food truck vendors", "Self-serve hydration stations", "Community bake-sale dessert tables"]
        : ["Plated seasonal luncheon or dinner", "Continuous coffee and artisan tea service", "Passed canapés during reception"],
      activities: isWedding
        ? ["Interactive photo booth with instant prints", "Acoustic golden-hour performance", "Personalized advice guestbook cards"]
        : isBirthday
        ? ["Curated live DJ set with guest song requests", "Trivia showdown tailored to guest of honor", "Celebration toast & slideshow"]
        : isCommunity
        ? ["Live local music showcase", "Interactive youth craft workshop", "Raffle drawing benefiting local initiatives"]
        : ["Keynote address and panel discussion", "Structured networking icebreaker", "Recognition and awards presentation"],
      recommendations: [
        "Finalize key vendor agreements and deposit schedules well in advance",
        "Maintain a dedicated 10% contingency buffer for unanticipated requirements",
        "Distribute a unified day-of timeline and contact sheet to all vendors",
        "Designate an on-site point of contact to handle logistics during the event",
        "Confirm all equipment load-in and load-out access windows with venue management",
      ],
    },
    vendorCategories: isWedding
      ? ["Venue", "Catering", "Photography & Video", "Florals & Decor", "Music / DJ", "Hair & Makeup", "Transportation", "Wedding Cake", "Stationery"]
      : isBirthday
      ? ["Party Venue", "Catering / Food", "Bakery / Custom Cake", "Decor & Balloons", "Entertainment / DJ", "Photography"]
      : isCommunity
      ? ["Public Space / Venue", "Sound & AV Rental", "Catering / Food Trucks", "Security & Crowd Control", "Sanitation Services", "Signage Printing"]
      : ["Event Space", "Catering & Beverage", "AV & Technical Services", "Photography", "Materials & Printing"],
  };
}
