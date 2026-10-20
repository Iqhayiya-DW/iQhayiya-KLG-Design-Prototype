import { mountChrome, escapeHtml } from "./nav.js?v=klg5";
import { getProject } from "./projects.js?v=klg12";

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

function renderProject(project, gallery) {
  const slides = mediaList(project, gallery);
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
    <section class="project-stage" data-project-carousel>
      ${
        slides.length > 1
          ? `<button class="gallery-arrow" type="button" data-prev aria-label="Previous photo">‹</button>`
          : `<span></span>`
      }
      <div class="project-frame">
        <div class="project-slides">${slidesHtml}</div>
        ${
          slides.length
            ? `<p class="project-counter" data-counter>1 / ${slides.length}</p>`
            : ""
        }
      </div>
      ${
        slides.length > 1
          ? `<button class="gallery-arrow" type="button" data-next aria-label="Next photo">›</button>`
          : `<span></span>`
      }
    </section>

    <section class="project-intro">
      <h1>${escapeHtml(project.title)}</h1>
      ${detailsHtml ? `<p class="project-copy">${detailsHtml}</p>` : ""}
      <div class="project-story">${storyHtml}</div>
    </section>

    <section class="more-projects">
      <a class="more-projects-btn" href="work.html">More Projects</a>
    </section>
  `;

  bindCarousel(root);
}

function bindCarousel(root) {
  const stage = root.querySelector("[data-project-carousel]");
  if (!stage) return;
  const items = [...stage.querySelectorAll("[data-slide]")];
  if (!items.length) return;
  const counter = stage.querySelector("[data-counter]");
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
    if (counter) counter.textContent = `${index + 1} / ${items.length}`;
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
