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
const firstAutoChunk = 6;
const nextAutoChunk = 6;
const showMoreChunk = 8;

const loader = document.getElementById("loader");
const app = document.getElementById("galleryApp");
const gallery = document.getElementById("gallery");
const sentinel = document.getElementById("sentinel");
const moreWrap = document.getElementById("moreWrap");
const moreBtn = document.getElementById("moreBtn");

let revealIndex = 0;
let autoLoadsUsed = 0;
let isAppending = false;
let lightbox = null;

// ---------- HELPERS ----------

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
  return cols >= 6 ? 10 : cols >= 4 ? 8 : 6;
}

function createCard(src) {
  const card = document.createElement("a");
  card.className = "masonry-item glightbox";
  card.href = src;

  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";

  card.appendChild(img);

  requestAnimationFrame(() => {
    card.classList.add("is-visible");
  });

  return card;
}

// ---------- LIGHTBOX ----------

function initLightbox() {
  if (typeof GLightbox !== "function") return;

  if (!lightbox) {
    lightbox = GLightbox({
      selector: ".gallery .glightbox",
      touchNavigation: true,
      loop: true,
      zoomable: false
    });
  } else {
    lightbox.reload(); // вместо destroy()
  }
}

// ---------- RENDER ----------

async function appendChunk(count) {
  if (isAppending) return;
  if (revealIndex >= imageFiles.length) return;

  isAppending = true;
  moreBtn.disabled = true;

  const fragment = document.createDocumentFragment();

  const end = Math.min(revealIndex + count, imageFiles.length);

  for (let i = revealIndex; i < end; i++) {
    const src = basePath + imageFiles[i];
    const card = createCard(src);
    fragment.appendChild(card);
  }

  gallery.appendChild(fragment);

  revealIndex = end;

  initLightbox();
  updateMoreButton();

  moreBtn.disabled = false;
  isAppending = false;
}

// ---------- BUTTON ----------

function updateMoreButton() {
  const hasMore = revealIndex < imageFiles.length;

  if (!hasMore) {
    moreWrap.classList.add("is-hidden");
    return;
  }

  if (autoLoadsUsed >= autoLoadLimit) {
    moreWrap.classList.remove("is-hidden");
  } else {
    moreWrap.classList.add("is-hidden");
  }
}

// ---------- AUTO LOAD ----------

const observer = new IntersectionObserver(async (entries) => {
  const entry = entries[0];

  if (!entry.isIntersecting) return;
  if (isAppending) return;
  if (revealIndex >= imageFiles.length) return;

  if (autoLoadsUsed >= autoLoadLimit) {
    observer.unobserve(sentinel); // ВАЖНО: останавливаем авто
    updateMoreButton();
    return;
  }

  autoLoadsUsed++;

  if (autoLoadsUsed === 1) {
    await appendChunk(firstAutoChunk);
  } else {
    await appendChunk(nextAutoChunk);
  }

}, {
  rootMargin: "0px 0px 40% 0px"
});

// ---------- EVENTS ----------

moreBtn.addEventListener("click", async () => {
  await appendChunk(showMoreChunk);
});

// ---------- INIT ----------

(async function init() {
  await appendChunk(getInitialCount());

  loader.classList.add("is-hidden");
  app.classList.remove("is-hidden");

  initLightbox();

  observer.observe(sentinel);
})();
