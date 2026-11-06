import { consumerUnit, images, roomRender, testSheet, type SiteImage } from "./images";

export interface Service {
  slug: string;
  way: number;
  title: string;
  short: string;
  /** Shown in the schedule of circuits */
  covers: string;
  certificate: string;
  image: SiteImage;
  intro: string;
  includes: string[];
  stages: { title: string; body: string }[];
  knowing: { q: string; a: string }[];
  project?: string;
  /** Extra questions on the quote form */
  scope: { name: string; label: string; options: string[] }[];
}

export const services: Service[] = [
  {
    slug: "rewires",
    way: 1,
    title: "Full and partial rewires",
    short: "Rewires",
    covers: "Old wiring out, new circuits in, planned around the way the house is used.",
    certificate: "Electrical Installation Certificate",
    image: images.stripOut,
    intro:
      "A rewire is the one chance to put everything where it should be. We walk the house with you first, mark up every socket, switch and light on a plan, and agree it before a floorboard comes up.",
    includes: [
      "A marked-up plan of every room, agreed before work starts",
      "New circuits, new consumer unit and main bonding checked or upgraded",
      "Interlinked smoke and heat alarms planned in from the start",
      "Data, TV and heating controls routed with the power, not added afterwards",
      "Testing, certification and Building Regulations notification",
    ],
    stages: [
      { title: "Survey and plan", body: "We check the supply and earthing, lift a few boards to see what we are dealing with, and draw the new layout room by room." },
      { title: "First fix", body: "Cables go in before any plaster repairs: chased or clipped in the permitted zones, with routes photographed for your records." },
      { title: "Second fix", body: "After plastering and decorating, we fit the accessories, connect the new board and bring circuits on one at a time." },
      { title: "Test and hand over", body: "Every circuit is tested, the results are written up, and you get the paperwork with a walk through the board." },
    ],
    knowing: [
      { q: "Can we stay in the house?", a: "Often, yes, particularly if we can work room by room and leave one circuit live overnight. It is dusty work, so an empty house is quicker. We will tell you honestly which suits yours after the survey." },
      { q: "How do I know a rewire is needed?", a: "Age alone does not decide it. Rubber or lead-sheathed cable, no circuit protection by RCD, and a lack of earth on lighting circuits are the usual signs. An inspection will show you where you stand before you commit." },
      { q: "Is a rewire notifiable?", a: "In England, yes. New circuits and a new consumer unit fall under Part P of the Building Regulations, so the work must be notified to building control, either through a registered scheme or directly." },
    ],
    project: "victorian-terrace-rewire",
    scope: [
      { name: "rooms", label: "How many bedrooms?", options: ["1", "2", "3", "4", "5 or more"] },
      { name: "extent", label: "How much needs doing?", options: ["The whole property", "One floor", "A few rooms", "Not sure yet"] },
    ],
  },
  {
    slug: "consumer-units",
    way: 2,
    title: "Consumer unit upgrades",
    short: "Consumer units",
    covers: "A new board with individual circuit protection, labelled so anyone can read it.",
    certificate: "Electrical Installation Certificate",
    image: consumerUnit,
    intro:
      "The board is where the whole installation gets its protection. A new one is usually a day's work, but the checks around it matter more than the swap: the existing circuits have to be proven safe to connect.",
    includes: [
      "Metal-enclosed consumer unit, sized with spare ways for what comes next",
      "RCBO protection, so one fault does not take out half the house",
      "Surge protection where the assessment calls for it",
      "Main earthing and bonding checked and corrected",
      "A printed schedule of circuits fitted inside the door",
    ],
    stages: [
      { title: "Check before quoting", body: "We look at the earthing arrangement, the main fuse, the meter tails and the condition of what is connected." },
      { title: "Prepare the day", body: "We agree when the power goes off, and what needs to stay safe, such as freezers, medical equipment or home working." },
      { title: "Fit and test", body: "The old board comes off, the new one goes on, and every circuit is tested as it is reconnected." },
      { title: "Label and explain", body: "You get a clear schedule, the certificate, and a two-minute lesson on what to do if something trips." },
    ],
    knowing: [
      { q: "How long will the power be off?", a: "Plan for most of a working day. Any fault found on an existing circuit can extend that, which is why we test as we go and call you before doing anything unplanned." },
      { q: "What if testing finds a fault?", a: "An old board can hide faults that a modern RCBO will not tolerate. We find the circuit, explain what is wrong and quote for it separately, rather than leaving it disconnected without telling you." },
      { q: "Does my fuse box need replacing?", a: "Not automatically. If it has no RCD protection, or has rewirable fuses, it is worth having it inspected. Older does not always mean unsafe." },
    ],
    project: "ev-charger-and-board",
    scope: [
      { name: "board", label: "What is there now?", options: ["An old fuse box", "A board with one or two RCDs", "A newer board that needs more ways", "Not sure"] },
      { name: "location", label: "Where is it?", options: ["Hall or under the stairs", "Garage", "Cupboard or utility", "Somewhere else"] },
    ],
  },
  {
    slug: "lighting",
    way: 3,
    title: "Lighting design and installation",
    short: "Lighting",
    covers: "Layers of light, drawn as circuits, with switching that makes sense on day one.",
    certificate: "Certificate to suit the work",
    image: roomRender,
    intro:
      "Good lighting is mostly decided before the plaster goes on. We plan layers, not just a grid of downlights: what lights the worktop, what lights the wall, and what you leave on at ten o'clock at night.",
    includes: [
      "A lighting layout drawn over your floor plan",
      "Circuits and switching grouped by how the room is used",
      "Dimmers and LED drivers matched so they do not flicker or hum",
      "Fire-rated fittings and insulation clearances where the ceiling needs them",
      "Correct IP ratings for bathrooms and outside",
    ],
    stages: [
      { title: "Understand the room", body: "We look at the plan, finishes and joinery, and how the room gets used after dark." },
      { title: "Draw the layers", body: "Task, ambient and accent lighting go on the plan as separate circuits, with switch positions marked." },
      { title: "First fix with the trades", body: "We set positions against the joiner's and kitchen fitter's drawings, not an estimate of them." },
      { title: "Commission", body: "Fittings go in, scenes are set, and dimmers are tuned once you can see the finished room." },
    ],
    knowing: [
      { q: "Can you work with fittings I have already bought?", a: "Usually. Send us the product details early. The driver, dimmer and transformer all need to agree with each other, and it is far cheaper to find out now." },
      { q: "Do I need to involve you before the kitchen is ordered?", a: "Ideally, yes. Strips in joinery and pendants over an island need cable in exact places, and those places are set by the kitchen drawings." },
      { q: "Is this notifiable work?", a: "It depends. Adding lights to an existing circuit in a kitchen often is not, while a new circuit is. We will tell you which applies and issue the right certificate." },
    ],
    project: "kitchen-extension-lighting",
    scope: [
      { name: "room", label: "Which space?", options: ["Kitchen or extension", "Living spaces", "Hall and stairs", "Whole house", "Outside"] },
      { name: "stage", label: "What stage is the room at?", options: ["Still being designed", "Walls are open", "Finished room"] },
    ],
  },
  {
    slug: "ev-charging",
    way: 4,
    title: "EV charge points",
    short: "EV charging",
    covers: "A charger on its own circuit, after the checks that keep it within your supply.",
    certificate: "Electrical Installation Certificate",
    image: images.ev,
    intro:
      "Fitting a charger is the easy part. What matters is whether your supply can take it, how it is earthed, and where the cable runs. We work that out first and show you the route before drilling anything.",
    includes: [
      "A maximum demand assessment of your existing supply",
      "Earthing arrangement checked for charge point use",
      "A dedicated circuit from the board, usually 32 A for a 7 kW charger",
      "Load management if the house is close to its limit",
      "Notification to your network operator where required",
    ],
    stages: [
      { title: "Remote check", body: "Photos of your board, meter and parking spot tell us most of what we need." },
      { title: "Agree the route", body: "We mark the charger position and cable route, and tell you if a spare way or a new board is needed." },
      { title: "Install", body: "Most homes take around a day, with the circuit, charger and app set up before we leave." },
      { title: "Hand over", body: "We test it, charge the car if it is there, and send your certificate and network notification details." },
    ],
    knowing: [
      { q: "Will my main fuse cope?", a: "Many will, but it depends on what else you run. If the demand assessment is tight, load management can reduce charging when the house is busy, or your network operator may upgrade the supply." },
      { q: "Can the charger go on a driveway away from the house?", a: "Usually, with armoured cable or ducting. A longer run needs a larger cable, so distance affects the price." },
      { q: "Which charger should I buy?", a: "That depends on your tariff, car and whether you have solar. We will suggest a few that suit you and explain the difference in plain English." },
    ],
    project: "ev-charger-and-board",
    scope: [
      { name: "parking", label: "Where do you park?", options: ["Driveway by the house", "Garage", "Parking away from the house", "Not sure yet"] },
      { name: "charger", label: "Do you have a charger already?", options: ["Yes, bought and waiting", "No, please advise", "I have a model in mind"] },
    ],
  },
  {
    slug: "testing",
    way: 5,
    title: "Testing and EICRs",
    short: "Testing and EICRs",
    covers: "An honest report on the condition of what is there, coded and explained.",
    certificate: "Electrical Installation Condition Report",
    image: testSheet,
    intro:
      "An Electrical Installation Condition Report tells you what state the wiring is in. It is not a sales document. Anything we find is coded, explained in plain English and left for you to decide on.",
    includes: [
      "Visual inspection of the installation, room by room",
      "Testing of a sample of each circuit, or all of them if you need that",
      "Every observation coded C1, C2, C3 or FI",
      "A written summary alongside the formal report",
      "An itemised quote for any remedial work, with no obligation to use us",
    ],
    stages: [
      { title: "Agree the scope", body: "We confirm what is being inspected and why: a sale, a tenancy, or peace of mind." },
      { title: "Inspect and test", body: "Expect the power to be off in parts of the property for periods during the visit." },
      { title: "Write it up", body: "You receive the full report and a plain-English summary of what matters." },
      { title: "Decide what is next", body: "If anything needs attention, you can have it quoted, and re-tested once it is complete." },
    ],
    knowing: [
      { q: "How often do I need one?", a: "In England, private landlords must have the installation inspected at least every five years. For owner-occupied homes, every ten years or on moving in is a common recommendation." },
      { q: "What do the codes mean?", a: "C1 means danger is present. C2 means potentially dangerous. C3 means improvement is recommended. FI means further investigation is needed. C1, C2 or FI make a report unsatisfactory." },
      { q: "What happens if the report is unsatisfactory?", a: "It means something needs attention, and the report says what. Landlords must complete remedial work within 28 days, or sooner if the report says so." },
    ],
    scope: [
      { name: "reason", label: "Why do you need it?", options: ["I'm a landlord", "Buying or selling", "Peace of mind", "Something else"] },
      { name: "rooms", label: "How many bedrooms?", options: ["1", "2", "3", "4", "5 or more"] },
    ],
  },
  {
    slug: "renovations",
    way: 6,
    title: "Extensions and renovations",
    short: "Renovations",
    covers: "Electrical work sequenced with your builder, from first fix to final test.",
    certificate: "Electrical Installation Certificate",
    image: images.opening,
    intro:
      "On a renovation, the electrician is in and out for months. We work from your architect's or builder's drawings, keep a live marked-up plan, and turn up on the days the job actually needs us.",
    includes: [
      "A pre-start review of drawings, kitchen plans and finishes",
      "Temporary site supply and lighting where needed",
      "First fix coordinated with plumbing, joinery and plastering",
      "Second fix after decoration, with protection for finished surfaces",
      "As-installed drawings and photographs of what went in the walls",
    ],
    stages: [
      { title: "Review the drawings", body: "We flag clashes early: a socket behind a tall unit, a pendant off-centre, a beam where a cable needs to go." },
      { title: "Agree the programme", body: "We work back from the plastering date with your builder and set clear visits." },
      { title: "First fix and photograph", body: "Everything is recorded before it disappears behind plaster." },
      { title: "Second fix and certify", body: "Accessories, testing, certificates and a final walk round with the builder and you." },
    ],
    knowing: [
      { q: "Can you work with my builder?", a: "Yes. Most of our renovation work comes as part of a wider team. We are happy to deal with the builder day to day and keep you informed." },
      { q: "When should I bring you in?", a: "Before the kitchen is ordered and before plastering is booked. Early enough to influence the plan is the point." },
      { q: "What if the plan changes on site?", a: "It will. We keep the marked-up plan current and agree any changes before making them, so nothing arrives as a surprise on the final invoice." },
    ],
    project: "kitchen-extension-lighting",
    scope: [
      { name: "kind", label: "What is the project?", options: ["Extension", "Loft conversion", "Garage conversion", "Full renovation", "New build"] },
      { name: "stage", label: "Where have you got to?", options: ["Early ideas", "Drawings are ready", "Builder appointed", "Work has started"] },
    ],
  },
  {
    slug: "larger-projects",
    way: 7,
    title: "Larger projects",
    short: "Larger projects",
    covers: "Small commercial fit-outs and multi-unit work, with design and documents to match.",
    certificate: "Certificates and O&M documents",
    image: images.ceiling,
    intro:
      "Above a certain size, the paperwork matters as much as the workmanship. We take on projects small enough to stay personally involved in and large enough to need load schedules, containment and a proper handover file.",
    includes: [
      "Load assessment and circuit design, including three-phase where needed",
      "Containment and cable routes drawn up with the other trades",
      "Distribution boards with labelled, documented schedules",
      "Programme and progress reporting for the main contractor or client",
      "A full handover file with test results and as-installed drawings",
    ],
    stages: [
      { title: "Price from documents", body: "We work from your specification or help you write one, and list our assumptions clearly." },
      { title: "Plan the install", body: "RAMS, programme and drawings are agreed before we mobilise." },
      { title: "Install in phases", body: "We work to agreed zones so that occupied areas stay usable." },
      { title: "Commission and hand over", body: "Testing is witnessed where required, and the handover file comes with the final account." },
    ],
    knowing: [
      { q: "What sort of size suits you?", a: "Shops, offices, small workshops, and blocks or conversions of a handful of units. If yours is larger, we will tell you straight away." },
      { q: "Do you work to a main contractor?", a: "Yes, or directly for the client. Either way we agree who holds which risks at the start." },
      { q: "Can you work around a trading business?", a: "Yes. Out-of-hours and phased working are planned in from the first programme." },
    ],
    project: "workspace-fit-out",
    scope: [
      { name: "kind", label: "What kind of building?", options: ["Office", "Shop or hospitality", "Workshop or light industrial", "Multi-unit residential"] },
      { name: "documents", label: "What do you have so far?", options: ["Specification and drawings", "Drawings only", "Just an idea"] },
    ],
  },
];

export const serviceBySlug = (slug: string) => services.find((s) => s.slug === slug);
