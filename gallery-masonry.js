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
const initialFillFactor = 1.02;
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

const itemPromiseCache = new Map();
const loadedItems = [];

function getColumnCount() {
  if (window.innerWidth <= 520) return 2;
  if (window.innerWidth <= 760) return 3;
  if (window.innerWidth <= 980) return 4;
  if (window.innerWidth <= 1280) return 5;
  if (window.innerWidth <= 1550) return 6;
  if (window.innerWidth <= 1800) return 7;
  return 8;
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

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        src,
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    img.onerror = () => reject(src);
    img.src = src;
  });
}

function getItem(index) {
  if (itemPromiseCache.has(index)) {
    return itemPromiseCache.get(index);
  }

  const promise = preloadImage(basePath + imageFiles[index])
    .then((item) => {
      loadedItems[index] = item;
      return item;
    })
    .catch((src) => {
      console.warn("Missing image:", imageFiles[index], src);
      return null;
    });

  itemPromiseCache.set(index, promise);
  return promise;
}

function preloadAhead(fromIndex, count = 6) {
  const end = Math.min(fromIndex + count, imageFiles.length);
  for (let i = fromIndex; i < end; i += 1) {
    getItem(i);
  }
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

function createCard(item) {
  const card = document.createElement("a");
  card.className = "masonry-item glightbox";
  card.href = item.src;

  const img = document.createElement("img");
  img.src = item.src;
  img.alt = "Gallery image";
  img.loading = "lazy";
  img.decoding = "async";

  card.appendChild(img);
  revealObserver.observe(card);

  return card;
}

async function appendOne(index) {
  if (!columns.length || index >= imageFiles.length) return false;

  const item = await getItem(index);
  if (!item) return false;

  const card = createCard(item);
  const targetColumn = shortestColumn();
  targetColumn.appendChild(card);
  return true;
}

function updateMoreButton(forceShow = false) {
  const hasMore = revealIndex < imageFiles.length;
  const shouldShow = hasMore && (forceShow || autoLoadsUsed >= autoLoadLimit);
  moreWrap?.classList.toggle("is-hidden", !shouldShow);
}

function refreshButtonImmediatelyIfNeeded() {
  if (!sentinel || !moreWrap) return;

  const hasMore = revealIndex < imageFiles.length;
  if (!hasMore) {
    updateMoreButton(false);
    return;
  }

  if (autoLoadsUsed < autoLoadLimit) {
    updateMoreButton(false);
    return;
  }

  updateMoreButton(true);
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
      preloadAhead(revealIndex, 6);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  refreshButtonImmediatelyIfNeeded();

  if (moreBtn) moreBtn.disabled = false;
  isAppending = false;
}

async function fillInitialViewport() {
  while (
    gallery &&
    gallery.getBoundingClientRect().height < window.innerHeight * initialFillFactor &&
    revealIndex < imageFiles.length
  ) {
    await appendChunk(2, 60);
  }
}

const autoObserver = new IntersectionObserver(
  async (entries) => {
    const entry = entries[0];
    if (!entry.isIntersecting) return;
    if (isAppending) return;
    if (revealIndex >= imageFiles.length) return;

    if (autoLoadsUsed >= autoLoadLimit) {
      refreshButtonImmediatelyIfNeeded();
      return;
    }

    autoLoadsUsed += 1;
    await appendChunk(autoLoadsUsed === 1 ? firstAutoChunk : nextAutoChunk, 110);
    refreshButtonImmediatelyIfNeeded();
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
  refreshButtonImmediatelyIfNeeded();
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
    refreshButtonImmediatelyIfNeeded();
  }, 160);
});

window.addEventListener("scroll", () => {
  updateBackToTopVisibility();
  refreshButtonImmediatelyIfNeeded();
}, { passive: true });

(async function init() {
  if (!loader || !app || !gallery || !sentinel || !moreWrap || !moreBtn) {
    console.error("Gallery HTML elements are missing.");
    return;
  }

  createBackToTopButton();
  buildColumns();

  preloadAhead(0, 10);
  await fillInitialViewport();

  if (!revealIndex) {
    console.error("No gallery images loaded. Check /img/ paths and filenames.");
    return;
  }

  loader.classList.add("is-hidden");
  app.classList.remove("is-hidden");

  buildColumns();
  const initialShown = revealIndex;
  revealIndex = 0;

  for (let i = 0; i < initialShown; i += 1) {
    await appendOne(i);
    revealIndex = i + 1;
  }

  initLightbox();
  autoObserver.observe(sentinel);
  updateBackToTopVisibility();
  refreshButtonImmediatelyIfNeeded();
  preloadAhead(revealIndex, 10);
})();

window.addEventListener("load", () => {
  refreshButtonImmediatelyIfNeeded();
});
