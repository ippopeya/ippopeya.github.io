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
const firstAutoChunk = 4;
const nextAutoChunk = 4;
const showMoreChunk = 6;

const initialFillFactor = 1.02;
const firstPaintCount = 6;

const revealDelayInitial = 55;
const revealDelayAuto = 110;
const revealDelayMore = 125;

const flipDuration = 1150;
const resizeDebounce = 110;

const loader = document.getElementById("loader");
const app = document.getElementById("galleryApp");
const gallery = document.getElementById("gallery");
const sentinel = document.getElementById("sentinel");
const moreWrap = document.getElementById("moreWrap");
const moreBtn = document.getElementById("moreBtn");

let backToTopBtn = null;
let galleryLightbox = null;
const lightboxElements = imageFiles.map((file) => ({
  href: basePath + file,
  type: "image"
}));

let columns = [];
let shownItems = [];
let nextIndex = 0;
let autoLoadsUsed = 0;
let isAppending = false;
let scrollTicking = false;
let resizeTimer = null;
let lastColumnCount = 0;
let initialSeedIndex = 0;

const imageCache = new Map();

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  if (cols >= 7) return 8;
  if (cols >= 5) return 7;
  if (cols >= 3) return 6;
  return 4;
}

function createColumns(count) {
  const newColumns = [];

  for (let i = 0; i < count; i += 1) {
    const col = document.createElement("div");
    col.className = "masonry-column";
    newColumns.push(col);
  }

  return newColumns;
}

function setColumns(newColumns) {
  columns = newColumns;
  gallery.replaceChildren(...newColumns);
  lastColumnCount = newColumns.length;
  initialSeedIndex = 0;
}

function getShortestColumn() {
  return columns.reduce((shortest, current) => {
    return current.offsetHeight < shortest.offsetHeight ? current : shortest;
  }, columns[0]);
}

function getColumnGap() {
  if (window.innerWidth <= 520) return 5;
  if (window.innerWidth <= 760) return 6;
  if (window.innerWidth <= 1280) return 7;
  return 8;
}

function getEstimatedColumnWidth(columnCount) {
  const gap = getColumnGap();
  const totalGap = gap * (columnCount - 1);
  return (gallery.clientWidth - totalGap) / columnCount;
}

function getShortestColumnByHeights(heights) {
  let targetIndex = 0;

  for (let i = 1; i < heights.length; i += 1) {
    if (heights[i] < heights[targetIndex]) {
      targetIndex = i;
    }
  }

  return targetIndex;
}

function loadImageMeta(index) {
  if (imageCache.has(index)) return imageCache.get(index);

  const src = basePath + imageFiles[index];

  const promise = new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        index,
        src,
        width: img.naturalWidth,
        height: img.naturalHeight,
        ratio: img.naturalWidth / img.naturalHeight
      });
    };

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

  if (!galleryLightbox) {
    galleryLightbox = GLightbox({
      elements: lightboxElements,
      touchNavigation: true,
      loop: true,
      zoomable: false,
      draggable: true,
      openEffect: "none",
      closeEffect: "none",
      slideEffect: "slide"
    });
  }
}

function createCard(meta) {
  const card = document.createElement("a");
  card.className = "masonry-item";
  card.href = meta.src;
  card.dataset.index = String(meta.index);

  const img = document.createElement("img");
  img.src = meta.src;
  img.alt = "Gallery image";
  img.loading = "lazy";
  img.decoding = "async";

  card.appendChild(img);

  card.addEventListener("click", (event) => {
    event.preventDefault();

    if (!galleryLightbox) {
      initLightbox();
    }

    if (galleryLightbox) {
      galleryLightbox.openAt(meta.index);
    }
  });

  revealObserver.observe(card);

  return card;
}

function updateMoreButton() {
  if (!moreWrap) return;

  const hasMore = nextIndex < imageFiles.length;
  const shouldShow = hasMore && autoLoadsUsed >= autoLoadLimit;

  moreWrap.classList.toggle("is-hidden", !shouldShow);
}

