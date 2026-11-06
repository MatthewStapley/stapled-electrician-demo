// ---------------------------------------------------------------------------
// Everything a real client would change first lives here and in the other
// files in src/data. Pages and components hold layout, not business facts.
// ---------------------------------------------------------------------------

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");

/** Prefix a site-root path with the deployment base. */
export const asset = (path: string) => BASE + path.replace(/^\//, "");

export const brand = {
  name: "Linework",
  fullName: "Linework Electrical",
  strapline: "Every line accounted for.",
  area: "Hampshire and the South Coast",
  // Ofcom reserves 01632 960000 to 960999 for drama and fiction, and .example
  // is reserved by the IETF, so neither can reach a real person.
  phone: "01632 960 417",
  email: "hello@linework.example",
};

export const stapled = {
  url: "https://stapled.co.uk",
  // The real enquiry form. Nothing on this concept ever goes to it automatically.
  enquiryUrl: "https://stapled.co.uk/#preview",
};

export const nav = [
  { label: "Services", href: asset("/services/") },
  { label: "Projects", href: asset("/projects/") },
  { label: "How it works", href: asset("/how-it-works/") },
];
