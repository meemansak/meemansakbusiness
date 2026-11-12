// Add the approved fees and a public inquiry address when they are ready.
const settings = {
  inquiryEmail: "",
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

const serviceArt = document.querySelector(".service-art");
const serviceLabels = {
  business: ["Offer", "Audience", "First client"],
  production: ["Brief", "Edit", "Delivery"],
  ai: ["Input", "AI draft", "Human review"],
};

for (const detail of document.querySelectorAll(".services-list details")) {
  detail.addEventListener("toggle", () => {
    if (!detail.open) return;
    serviceArt.dataset.mode = detail.dataset.art;
    serviceArt.querySelector("figcaption").textContent = serviceLabels[detail.dataset.art].join("   →   ");
  });
}

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
const status = form.querySelector(".form-status");
const draft = form.querySelector(".draft");
send.hidden = false;
if (settings.inquiryEmail) {
  send.firstChild.textContent = "Open email draft ";
  form.querySelector(".form-note").textContent = "This opens a draft in your email app for you to review and send.";
}
for (const price of document.querySelectorAll("[data-fee]")) {
  if (settings.fees[price.dataset.fee]) price.textContent = settings.fees[price.dataset.fee];
}
for (const link of document.querySelectorAll("[data-session], [data-focus]")) {
  link.addEventListener("click", () => {
    if (link.dataset.session) form.elements.session.value = link.dataset.session;
    if (link.dataset.focus) form.elements.focus.value = link.dataset.focus;
  });
}
form.addEventListener("submit", async (event) => {
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
  if (settings.inquiryEmail) {
    window.location.href = "mailto:" + settings.inquiryEmail + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    return;
  }
  draft.value = subject + "\n\n" + body;
  draft.hidden = false;
  status.hidden = false;
  try {
    await navigator.clipboard.writeText(draft.value);
    status.textContent = "Draft copied.";
  } catch {
    status.textContent = "Your draft is ready below. Select it to copy.";
  }
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

let startingScene = false;
function startScene() {
  if (startingScene || reducedMotion.matches) return;
  startingScene = true;
  import("./sculpture.js")
    .then(({ mountSculpture }) => mountSculpture(reducedMotion))
    .catch(() => { startingScene = false; });
}
reducedMotion.addEventListener("change", startScene);
startScene();