function createBackToTopButton() {
  const existing = document.querySelector(".back-to-top");

  if (existing) {
    backToTopBtn = existing;
    return;
  }

  backToTopBtn = document.createElement("button");
  backToTopBtn.className = "back-to-top";
  backToTopBtn.type = "button";
  backToTopBtn.setAttribute("aria-label", "Back to top");
  backToTopBtn.innerHTML = "⌃";

  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  document.body.appendChild(backToTopBtn);
}

function updateBackToTopVisibility() {
  if (!backToTopBtn) return;

  const isMobile = window.innerWidth <= 760;

  if (isMobile) {
    backToTopBtn.classList.toggle("is-visible", window.scrollY > 520);
    return;
  }

  backToTopBtn.classList.toggle("is-visible", window.scrollY > 220);
}

async function appendChunk(count, delay) {
  if (isAppending) return;
  if (nextIndex >= imageFiles.length) {
    updateMoreButton();
    return;
  }

  isAppending = true;

  if (moreBtn) {
    moreBtn.disabled = true;
  }

  const end = Math.min(nextIndex + count, imageFiles.length);
  const indices = [];

  for (let i = nextIndex; i < end; i += 1) {
    indices.push(i);
  }

  const metas = await Promise.all(indices.map(loadImageMeta));
  const validMetas = metas.filter(Boolean);

const estimatedColumnWidth = getEstimatedColumnWidth(columns.length);
const estimatedHeights = columns.map((col) => col.offsetHeight);

for (const meta of validMetas) {
  nextIndex += 1;

  const card = createCard(meta);
  const item = { meta, card };
  shownItems.push(item);

  let targetIndex;

  if (initialSeedIndex < columns.length) {
    targetIndex = initialSeedIndex;
    initialSeedIndex += 1;
  } else {
    targetIndex = getShortestColumnByHeights(estimatedHeights);
  }

  columns[targetIndex].appendChild(card);

  const estimatedHeight = estimatedColumnWidth / meta.ratio;
  estimatedHeights[targetIndex] += estimatedHeight + getColumnGap();

  if (delay > 0) {
    await wait(delay);
  }
}

  const failedCount = metas.length - validMetas.length;
  if (failedCount > 0) {
    nextIndex += failedCount;
  }

  initLightbox();
  updateMoreButton();

  if (moreBtn) {
    moreBtn.disabled = false;
  }

  isAppending = false;
}

async function fillInitialViewport() {
  while (
    gallery &&
    gallery.getBoundingClientRect().height < window.innerHeight * initialFillFactor &&
    nextIndex < imageFiles.length
  ) {
    await appendChunk(2, revealDelayInitial);
  }
}

function canScrollPage() {
  return document.documentElement.scrollHeight > window.innerHeight + 40;
}

function isNearBottom() {
  const scrollBottom = window.scrollY + window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;
  const preloadOffset = Math.max(520, window.innerHeight * 0.68);

  return scrollBottom >= docHeight - preloadOffset;
}

async function tryAutoLoad() {
  if (isAppending) return;
  if (nextIndex >= imageFiles.length) {
    updateMoreButton();
    return;
  }

  if (autoLoadsUsed >= autoLoadLimit) {
    updateMoreButton();
    return;
  }

  if (!isNearBottom() && canScrollPage()) return;

  autoLoadsUsed += 1;

  if (autoLoadsUsed === 1) {
    await appendChunk(firstAutoChunk, revealDelayAuto);
  } else {
    await appendChunk(nextAutoChunk, revealDelayAuto);
  }

  updateMoreButton();

  if (!canScrollPage() && autoLoadsUsed < autoLoadLimit) {
    await tryAutoLoad();
  }
}

function getEstimatedColumnWidth(columnCount) {
  const gap = getColumnGap();
  const totalGap = gap * (columnCount - 1);
  return (gallery.clientWidth - totalGap) / columnCount;
}

