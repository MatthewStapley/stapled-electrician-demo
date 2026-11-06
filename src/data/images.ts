import { asset } from "./site";

export type Source = "photo" | "render" | "drawing";

export interface SiteImage {
  /** File stem in public/images or public/renders */
  file: string;
  alt: string;
  width: number;
  height: number;
  source: Source;
  credit?: string;
  creditUrl?: string;
  focus?: string;
}

const WIDTHS = [640, 1024, 1600];

const photo = (file: string, alt: string, width: number, height: number, credit: string, creditUrl: string, focus?: string): SiteImage => ({
  file, alt, width, height, source: "photo", credit, creditUrl, focus,
});

export const images = {
  stripOut: photo("strip-out", "A room stripped back to brick and props during a renovation, with windows open and rubble on the floor.", 1600, 1067, "Stefan Lehner", "https://unsplash.com/photos/room-renovation-with-metal-support-poles-biRt6RXejuk"),
  opening: photo("first-fix-opening", "A corridor mid-renovation with the ceiling opened up and the joists exposed.", 1600, 2135, "Olek Buzunov", "https://unsplash.com/photos/interior-room-undergoing-renovation-with-exposed-walls-and-doorway-R2olgus7AO4", "50% 30%"),
  stair: photo("lit-stair", "A timber staircase with a warm wall light and a concealed strip beneath the handrail.", 1600, 2844, "Filipp Romanovski", "https://unsplash.com/photos/modern-wooden-staircase-illuminated-by-warm-lighting-M4dpV6STEDM", "50% 45%"),
  ev: photo("ev-charger", "A white electric car charging from a wall-mounted charge point on a pale brick wall.", 1600, 1068, "Evnex Ltd", "https://unsplash.com/photos/black-car-parked-beside-brown-brick-wall-9RZlFXzrANI"),
  staffKitchen: photo("staff-kitchen", "A long shared kitchen and dining space with pendants in a line above a timber table.", 1600, 1068, "Nastuh Abootalebi", "https://unsplash.com/photos/room-with-pendant-lamps-and-rectangular-dining-set-JdcJn85xD2k"),
  ceiling: photo("workspace-ceiling", "Linear lights and steel cable tray running in straight lines beneath a concrete soffit.", 1600, 1083, "Declan Sun", "https://unsplash.com/photos/iK1WfxsJgLc"),
  board: photo("distribution-board", "A neatly wired distribution board with rows of labelled modular devices.", 1600, 2400, "Markus Spiske", "https://unsplash.com/photos/electrical-switch-box-with-circuit-breakers-kK7uPfb2YWU", "50% 40%"),
  pendantKitchen: photo("pendant-kitchen", "A pale kitchen with a line of slim pendants above a central island.", 1600, 1792, "Michael Alake", "https://unsplash.com/photos/a-kitchen-with-a-center-island-surrounded-by-wooden-chairs-6s2cHhuy6lY", "50% 35%"),
} satisfies Record<string, SiteImage>;

export const roomRender: SiteImage = {
  file: "kitchen-wide-lit",
  alt: "A visualised kitchen extension at dusk: dark joinery, a stone island under three opal globes, and a lit shelf alcove beside a glazed screen.",
  width: 1600,
  height: 1000,
  source: "render",
};

export const consumerUnit: SiteImage = {
  file: "consumer-unit",
  alt: "An illustrated metal consumer unit: a 100 A main switch, surge protection and twelve labelled RCBOs with two spare ways, with brown, blue and green and yellow tails below.",
  width: 1600,
  height: 1600,
  source: "drawing",
};

export const testSheet: SiteImage = {
  file: "test-sheet",
  alt: "A specimen schedule of test results listing ten circuits with their readings, all marked as passes. Every figure is invented.",
  width: 1600,
  height: 1600,
  source: "drawing",
};

export function imageUrl(img: SiteImage, width = 1024) {
  return img.source !== "photo" ? asset(`/renders/${img.file}.webp`) : asset(`/images/${img.file}-${width}.webp`);
}

export function imageSrcset(img: SiteImage) {
  if (img.source !== "photo") return undefined;
  return WIDTHS.map((w) => `${asset(`/images/${img.file}-${w}.webp`)} ${w}w`).join(", ");
}
