import { consumerUnit, images, roomRender, type SiteImage } from "./images";

export interface Project {
  slug: string;
  title: string;
  kind: string;
  place: string;
  summary: string;
  image: SiteImage;
  gallery: { image: SiteImage; caption: string }[];
  brief: string;
  problem: string;
  approach: string[];
  /** Short facts in the drawing register. These are all invented for the concept. */
  register: [string, string][];
  services: string[];
  /** Shows the interactive "as drawn / as lit" comparison */
  drawnCompare?: boolean;
}

export const projects: Project[] = [
  {
    slug: "kitchen-extension-lighting",
    title: "A rear extension that lights itself in layers",
    kind: "Lighting and renovation",
    place: "Rear extension, 1930s semi",
    summary: "Three lighting circuits drawn around the joinery before the kitchen was ordered.",
    image: roomRender,
    gallery: [{ image: images.pendantKitchen, caption: "Reference image for pendant spacing over an island." }],
    brief: "The owners wanted one open room to work as a kitchen by day and somewhere calm in the evening, without a ceiling full of downlights.",
    problem: "The kitchen layout was still moving while the steel went in, so the island feed and the alcove strips had to be fixed against drawings that were not final.",
    approach: [
      "Drew three separate circuits over the architect's plan: pendants, downlights and joinery.",
      "Fixed the island feed in the slab only after the kitchen fitter signed off the setting-out.",
      "Moved all switching to one grid plate by the door, with the dimmers matched to the LED drivers.",
      "Photographed every route before plastering and added them to the handover file.",
    ],
    register: [["Lighting circuits", "3"], ["Switching", "Grid plate by the door"], ["Dimming", "Trailing-edge, matched to drivers"], ["Certificate", "EIC and Part P notification"]],
    services: ["lighting", "renovations"],
    drawnCompare: true,
  },
  {
    slug: "victorian-terrace-rewire",
    title: "Rewiring a Victorian terrace, one floor at a time",
    kind: "Full rewire",
    place: "Three-storey terrace",
    summary: "A phased rewire with original plaster kept wherever a route could avoid it.",
    image: images.stripOut,
    gallery: [{ image: images.opening, caption: "Ceilings opened only where the plan called for it." }],
    brief: "A family moving into a house still on 1970s wiring, with a young child, and a builder already booked for the back rooms.",
    problem: "Original lath and plaster and decorative cornices in the front rooms meant conventional chasing was not an option on two floors.",
    approach: [
      "Surveyed the voids first, then planned routes through existing floor and chimney-breast voids.",
      "Phased the work top to bottom, so one floor was always habitable.",
      "Kept a temporary supply running for the builder and for the family's kitchen.",
      "Replaced the fuse box with a metal consumer unit with spare ways for a future loft.",
    ],
    register: [["Circuits", "14"], ["Phasing", "One floor at a time"], ["Alarms", "Interlinked smoke and heat"], ["Certificate", "EIC and Part P notification"]],
    services: ["rewires", "consumer-units"],
  },
  {
    slug: "ev-charger-and-board",
    title: "An EV charger and a board that were ready for it",
    kind: "EV charging and consumer unit",
    place: "Detached house with drive",
    summary: "A demand assessment that turned a simple charger job into the right one.",
    image: images.ev,
    gallery: [{ image: consumerUnit, caption: "A metal consumer unit with RCBOs and spare ways, illustrated for this concept." }],
    brief: "A homeowner with a new car and a request for the fastest home charger available.",
    problem: "The existing board had no spare ways, and an electric shower and induction hob left the house near its limit.",
    approach: [
      "Assessed maximum demand before recommending any hardware.",
      "Fitted a larger metal consumer unit with RCBO protection throughout.",
      "Ran a dedicated 32 A circuit by the shortest neat route to the side wall.",
      "Added load management, so the charger backs off when the shower is running.",
    ],
    register: [["Charger", "7 kW, single phase"], ["Protection", "Load management fitted"], ["Network", "Operator notified"], ["Certificate", "EIC"]],
    services: ["ev-charging", "consumer-units"],
  },
  {
    slug: "stair-and-hall-lighting",
    title: "A dark stairwell, lit from the handrail down",
    kind: "Lighting",
    place: "New stair, loft conversion",
    summary: "Low-glare light for a new stair, with two-way switching where you need it.",
    image: images.stair,
    gallery: [],
    brief: "A new stair into a loft conversion had one ceiling light at the top, which left the treads in shadow.",
    problem: "There was no void above the stair for downlights, and the joiner needed the handrail detail before any cable could go in.",
    approach: [
      "Detailed a low-glare strip under the handrail with the joiner.",
      "Added one wall light at each half-landing as a soft marker.",
      "Wired the switching so that each floor can control the stair.",
    ],
    register: [["Lighting circuits", "2"], ["Switching", "Three-point control"], ["Dimming", "Set low for night use"], ["Certificate", "Minor works"]],
    services: ["lighting"],
  },
  {
    slug: "workspace-fit-out",
    title: "A workspace fit-out with its services on show",
    kind: "Larger project",
    place: "Converted light-industrial unit",
    summary: "Exposed containment, set out as carefully as the joinery.",
    image: images.ceiling,
    gallery: [
      { image: images.staffKitchen, caption: "Shared kitchen with pendants on a separate lighting zone." },
      { image: images.board, caption: "Distribution board detail. Photograph shows a non-UK installation style." },
    ],
    brief: "An exposed concrete soffit meant there was nowhere to hide cables: every run of tray would be seen by every visitor.",
    problem: "The tray, lighting, ventilation and sprinkler routes all wanted the same ceiling, and the client had a fixed date to move in.",
    approach: [
      "Coordinated routes with the mechanical contractor before ordering containment.",
      "Set out tray and linear lights on the same centres as the structure.",
      "Split the floor into lighting zones with presence detection.",
      "Handed over documented boards, test results and as-installed drawings.",
    ],
    register: [["Supply", "Three phase"], ["Containment", "Exposed steel tray"], ["Lighting", "Zoned with presence detection"], ["Handover", "Full O&M file"]],
    services: ["larger-projects"],
  },
];

export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