function distributeItemsToColumns(targetColumns) {
  const estimatedHeights = new Array(targetColumns.length).fill(0);
  const columnWidth = getEstimatedColumnWidth(targetColumns.length);
  const gap = getColumnGap();

  shownItems.forEach((item) => {
    let targetIndex = 0;

    for (let i = 1; i < estimatedHeights.length; i += 1) {
      if (estimatedHeights[i] < estimatedHeights[targetIndex]) {
        targetIndex = i;
      }
    }

    targetColumns[targetIndex].appendChild(item.card);

    const estimatedHeight = columnWidth / item.meta.ratio;
    estimatedHeights[targetIndex] += estimatedHeight + gap;
  });
}

function relayoutWithFlip() {
  if (!gallery || !shownItems.length) return;

  const newColumnCount = getColumnCount();
  if (newColumnCount === lastColumnCount) return;

  const oldRects = new Map();
  const oldVisible = new Set();

  shownItems.forEach((item) => {
    if (item.card.classList.contains("is-visible")) {
      oldRects.set(item.meta.index, item.card.getBoundingClientRect());
      oldVisible.add(item.meta.index);
    }
  });

  const oldHeight = gallery.getBoundingClientRect().height;
  gallery.style.minHeight = `${oldHeight}px`;

  const newColumns = createColumns(newColumnCount);
  setColumns(newColumns);
  distributeItemsToColumns(newColumns);

  const animatedCards = [];

  shownItems.forEach((item) => {
    if (!oldVisible.has(item.meta.index)) return;

    const oldRect = oldRects.get(item.meta.index);
    const newRect = item.card.getBoundingClientRect();

    if (!oldRect || !newRect.width || !newRect.height) return;

    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top - newRect.top;
    const sx = oldRect.width / newRect.width;
    const sy = oldRect.height / newRect.height;

    if (
      Math.abs(dx) < 0.5 &&
      Math.abs(dy) < 0.5 &&
      Math.abs(sx - 1) < 0.01 &&
      Math.abs(sy - 1) < 0.01
    ) {
      return;
    }

    item.card.classList.add("is-flipping");
    item.card.style.transition = "none";
    item.card.style.transformOrigin = "top left";
    item.card.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;

    animatedCards.push(item.card);
  });

  void gallery.offsetHeight;

  requestAnimationFrame(() => {
    animatedCards.forEach((card) => {
      card.style.transition = `transform ${flipDuration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      card.style.transform = "translate(0, 0) scale(1, 1)";
    });

    window.setTimeout(() => {
      animatedCards.forEach((card) => {
        card.classList.remove("is-flipping");
        card.style.transition = "";
        card.style.transform = "";
        card.style.transformOrigin = "";
      });

      gallery.style.minHeight = "";
    }, flipDuration + 40);
  });
}

function onScroll() {
  if (scrollTicking) return;

  scrollTicking = true;

  requestAnimationFrame(async () => {
    scrollTicking = false;
    updateBackToTopVisibility();
    await tryAutoLoad();
  });
}

if (moreBtn) {
  moreBtn.addEventListener("click", async () => {
    await appendChunk(showMoreChunk, revealDelayMore);
    updateMoreButton();
  });
}

window.addEventListener("scroll", onScroll, { passive: true });

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = window.setTimeout(() => {
    const newColumnCount = getColumnCount();
    if (newColumnCount !== lastColumnCount) {
      relayoutWithFlip();
    }
  }, resizeDebounce);
});

(async function init() {
  if (!loader || !app || !gallery || !moreWrap || !moreBtn) {
    console.error("Gallery elements missing");
    return;
  }

  createBackToTopButton();
  setColumns(createColumns(getColumnCount()));
  updateMoreButton();

  await appendChunk(Math.min(firstPaintCount, getInitialCount()), 0);

  loader.classList.add("is-hidden");
  app.classList.remove("is-hidden");

  initLightbox();
  updateBackToTopVisibility();

  await fillInitialViewport();
  await tryAutoLoad();
  updateMoreButton();

  if (sentinel) {
    const sentinelObserver = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) return;
        await tryAutoLoad();
      },
      {
        root: null,
        rootMargin: "0px 0px 28% 0px",
        threshold: 0
      }
    );

    sentinelObserver.observe(sentinel);
  }
})();
