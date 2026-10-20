import { mountChrome } from "./nav.js?v=klg5";
import { featuredProjects } from "./projects.js?v=klg13";

mountChrome("home");

const slides = featuredProjects().filter((project) => project.hero);
const imgA = document.getElementById("home-slide-a");
const imgB = document.getElementById("home-slide-b");
const link = document.getElementById("home-slide-link");
const titleEl = document.getElementById("home-caption-title");
const metaEl = document.getElementById("home-caption-meta");
const dotsHost = document.querySelector("[data-dots]");
const prev = document.querySelector("[data-prev]");
const next = document.querySelector("[data-next]");
let index = 0;
let showingA = true;
let primed = false;

slides.forEach((_, slideIndex) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.setAttribute("aria-label", `Show project ${slideIndex + 1}`);
  dot.addEventListener("click", () => show(slideIndex));
  dotsHost?.append(dot);
});

function apply(project, img) {
  img.src = project.hero;
  img.alt = project.title;
}

function caption(project) {
  link.href = `project.html?id=${encodeURIComponent(project.id)}`;
  if (titleEl) titleEl.textContent = project.title;
  if (metaEl) metaEl.textContent = [project.category, project.location].filter(Boolean).join(" · ");
  dotsHost?.querySelectorAll("button").forEach((dot, slideIndex) => {
    dot.setAttribute("aria-current", String(slideIndex === index));
  });
}

function show(nextIndex) {
  if (!slides.length || !imgA || !imgB || !link) return;
  index = (nextIndex + slides.length) % slides.length;
  const project = slides[index];
  if (!primed) {
    apply(project, imgA);
    imgA.classList.add("is-active");
    primed = true;
    caption(project);
    return;
  }
  const incoming = showingA ? imgB : imgA;
  const outgoing = showingA ? imgA : imgB;
  apply(project, incoming);
  outgoing.classList.remove("is-active");
  incoming.classList.add("is-active");
  showingA = !showingA;
  caption(project);
}

prev?.addEventListener("click", () => show(index - 1));
next?.addEventListener("click", () => show(index + 1));
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") show(index - 1);
  if (event.key === "ArrowRight") show(index + 1);
});
show(0);
if (slides.length > 1) {
  setInterval(() => show(index + 1), 7000);
}
