const imageFiles = [
  "blackcat.jpg",
  "IMG_1261.jpg",
  "IMG_1356.jpg",
  "IMG_1387.jpg",
  "IMG_1447.jpg",
  "IMG_2746.jpg",
  "IMG_2748.jpg",
  "IMG_2749.jpg",
  "IMG_2751.jpg",
  "IMG_2780.jpg",
  "IMG_2782.jpg",
  "IMG_2786.jpg",
  "IMG_3009.jpg",
  "IMG_3040.jpg",
  "IMG_3060.jpg",
  "IMG_3309.jpg",
  "IMG_3522.jpg",
  "IMG_3719.jpg",
  "IMG_3985.jpg",
  "IMG_3989.jpg",
  "IMG_4002.jpg",
  "IMG_4292.jpg",
  "IMG_4332.jpg",
  "IMG_7695.jpg",
  "IMG_7745.jpg",
  "IMG_9753.jpg",
  "IMG_9782.jpg",
  "IMG_9796.jpg",
  "IMG_9908.jpg",
  "IMG_9910.jpg",
  "kitten_eating_milk.jpg",
  "mix_terrier_closeup.jpg"
];

const basePath = "/img/";
const autoLoadLimit = 2;
const firstAutoChunk = 3;
const nextAutoChunk = 3;
const showMoreChunk = 5;

const loader = document.getElementById("loader");
const app = document.getElementById("galleryApp");
const gallery = document.getElementById("gallery");
const sentinel = document.getElementById("sentinel");
const moreWrap = document.getElementById("moreWrap");
const moreBtn = document.getElementById("moreBtn");

let backToTopBtn = null;
let columns = [];
let revealIndex = 0;
let autoLoadsUsed = 0;
let isAppending = false;
let galleryLightbox = null;

const imageCache = new Map();

function getColumnCount() {
  if (window.innerWidth <= 520) return 2;
  if (window.innerWidth <= 760) return 3;
  if (window.innerWidth <= 980) return 4;
  if (window.innerWidth <= 1280) return 5;
  if (window.innerWidth <= 1550) return 6;
  if (window.innerWidth <= 1800) return 7;
  return 8;
}

function getInitialCount() {
  const cols = getColumnCount();
  if (cols >= 7) return 7;
  if (cols >= 5) return 6;
  if (cols >= 3) return 5;
  return 4;
}

function buildColumns() {
  if (!gallery) return;

  gallery.innerHTML = "";
  columns = [];

  for (let i = 0; i < getColumnCount(); i += 1) {
    const col = document.createElement("div");
    col.className = "masonry-column";
    gallery.appendChild(col);
    columns.push(col);
  }
}

function shortestColumn() {
  return columns.reduce((shortest, current) => {
    return current.offsetHeight < shortest.offsetHeight ? current : shortest;
  }, columns[0]);
}

function loadImage(index) {
  if (imageCache.has(index)) {
    return imageCache.get(index);
  }

  const src = basePath + imageFiles[index];

  const promise = new Promise((resolve) => {
    const img = new Image();

    img.onload = () => resolve({ src });
    img.onerror = () => {
      console.warn("Missing image:", src);
      resolve(null);
    };

    img.src = src;
  });

  imageCache.set(index, promise);
  return promise;
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  {
    root: null,
    rootMargin: "0px 0px 12% 0px",
    threshold: 0.08
  }
);

function initLightbox() {
  if (typeof GLightbox !== "function") return;

  if (galleryLightbox) {
    galleryLightbox.destroy();
  }

  galleryLightbox = GLightbox({
    selector: ".gallery .glightbox",
    touchNavigation: true,
    loop: true,
    zoomable: false,
    draggable: true
  });
}

function createCard(src) {
  const card = document.createElement("a");
  card.className = "masonry-item glightbox";
  card.href = src;

  const img = document.createElement("img");
  img.src = src;
  img.alt = "Gallery image";
  img.loading = "lazy";
  img.decoding = "async";

  card.appendChild(img);
  revealObserver.observe(card);

  return card;
}

async function appendOne(index) {
  if (!columns.length || index >= imageFiles.length) return false;

  const item = await loadImage(index);
  if (!item) return false;

  const card = createCard(item.src);
  const targetColumn = shortestColumn();
  targetColumn.appendChild(card);

  return true;
}

function updateMoreButton() {
  const hasMore = revealIndex < imageFiles.length;
  const shouldShow = hasMore && autoLoadsUsed >= autoLoadLimit;
  moreWrap?.classList.toggle("is-hidden", !shouldShow);
}

async function appendChunk(count, delay = 90) {
  if (isAppending) return;
  if (revealIndex >= imageFiles.length) return;

  isAppending = true;
  if (moreBtn) moreBtn.disabled = true;

  const end = Math.min(revealIndex + count, imageFiles.length);

  for (let i = revealIndex; i < end; i += 1) {
    const appended = await appendOne(i);
    revealIndex = i + 1;

    if (appended) {
      initLightbox();

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  updateMoreButton();

  if (moreBtn) moreBtn.disabled = false;
  isAppending = false;
}

const autoObserver = new IntersectionObserver(
  async (entries) => {
    const entry = entries[0];
    if (!entry.isIntersecting) return;
    if (isAppending) return;
    if (revealIndex >= imageFiles.length) return;

    if (autoLoadsUsed >= autoLoadLimit) {
      updateMoreButton();
      return;
    }

    autoLoadsUsed += 1;

    if (autoLoadsUsed === 1) {
      await appendChunk(firstAutoChunk, 110);
    } else {
      await appendChunk(nextAutoChunk, 110);
    }

    updateMoreButton();
  },
  {
    root: null,
    rootMargin: "0px 0px 28% 0px",
    threshold: 0
  }
);

function createBackToTopButton() {
  backToTopBtn = document.createElement("button");
  backToTopBtn.className = "back-to-top";
  backToTopBtn.type = "button";
  backToTopBtn.setAttribute("aria-label", "Back to top");
  backToTopBtn.innerHTML = "⌃";

  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.body.appendChild(backToTopBtn);
}

function updateBackToTopVisibility() {
  if (!backToTopBtn) return;
  backToTopBtn.classList.toggle("is-visible", window.scrollY > 80);
}

moreBtn?.addEventListener("click", async () => {
  await appendChunk(showMoreChunk, 100);
  updateMoreButton();
});

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(async () => {
    const alreadyShown = revealIndex;

    buildColumns();
    revealIndex = 0;

    for (let i = 0; i < alreadyShown; i += 1) {
      await appendOne(i);
      revealIndex = i + 1;
    }

    initLightbox();
    updateMoreButton();
  }, 160);
});

window.addEventListener(
  "scroll",
  () => {
    updateBackToTopVisibility();
  },
  { passive: true }
);

(async function init() {
  if (!loader || !app || !gallery || !sentinel || !moreWrap || !moreBtn) {
    console.error("Gallery HTML elements are missing.");
    return;
  }

  createBackToTopButton();
  buildColumns();

  await appendChunk(getInitialCount(), 0);

  if (!revealIndex) {
    console.error("No gallery images loaded. Check /img/ paths and filenames.");
    return;
  }

  loader.classList.add("is-hidden");
  app.classList.remove("is-hidden");

  initLightbox();
  autoObserver.observe(sentinel);
  updateBackToTopVisibility();
  updateMoreButton();
})();
