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

function loadImage(index) {
  if (imageCache.has(index)) return imageCache.get(index);

  const src = basePath + imageFiles[index];

  const promise = new Promise((resolve) => {
    const img = new Image();

    img.onload = () => resolve(src);
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
  if (!gallery || index >= imageFiles.length) return false;

  const src = await loadImage(index);
  if (!src) return false;

  const card = createCard(src);
  gallery.appendChild(card);

  return true;
}

function updateMoreButton() {
  if (!moreWrap) return;

  const hasMore = revealIndex < imageFiles.length;
  const shouldShow = hasMore && autoLoadsUsed >= autoLoadLimit;

  moreWrap.classList.toggle("is-hidden", !shouldShow);
}

async function appendChunk(count, delay = 80) {
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

  for (let i = revealIndex; i < end; i++) {
    const ok = await appendOne(i);
    revealIndex = i + 1;

    if (ok && delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  initLightbox();

  if (moreBtn) {
    moreBtn.disabled = false;
  }

  isAppending = false;
  updateMoreButton();
}

const autoObserver = new IntersectionObserver(
  async (entries) => {
    const entry = entries[0];
    if (!entry || !entry.isIntersecting) return;
    if (isAppending) return;
    if (revealIndex >= imageFiles.length) {
      updateMoreButton();
      autoObserver.unobserve(sentinel);
      return;
    }

    if (autoLoadsUsed >= autoLoadLimit) {
      updateMoreButton();
      autoObserver.unobserve(sentinel);
      return;
    }

    autoLoadsUsed++;

    if (autoLoadsUsed === 1) {
      await appendChunk(firstAutoChunk, 80);
    } else {
      await appendChunk(nextAutoChunk, 80);
    }

    updateMoreButton();

    if (autoLoadsUsed >= autoLoadLimit && sentinel) {
      autoObserver.unobserve(sentinel);
      requestAnimationFrame(() => {
        updateMoreButton();
      });
    }
  },
  {
    root: null,
    rootMargin: "0px 0px 35% 0px",
    threshold: 0
  }
);

if (moreBtn) {
  moreBtn.addEventListener("click", async () => {
    await appendChunk(showMoreChunk, 80);
    updateMoreButton();
  });
}

(async function init() {
  if (!loader || !app || !gallery) {
    console.error("Gallery elements missing");
    return;
  }

  updateMoreButton();

  await appendChunk(getInitialCount(), 0);

  loader.classList.add("is-hidden");
  app.classList.remove("is-hidden");

  initLightbox();

  if (sentinel) {
    autoObserver.observe(sentinel);
  }

  requestAnimationFrame(() => {
    updateMoreButton();
  });

  setTimeout(() => {
    updateMoreButton();
  }, 120);
})();
