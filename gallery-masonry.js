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
const revealDelay = 85;

const loader = document.getElementById("loader");
const app = document.getElementById("galleryApp");
const gallery = document.getElementById("gallery");
const moreWrap = document.getElementById("moreWrap");
const moreBtn = document.getElementById("moreBtn");

let revealIndex = 0;
let autoLoadsUsed = 0;
let isAppending = false;
let galleryLightbox = null;
let scrollTicking = false;

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

  if (cols >= 7) return 8;
  if (cols >= 5) return 7;
  if (cols >= 3) return 6;
  return 4;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    rootMargin: "0px 0px 14% 0px",
    threshold: 0.06
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

function maybeShowAllVisibleCards() {
  const cards = gallery.querySelectorAll(".masonry-item:not(.is-visible)");
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    if (rect.top < window.innerHeight * 1.05) {
      card.classList.add("is-visible");
      revealObserver.unobserve(card);
    }
  });
}

async function appendChunk(count, delay = revealDelay) {
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

    if (ok) {
      requestAnimationFrame(() => {
        maybeShowAllVisibleCards();
      });

      if (delay > 0) {
        await wait(delay);
      }
    }
  }

  initLightbox();

  if (moreBtn) {
    moreBtn.disabled = false;
  }

  isAppending = false;

  updateMoreButton();
  maybeShowAllVisibleCards();
}

function isNearBottom() {
  const scrollBottom = window.scrollY + window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;
  return scrollBottom >= docHeight - 260;
}

async function handleAutoLoad() {
  if (isAppending) return;
  if (revealIndex >= imageFiles.length) {
    updateMoreButton();
    return;
  }

  if (!isNearBottom()) return;

  if (autoLoadsUsed >= autoLoadLimit) {
    updateMoreButton();
    return;
  }

  autoLoadsUsed++;

  if (autoLoadsUsed === 1) {
    await appendChunk(firstAutoChunk, revealDelay);
  } else {
    await appendChunk(nextAutoChunk, revealDelay);
  }

  updateMoreButton();
}

function onScroll() {
  if (!scrollTicking) {
    scrollTicking = true;

    requestAnimationFrame(async () => {
      scrollTicking = false;
      toggleBackToTop();
      maybeShowAllVisibleCards();
      await handleAutoLoad();
    });
  }
}

function onResize() {
  maybeShowAllVisibleCards();
}

function createBackToTopButton() {
  if (document.querySelector(".back-to-top")) return;

  const btn = document.createElement("button");
  btn.className = "back-to-top";
  btn.type = "button";
  btn.setAttribute("aria-label", "Back to top");
  btn.innerHTML = "↑";

  btn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  document.body.appendChild(btn);
}

function toggleBackToTop() {
  const btn = document.querySelector(".back-to-top");
  if (!btn) return;

  if (window.scrollY > 700) {
    btn.classList.add("is-visible");
  } else {
    btn.classList.remove("is-visible");
  }
}

if (moreBtn) {
  moreBtn.addEventListener("click", async () => {
    await appendChunk(showMoreChunk, revealDelay);
    updateMoreButton();
  });
}

(async function init() {
  if (!loader || !app || !gallery) {
    console.error("Gallery elements missing");
    return;
  }

  createBackToTopButton();
  updateMoreButton();

  loader.classList.add("is-hidden");
  app.classList.remove("is-hidden");

  await appendChunk(getInitialCount(), 0);

  initLightbox();
  maybeShowAllVisibleCards();
  toggleBackToTop();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });

  requestAnimationFrame(() => {
    maybeShowAllVisibleCards();
    handleAutoLoad();
  });

  setTimeout(() => {
    maybeShowAllVisibleCards();
    handleAutoLoad();
  }, 250);
})();
