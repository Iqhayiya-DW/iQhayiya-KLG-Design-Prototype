import { mountChrome, escapeHtml } from "./nav.js?v=klg5";
import { getProject, getNeighbors } from "./projects.js?v=klg34";

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
    const res = await fetch(`${project.gallerySource}?v=klg30`);
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
  if (!neighbor) return `<span></span>`;
  const href = `project.html?id=${encodeURIComponent(neighbor.id)}`;
  const caretLeft = `<svg viewBox="0 0 9 16" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.15" points="7.3,14.7 2.5,8 7.3,1.2"/></svg>`;
  const caretRight = `<svg viewBox="0 0 9 16" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.15" points="1.6,1.2 6.5,7.9 1.6,14.7"/></svg>`;
  if (kind === "prev") {
    return `<a class="project-nextprev-link" href="${href}">
      <span class="project-nextprev-caret">${caretLeft}</span>
      <span>${escapeHtml(neighbor.title)}</span>
    </a>`;
  }
  return `<a class="project-nextprev-link project-nextprev-link--next" href="${href}">
      <span>${escapeHtml(neighbor.title)}</span>
      <span class="project-nextprev-caret">${caretRight}</span>
    </a>`;
}

function renderProject(project, gallery) {
  const slides = mediaList(project, gallery);
  const { prev, next } = getNeighbors(project);
  const kicker = project.tags?.[0] || "";
  const facts = [
    project.location ? `LOCATION: ${project.location}` : "",
    project.client ? `CLIENT: ${project.client}` : "",
    project.started ? `DATE: ${project.started}` : "",
    project.completed || project.year
      ? `DATE OF COMPLETION: ${project.completed || project.year}`
      : "",
    project.value ? `CONTRACT VALUE: ${project.value}` : "",
    project.credit ? `PHOTOGRAPHY / IMAGE CREDIT: ${project.credit}` : "",
  ].filter(Boolean);

  const story = (project.paragraphs || []).filter(Boolean);
  const storyHtml = story.length
    ? story
        .map((p) => {
          if (p && typeof p === "object" && p.heading) {
            return `<h2 class="project-story-heading">${escapeHtml(p.heading)}</h2>`;
          }
          return `<p>${escapeHtml(p)}</p>`;
        })
        .join("")
    : project.excerpt
    ? `<p>${escapeHtml(project.excerpt)}</p>`
    : "";

  const slidesHtml = slides
    .map((slide, index) => {
      if (slide.type === "video") {
        return `<figure class="reel-item" data-index="${index}">
          <video controls playsinline preload="metadata" src="${encodeURI(slide.src)}" aria-label="Video of ${escapeHtml(project.title)}"></video>
        </figure>`;
      }
      return `<figure class="reel-item" data-index="${index}">
        <img src="${encodeURI(slide.src)}" alt="${escapeHtml(project.title)}" onerror="this.closest('figure').remove()">
      </figure>`;
    })
    .join("");

  root.innerHTML = `
    <article class="project-page">
      <section class="project-head">
        <h1>${escapeHtml(project.title)}</h1>
        ${kicker ? `<p class="project-kicker">${escapeHtml(kicker)}</p>` : ""}
        ${facts.length ? `<p class="project-facts">${facts.map(escapeHtml).join("<br>")}</p>` : ""}
      </section>

      <section class="project-reel" data-reel>
        ${
          slides.length > 1
            ? `<button class="reel-arrow reel-arrow--prev" type="button" data-prev aria-label="Previous photo">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.2" d="M15 5L8 12l7 7"/></svg>
              </button>`
            : ""
        }
        <div class="reel-viewport">
          <div class="reel-track" data-track>${slidesHtml}</div>
        </div>
        ${
          slides.length > 1
            ? `<button class="reel-arrow reel-arrow--next" type="button" data-next aria-label="Next photo">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.2" d="M9 5l7 7-7 7"/></svg>
              </button>`
            : ""
        }
      </section>

      <section class="project-intro">
        <div class="project-story">${storyHtml}</div>
      </section>
    </article>

    <nav class="project-nextprev" aria-label="Adjacent projects">
      ${neighborLink("prev", prev)}
      ${neighborLink("next", next)}
    </nav>
  `;

  bindReel(root);
}

