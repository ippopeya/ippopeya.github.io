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
let lightbox = null;
let lightboxImage = null;
let lightboxClose = null;
let lightboxPrev = null;
let lightboxNext = null;

let columns = [];
let validItems = [];
let revealIndex = 0;
let autoLoadsUsed = 0;
let isAppending = false;
let lightboxIndex = 0;
let touchStartX = 0;

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

function openLightbox(index) {
  if (!lightbox || !lightboxImage || !validItems.length) return;

  lightboxIndex = index;
  updateLightboxImage();
  lightbox.classList.remove("is-hidden");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  if (!lightbox) return;

  lightbox.classList.add("is-hidden");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function updateLightboxImage() {
  const item = validItems[lightboxIndex];
  if (!item || !lightboxImage) return;
  lightboxImage.src = item.src;
}

function showNext() {
  if (!validItems.length) return;
  lightboxIndex = (lightboxIndex + 1) % validItems.length;
  updateLightboxImage();
}

function showPrev() {
  if (!validItems.length) return;
  lightboxIndex = (lightboxIndex - 1 + validItems.length) % validItems.length;
  updateLightboxImage();
}

function createLightbox() {
  lightbox = document.createElement("div");
  lightbox.className = "lightbox is-hidden";
  lightbox.setAttribute("aria-hidden", "true");

  lightboxClose = document.createElement("button");
  lightboxClose.className = "lightbox-close";
  lightboxClose.type = "button";
  lightboxClose.setAttribute("aria-label", "Close");
  lightboxClose.innerHTML = "×";

  lightboxPrev = document.createElement("button");
  lightboxPrev.className = "lightbox-nav lightbox-prev";
  lightboxPrev.type = "button";
  lightboxPrev.setAttribute("aria-label", "Previous");
  lightboxPrev.innerHTML = "‹";

  lightboxNext = document.createElement("button");
  lightboxNext.className = "lightbox-nav lightbox-next";
  lightboxNext.type = "button";
  lightboxNext.setAttribute("aria-label", "Next");
  lightboxNext.innerHTML = "›";

  const stage = document.createElement("div");
  stage.className = "lightbox-stage";

  lightboxImage = document.createElement("img");
  lightboxImage.className = "lightbox-image";
  lightboxImage.alt = "Gallery image";

  stage.appendChild(lightboxImage);
  lightbox.appendChild(lightboxClose);
  lightbox.appendChild(lightboxPrev);
  lightbox.appendChild(stage);
  lightbox.appendChild(lightboxNext);
  document.body.appendChild(lightbox);

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxNext.addEventListener("click", showNext);
  lightboxPrev.addEventListener("click", showPrev);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  window.addEventListener("keydown", (event) => {
    if (!lightbox || lightbox.classList.contains("is-hidden")) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowRight") showNext();
    if (event.key === "ArrowLeft") showPrev();
  });

  lightbox.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.changedTouches[0].clientX;
    },
    { passive: true }
  );

  lightbox.addEventListener(
    "touchend",
    (event) => {
      const delta = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) < 35) return;
      if (delta < 0) showNext();
      if (delta > 0) showPrev();
    },
    { passive: true }
  );
}

function createCard(item, index) {
  const card = document.createElement("a");
  card.className = "masonry-item";
  card.href = item.src;

  const img = document.createElement("img");
  img.src = item.src;
  img.alt = "Gallery image";
  img.loading = "lazy";
  img.decoding = "async";

  card.appendChild(img);

  card.addEventListener("click", (event) => {
    event.preventDefault();
    openLightbox(index);
  });

  revealObserver.observe(card);
  return card;
}

async function prepareItems() {
  const results = await Promise.allSettled(
    imageFiles.map((name) => preloadImage(basePath + name))
  );

  validItems = [];
  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      validItems.push(result.value);
    } else {
      console.warn("Missing image:", imageFiles[idx]);
    }
  });
}

function appendOne(index) {
  const item = validItems[index];
  if (!item || !columns.length) return;

  const card = createCard(item, index);
  const targetColumn = shortestColumn();
  targetColumn.appendChild(card);
}

async function appendChunk(count, delay = 90) {
  if (isAppending) return;
  if (revealIndex >= validItems.length) return;

  isAppending = true;
  if (moreBtn) moreBtn.disabled = true;

  const end = Math.min(revealIndex + count, validItems.length);

  for (let i = revealIndex; i < end; i += 1) {
    appendOne(i);
    revealIndex = i + 1;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  updateMoreButton();

  if (moreBtn) moreBtn.disabled = false;
  isAppending = false;
}

async function fillInitialViewport() {
  while (
    gallery &&
    gallery.getBoundingClientRect().height < window.innerHeight * initialFillFactor &&
    revealIndex < validItems.length
  ) {
    await appendChunk(2, 70);
  }
}

function updateMoreButton() {
  const hasMore = revealIndex < validItems.length;
  const showButton = hasMore && autoLoadsUsed >= autoLoadLimit;
  moreWrap?.classList.toggle("is-hidden", !showButton);
}

const autoObserver = new IntersectionObserver(
  async (entries) => {
    const entry = entries[0];
    if (!entry.isIntersecting) return;
    if (isAppending) return;
    if (revealIndex >= validItems.length) return;
    if (autoLoadsUsed >= autoLoadLimit) return;

    autoLoadsUsed += 1;
    await appendChunk(autoLoadsUsed === 1 ? firstAutoChunk : nextAutoChunk, 120);
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
  await appendChunk(showMoreChunk, 110);
});

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const alreadyShown = revealIndex;
    buildColumns();
    revealIndex = 0;

    for (let i = 0; i < alreadyShown; i += 1) {
      appendOne(i);
      revealIndex = i + 1;
    }

    updateMoreButton();
  }, 160);
});

window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });

(async function init() {
  if (!loader || !app || !gallery || !sentinel || !moreWrap || !moreBtn) {
    console.error("Gallery HTML elements are missing.");
    return;
  }

  createBackToTopButton();
  createLightbox();
  buildColumns();
  await prepareItems();

  if (!validItems.length) {
    console.error("No gallery images loaded. Check /img/ paths and filenames.");
    return;
  }

  await fillInitialViewport();

  loader.classList.add("is-hidden");
  app.classList.remove("is-hidden");

  buildColumns();
  revealIndex = 0;
  await fillInitialViewport();

  autoObserver.observe(sentinel);
  updateMoreButton();
  updateBackToTopVisibility();
})();
