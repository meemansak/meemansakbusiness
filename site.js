import { setupRefraction } from "./refraction.js?v=9";
import { setupMotion } from "./motion.js?v=9";

// Set the session fees when they are confirmed.
const settings = {
  fees: {
    "Discovery call": "",
    "Strategy session": "",
    "Deep dive": "",
  },
};

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const menu = document.querySelector(".menu-button");
const navigation = document.querySelector("#navigation");

function setMenu(open) {
  menu.setAttribute("aria-expanded", String(open));
  navigation.dataset.collapsed = String(!open);
  menu.querySelector("span").textContent = open ? "−" : "+";
}

menu.hidden = false;
setMenu(false);
menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") === "false"));
navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    if (menu.getClientRects().length) menu.focus();
  }
});

const steps = [
  ["A new inquiry comes in.", "Capture the goal, budget, timeline, and any missing information in one place."],
  ["AI prepares a first draft.", "Use the brief to draft a reply and flag the questions you still need to ask."],
  ["You review and send.", "Check the facts, personalize the reply, and decide when it’s ready to go."],
];

const workflow = document.querySelector(".workflow");
const controls = workflow.querySelector(".workflow-controls");
const workflowResult = workflow.querySelector(".workflow-result");
controls.hidden = false;
controls.addEventListener("click", (event) => {
  const selected = event.target.closest("[data-step]");
  if (!selected) return;
  for (const button of controls.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button === selected));
  }
  const [title, description] = steps[Number(selected.dataset.step)];
  workflowResult.querySelector("h3").textContent = title;
  workflowResult.querySelector("p").textContent = description;
});

const form = document.querySelector("#inquiry");
const send = form.querySelector("button[type=submit]");
send.hidden = false;
for (const price of document.querySelectorAll("[data-fee]")) {
  if (settings.fees[price.dataset.fee]) price.textContent = settings.fees[price.dataset.fee];
}
for (const link of document.querySelectorAll("[data-session]")) {
  link.addEventListener("click", () => {
    form.elements.session.value = link.dataset.session;
  });
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = new FormData(form);
  const subject = ["Consulting inquiry", values.get("session")].filter(Boolean).join(" — ");
  const body = [
    "Name: " + values.get("name"),
    "Email: " + values.get("email"),
    "Session: " + (values.get("session") || "Still deciding"),
    "Focus: " + (values.get("focus") || "Still deciding"),
    "",
    values.get("brief"),
  ].join("\n");
  const email = document.querySelector(".contact-copy a").getAttribute("href");
  window.location.href = email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
});

const reveal = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add("in-view");
    reveal.unobserve(entry.target);
  }
}, { rootMargin: "0px 0px -25px 0px" });
for (const section of document.querySelectorAll("[data-reveal]")) {
  section.classList.add("reveal-ready");
  reveal.observe(section);
}

let pendingScroll = false;
function updateWorkflow() {
  pendingScroll = false;
  const { top, height } = workflow.getBoundingClientRect();
  const progress = reducedMotion.matches ? .5 : Math.max(0, Math.min(1, (innerHeight - top) / (innerHeight + height)));
  workflow.style.setProperty("--scene-x", ((progress - .5) * 74) + "px");
  workflow.style.setProperty("--turn", ((progress - .5) * 65) + "deg");
}
function onScroll() {
  if (pendingScroll) return;
  pendingScroll = true;
  requestAnimationFrame(updateWorkflow);
}
for (const event of ["scroll", "resize"]) window.addEventListener(event, onScroll, { passive: true });
reducedMotion.addEventListener("change", onScroll);
onScroll();

setupMotion(reducedMotion);

setupRefraction(reducedMotion);