function bindReel(root) {
  const reel = root.querySelector("[data-reel]");
  const track = root.querySelector("[data-track]");
  const viewport = reel?.querySelector(".reel-viewport");
  if (!reel || !track || !viewport) return;
  const originals = [...track.querySelectorAll(".reel-item")];
  if (!originals.length) return;

  const pauseVideos = () => {
    track.querySelectorAll("video").forEach((video) => video.pause());
  };

  const nodes = () => [...track.querySelectorAll(".reel-item")];

  if (originals.length > 1) {
    const firstClone = originals[0].cloneNode(true);
    const lastClone = originals[originals.length - 1].cloneNode(true);
    firstClone.dataset.clone = "first";
    lastClone.dataset.clone = "last";
    track.append(firstClone);
    track.prepend(lastClone);
  }

  let pos = originals.length > 1 ? 1 : 0;
  let moving = false;

  const align = () => {
    const item = nodes()[pos];
    if (!item) return;
    track.style.transform = `translateX(${-item.offsetLeft}px)`;
    nodes().forEach((el, i) => el.classList.toggle("is-active", i === pos));
  };

  const jumpTo = (nextPos) => {
    track.style.transition = "none";
    pos = nextPos;
    align();
    void track.offsetWidth;
    track.style.transition = "";
    moving = false;
  };

  const settle = () => {
    const item = nodes()[pos];
    if (item?.dataset.clone === "first") jumpTo(1);
    else if (item?.dataset.clone === "last") jumpTo(nodes().length - 2);
    else moving = false;
  };

  const go = (delta) => {
    if (originals.length < 2) return;
    if (moving) return;
    moving = true;
    pauseVideos();
    pos += delta;
    track.style.transition = "";
    align();
    restartTimer();
    window.setTimeout(settle, 500);
  };

  track.addEventListener("transitionend", (event) => {
    if (event.target !== track) return;
    if (event.propertyName && event.propertyName !== "transform") return;
    settle();
  });

  let timer = null;
  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
  const restartTimer = () => {
    stopTimer();
    if (originals.length < 2) return;
    timer = setInterval(() => {
      const video = nodes()[pos]?.querySelector("video");
      if (video && !video.paused && !video.ended) return;
      go(1);
    }, 4000);
  };

  reel.querySelector("[data-prev]")?.addEventListener("click", () => go(-1));
  reel.querySelector("[data-next]")?.addEventListener("click", () => go(1));
  track.addEventListener("click", (event) => {
    const item = event.target.closest(".reel-item");
    if (!item || item.dataset.clone) return;
    const nextPos = nodes().indexOf(item);
    if (nextPos < 0 || nextPos === pos) return;
    moving = false;
    pauseVideos();
    pos = nextPos;
    track.style.transition = "";
    align();
    restartTimer();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") go(-1);
    if (event.key === "ArrowRight") go(1);
  });
  reel.addEventListener("mouseenter", stopTimer);
  reel.addEventListener("mouseleave", restartTimer);

  let touchX = null;
  viewport.addEventListener("touchstart", (event) => {
    touchX = event.changedTouches[0]?.clientX ?? null;
  }, { passive: true });
  viewport.addEventListener("touchend", (event) => {
    if (touchX == null) return;
    const dx = (event.changedTouches[0]?.clientX ?? touchX) - touchX;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });

  const wait = originals.map((item) => {
    const media = item.querySelector("img, video");
    if (!media || media.tagName === "VIDEO") return Promise.resolve();
    if (media.complete) return Promise.resolve();
    return new Promise((resolve) => {
      media.addEventListener("load", resolve, { once: true });
      media.addEventListener("error", resolve, { once: true });
    });
  });
  Promise.all(wait).then(() => {
    jumpTo(pos);
    restartTimer();
  });
  window.addEventListener("resize", () => {
    track.style.transition = "none";
    align();
    void track.offsetWidth;
    track.style.transition = "";
  });
  jumpTo(pos);
}
