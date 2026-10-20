import { mountChrome, cardMarkup } from "./nav.js?v=klg5";
import { projects } from "./projects.js?v=klg12";

const params = new URLSearchParams(location.search);
const cat = params.get("cat") || "All";
mountChrome(
  cat === "Residential" ? "residential" : cat === "Community Infrastructure" ? "community" : "work"
);

const grid = document.getElementById("archive-grid");
const empty = document.getElementById("archive-empty");
const title = document.getElementById("work-title");
const kicker = document.getElementById("work-kicker");

const list = cat === "All" ? projects : projects.filter((project) => project.category === cat);
if (title) title.textContent = cat === "All" ? "Selected work" : cat;
if (kicker) kicker.textContent = cat === "All" ? "Projects" : cat;

if (grid) grid.innerHTML = list.map((project) => cardMarkup(project)).join("");
if (empty) empty.hidden = list.length > 0;
