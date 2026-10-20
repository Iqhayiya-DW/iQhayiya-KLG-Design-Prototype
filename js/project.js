import { mountChrome, escapeHtml } from "./nav.js?v=klg5";
import { getProject } from "./projects.js?v=klg10";

mountChrome("work");

const PAGE_SIZE = 6;
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

function renderProject(project, gallery) {
  const parts = [
    ["Project name", project.title],
    project.location ? ["Location", project.location] : null,
    (project.completed || project.year)
      ? ["Completed", project.completed || project.year]
      : null,
  ].filter(Boolean);
  const detailsHtml = parts
    .map(
      ([label, value], index) =>
        `${index ? '<span class="meta-sep">|</span>' : ""}<span class="meta-label">${escapeHtml(label)}:</span> <span class="meta-value">${escapeHtml(value)}</span>`
    )
    .join("");

  const totalPages = Math.max(1, Math.ceil(gallery.length / PAGE_SIZE));
  let page = Number.parseInt(params.get("page") || "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  const start = (page - 1) * PAGE_SIZE;
  const slice = gallery.slice(start, start + PAGE_SIZE);

  const videoHtml = project.video
    ? `<section class="project-video">
      <video controls playsinline preload="metadata" poster="${encodeURI(project.hero)}" src="${encodeURI(project.video)}">
        Video of ${escapeHtml(project.title)}.
      </video>
    </section>`
    : "";

  const galleryHtml = gallery.length
    ? `<section class="gallery">
      <div class="gallery-grid">
        ${slice
          .map(
            (src) => `
          <figure class="gallery-item${src.includes("location-map") ? " gallery-item-map" : ""}">
            <img src="${encodeURI(src)}" alt="${escapeHtml(project.title)}">
          </figure>`
          )
          .join("")}
      </div>
      ${
        totalPages > 1
          ? `<nav class="gallery-pager" aria-label="Gallery pages">
          ${page > 1 ? `<a href="${pageHref(page - 1)}">Previous</a>` : `<span>Previous</span>`}
          <p>Page ${page} of ${totalPages}</p>
          ${page < totalPages ? `<a href="${pageHref(page + 1)}">Next</a>` : `<span>Next</span>`}
        </nav>`
          : ""
      }
    </section>`
    : "";

  root.innerHTML = `
    <section class="project-hero">
      <img src="${encodeURI(project.hero)}" alt="${escapeHtml(project.title)}">
    </section>

    <section class="project-intro">
      <h1>${escapeHtml(project.title)}</h1>
      <p class="project-copy">${detailsHtml}</p>
      <p class="lede">${escapeHtml(project.excerpt)}</p>
    </section>

    ${videoHtml}

    ${galleryHtml}

    <section class="more-projects">
      <a class="more-projects-btn" href="work.html">More Projects</a>
    </section>
  `;

  bindLightbox(root, project.title);
}

function pageHref(page) {
  const next = new URLSearchParams(location.search);
  next.set("page", String(page));
  return `${location.pathname}?${next.toString()}`;
}

function bindLightbox(root, title) {
  let box = document.querySelector(".lightbox");
  if (!box) {
    box = document.createElement("div");
    box.className = "lightbox";
    box.hidden = true;
    box.innerHTML = `<img alt="">`;
    document.body.appendChild(box);
  }
  const large = box.querySelector("img");

  const close = () => {
    box.hidden = true;
    large.removeAttribute("src");
    document.body.style.overflow = "";
  };

  root.querySelectorAll(".gallery-item img").forEach((img) => {
    img.addEventListener("click", () => {
      large.src = img.currentSrc || img.src;
      large.alt = img.alt || title;
      box.hidden = false;
      document.body.style.overflow = "hidden";
    });
  });

  box.addEventListener("click", (event) => {
    if (event.target === large) return;
    close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !box.hidden) close();
  });
}
