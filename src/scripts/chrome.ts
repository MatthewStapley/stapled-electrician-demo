// Shared behaviour: header state, the board menu and demo contact dialog.
import { brand } from "../data/site";

const header = document.querySelector<HTMLElement>("[data-header]");
const syncHeader = () => {
  const hero = document.querySelector<HTMLElement>("[data-hero-end]");
  const limit = hero ? hero.getBoundingClientRect().bottom - 80 : 40 - window.scrollY + 40;
  header?.classList.toggle("is-stuck", hero ? limit < 0 : window.scrollY > 40);
};
syncHeader();
addEventListener("scroll", syncHeader, { passive: true });
addEventListener("resize", syncHeader, { passive: true });

const board = document.querySelector<HTMLDialogElement>("[data-board]");
document.querySelectorAll("[data-board-open]").forEach((b) => b.addEventListener("click", () => board?.showModal()));
document.querySelectorAll("[data-board-close]").forEach((b) => b.addEventListener("click", () => board?.close()));

const dialog = document.querySelector<HTMLDialogElement>("[data-contact-dialog]");
const title = dialog?.querySelector("[data-contact-title]");
const body = dialog?.querySelector("[data-contact-body]");
const copy = {
  phone: ["This number is an example", `${brand.phone} comes from a range Ofcom keeps aside for fiction, so it can't reach anyone.`],
  email: ["This address is an example", `${brand.email} uses a domain reserved for examples, so it can't receive anything.`],
};
document.addEventListener("click", (e) => {
  const t = (e.target as Element).closest<HTMLElement>("[data-demo-contact]");
  if (!t || !dialog) return;
  const [h, p] = copy[t.dataset.demoContact as "phone" | "email"];
  if (title) title.textContent = h;
  if (body) body.textContent = p;
  dialog.showModal();
});
dialog?.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
