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

/*
  Логика:
  - быстрый старт без preload всей галереи
  - ручные колонки для плавности
  - 2 автоподгрузки
  - потом Show more
  - стрелка наверх
*/

const autoLoadLimit = 2;
const firstAutoChunk = 3;
const nextAutoChunk = 3;
const showMoreChunk = 5;

const initialFillFactor = 1.02;
const revealDelayInitial = 45;
const revealDelayAuto = 80;
const revealDelayMore = 90;

const loader = document.getElementById("loader");
const app = document.getElementById("galleryApp");
const gallery = document.getElementById("gallery");
const sentinel = document.getElementById("sentinel");
const moreWrap = document.getElementById("moreWrap");
const moreBtn = document.getElementById("moreBtn");

let backToTopBtn = null;
let galleryLightbox = null;

let columns = [];
let revealIndex = 0;
let autoLoadsUsed = 0;
let isAppending = false;
let scrollTicking = false;
let resizeTimer = null;

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

function getInitialChunk() {
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
  if (imageCache.has(index)) return imageCache.get(index);

  const src = basePath + imageFiles[index];

  const promise = new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        src,
        width: img.naturalWidth,
        height: img.naturalHeight
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
      selector: ".gallery .glightbox",
      touchNavigation: true,
      loop: true,
      zoomable: false,
      draggable: true
    });
  } else {
    galleryLightbox.reload();
  }
}

function createCard(item, index) {
  const card = document.createElement("a");
  card.className = "masonry-item glightbox";
  card.href = item.src;
  card.dataset.index = String(index);

  const img = document.createElement("img");
  img.src = item.src;
  img.alt = "Gallery image";
  img.loading = "lazy";
  img.decoding = "async";

  card.appendChild(img);
  revealObserver.observe(card);

  return card;
}

function updateMoreButton() {
  if (!moreWrap) return;

  const hasMore = revealIndex < imageFiles.length;
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
  backToTopBtn.classList.toggle("is-visible", window.scrollY > 80);
}

async function appendOne(index) {
  if (index >= imageFiles.length || !columns.length) return false;

  const item = await loadImage(index);
  if (!item) return false;

  const card = createCard(item, index);
  const targetColumn = shortestColumn();
  targetColumn.appendChild(card);

  return true;
}

async function appendChunk(count, delay) {
  if (isAppending) return;
  if (revealIndex >= imageFiles.length) {
    updateMoreButton();
    return;
  }

  isAppending = true;

  if (moreBtn) {
    moreBtn.disabled = true;
  }

  const end = Math.min(revealIndex + count, imageFiles.length);

  for (let i = revealIndex; i < end; i += 1) {
    const added = await appendOne(i);
    revealIndex = i + 1;

    if (added && delay > 0) {
      await wait(delay);
    }
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
    revealIndex < imageFiles.length
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
  return scrollBottom >= docHeight - 260;
}

async function tryAutoLoad() {
  if (isAppending) return;
  if (revealIndex >= imageFiles.length) {
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

function onScroll() {
  if (scrollTicking) return;

  scrollTicking = true;

  requestAnimationFrame(async () => {
    scrollTicking = false;
    updateBackToTopVisibility();
    await tryAutoLoad();
  });
}

function rebuildShownItems() {
  const alreadyShown = revealIndex;

  buildColumns();
  revealIndex = 0;

  const rebuild = async () => {
    for (let i = 0; i < alreadyShown; i += 1) {
      const item = await loadImage(i);
      if (!item) {
        revealIndex = i + 1;
        continue;
      }

      const card = createCard(item, i);
      card.classList.add("is-visible");

      const targetColumn = shortestColumn();
      targetColumn.appendChild(card);

      revealObserver.unobserve(card);
      revealIndex = i + 1;
    }

    initLightbox();
    updateMoreButton();
  };

  rebuild();
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

  resizeTimer = setTimeout(() => {
    rebuildShownItems();
  }, 160);
});

(async function init() {
  if (!loader || !app || !gallery) {
    console.error("Gallery elements missing");
    return;
  }

  createBackToTopButton();
  buildColumns();
  updateMoreButton();

  loader.classList.add("is-hidden");
  app.classList.remove("is-hidden");

  await appendChunk(getInitialChunk(), revealDelayInitial);
  await fillInitialViewport();

  initLightbox();
  updateBackToTopVisibility();

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

  await tryAutoLoad();
  updateMoreButton();
})();
