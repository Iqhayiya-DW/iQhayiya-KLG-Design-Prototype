import { mountChrome, escapeHtml } from "./nav.js?v=klg5";
import { getProject, getNeighbors } from "./projects.js?v=klg13";

mountChrome("work");

const params = new URLSearchParams(location.search);
const project = getProject(params.get("id"));
const root = document.getElementById("project-root");

if (!project || !root) {
  if (root) {
    root.innerHTML = `
      <section class="page-hero">
        <p class="eyebrow">Archive</p>
        <h1>Project not found.</h1>
        <p class="lede"><a href="work.html">Return to work</a></p>
      </section>
    `;
  }
} else {
  document.title = `${project.title} — iQhayiya Design Workshop`;
  loadGallery(project).then((gallery) => renderProject(project, gallery));
}

async function loadGallery(project) {
  const fallback = (project.gallery || []).filter(Boolean);
  if (!project.gallerySource) return fallback;
  try {
    const res = await fetch(project.gallerySource);
    if (!res.ok) return fallback;
    const data = await res.json();
    const extra = (data.images || []).filter(Boolean);
    const merged = [...fallback];
    extra.forEach((src) => {
      if (!merged.includes(src)) merged.push(src);
    });
    return merged.length ? merged : fallback;
  } catch {
    return fallback;
  }
}

function mediaList(project, gallery) {
  const slides = [];
  const seen = new Set();
  const add = (type, src) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    slides.push({ type, src });
  };
  add("image", project.hero);
  gallery.forEach((src) => add("image", src));
  add("video", project.video);
  return slides;
}

function neighborLink(kind, neighbor) {
  if (!neighbor) return "";
  const href = `project.html?id=${encodeURIComponent(neighbor.id)}`;
  const caret =
    kind === "prev"
      ? `<svg viewBox="0 0 9 16" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.2" points="7.3,14.7 2.5,8 7.3,1.2"/></svg>`
      : `<svg viewBox="0 0 9 16" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.2" points="1.6,1.2 6.5,7.9 1.6,14.7"/></svg>`;
  const label = kind === "prev" ? "Previous" : "Next";
  const copy = `
      <div class="item-pagination-copy">
        <p class="item-pagination-label">${label}</p>
        <h2 class="item-pagination-title">${escapeHtml(neighbor.title)}</h2>
      </div>`;
  return kind === "prev"
    ? `<a class="item-pagination-link item-pagination-link--prev" href="${href}">
        <span class="item-pagination-icon">${caret}</span>${copy}
      </a>`
    : `<a class="item-pagination-link item-pagination-link--next" href="${href}">
        ${copy}<span class="item-pagination-icon">${caret}</span>
      </a>`;
}

function renderProject(project, gallery) {
  const slides = mediaList(project, gallery);
  const { prev, next } = getNeighbors(project);
  const parts = [
    project.completed || project.year
      ? ["Date of completion", project.completed || project.year]
      : null,
    project.location ? ["Location", project.location] : null,
    project.client ? ["Client", project.client] : null,
  ].filter(Boolean);
  const detailsHtml = parts
    .map(
      ([label, value], index) =>
        `${index ? '<span class="meta-sep">|</span>' : ""}<span class="meta-label">${escapeHtml(label)}:</span> <span class="meta-value">${escapeHtml(value)}</span>`
    )
    .join("");

  const story = (project.paragraphs || []).filter(Boolean);
  const storyHtml = story.length
    ? story.map((p) => `<p>${escapeHtml(p)}</p>`).join("")
    : project.excerpt
      ? `<p>${escapeHtml(project.excerpt)}</p>`
      : "";

  const slidesHtml = slides
    .map((slide, index) => {
      if (slide.type === "video") {
        return `<video data-slide="${index}" controls playsinline preload="metadata" src="${encodeURI(slide.src)}" aria-label="Video of ${escapeHtml(project.title)}"></video>`;
      }
      const map = slide.src.includes("location-map") ? " is-map" : "";
      return `<img data-slide="${index}" class="${map.trim()}" src="${encodeURI(slide.src)}" alt="${escapeHtml(project.title)}" onerror="this.remove()">`;
    })
    .join("");

  root.innerHTML = `
    <section class="project-head">
      <h1>${escapeHtml(project.title)}</h1>
      ${detailsHtml ? `<p class="project-copy">${detailsHtml}</p>` : ""}
    </section>

    <section class="project-stage" data-project-carousel>
      ${
        slides.length > 1
          ? `<button class="gallery-arrow" type="button" data-prev aria-label="Previous photo">‹</button>`
          : `<span></span>`
      }
      <div class="project-frame">
        <div class="project-slides">${slidesHtml}</div>
      </div>
      ${
        slides.length > 1
          ? `<button class="gallery-arrow" type="button" data-next aria-label="Next photo">›</button>`
          : `<span></span>`
      }
    </section>

    <section class="project-intro">
      <div class="project-story">${storyHtml}</div>
    </section>

    <nav class="item-pagination" aria-label="Adjacent projects">
      ${neighborLink("prev", prev)}
      ${neighborLink("next", next)}
    </nav>
  `;

  bindCarousel(root);
}

function bindCarousel(root) {
  const stage = root.querySelector("[data-project-carousel]");
  if (!stage) return;
  const items = [...stage.querySelectorAll("[data-slide]")];
  if (!items.length) return;
  let index = 0;

  const pauseVideos = () => {
    stage.querySelectorAll("video").forEach((video) => {
      video.pause();
    });
  };

  const show = (nextIndex) => {
    index = (nextIndex + items.length) % items.length;
    items.forEach((item, itemIndex) => {
      item.classList.toggle("is-active", itemIndex === index);
    });
    pauseVideos();
  };

  stage.querySelector("[data-prev]")?.addEventListener("click", () => show(index - 1));
  stage.querySelector("[data-next]")?.addEventListener("click", () => show(index + 1));
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(index - 1);
    if (event.key === "ArrowRight") show(index + 1);
  });

  let touchX = null;
  stage.addEventListener("touchstart", (event) => {
    touchX = event.changedTouches[0]?.clientX ?? null;
  }, { passive: true });
  stage.addEventListener("touchend", (event) => {
    if (touchX == null) return;
    const dx = (event.changedTouches[0]?.clientX ?? touchX) - touchX;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  }, { passive: true });

  show(0);
}
