/* =========================================================
   HeriLand — app.js (Home render + Place Modal)
   ========================================================= */
(async () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- helpers ----------
  async function loadJSON(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`[loadJSON] ${path}`, err);
      return null;
    }
  }
  const $ = sel => document.querySelector(sel);

  // Cache
  const store = {
    merchants: new Map(),
    loadedDivisions: new Set()
  };

  // ---------- Divisions ----------
  async function renderDivisions() {
  const grid = document.getElementById("divisionGrid");
  if (!grid) return;
  const data = await loadJSON("data/cities.json");
  if (!data?.divisions) return;

  const palette = [
    "#2E5E4E","#E4C77D","#C74B2A","#1A1A1A","#3F826D","#FFB703","#219EBC","#8E9AAF",
    "#5C946E","#F25C54","#5F0F40","#9A031E"
  ];
  grid.innerHTML = "";
  data.divisions.forEach((div, idx) => {
    const card = document.createElement("button");
    card.className = "division-card";
    card.style.setProperty("--tile", palette[idx % palette.length]);
    card.innerHTML = `
      <span class="tile" aria-hidden="true"></span>
      <span class="label">${div.name_en.replace(" Division","")}</span>
    `;
    card.addEventListener("click", () => { window.location.hash = `#/d/${div.id}`; });
    grid.appendChild(card);
  });
}

  // ---------- Top Picks ----------
  async function ensureDivisionLoaded(divisionId) {
    if (store.loadedDivisions.has(divisionId)) return;
    const data = await loadJSON(`data/merchants/${divisionId}.json`);
    if (!data?.items) return;
    data.items.forEach(m => store.merchants.set(m.id, m));
    store.loadedDivisions.add(divisionId);
  }

  async function renderTopPicks() {
    const grid = document.getElementById("topPicksGrid");
    if (!grid) return;
    await ensureDivisionLoaded("kuching");
    const featured = [...store.merchants.values()].filter(m => m.featured);

    grid.innerHTML = "";
    featured.forEach(m => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <div class="thumb" style="background:url('${m.cover}') center/cover"></div>
        <div class="body">
          <h3>${m.name}</h3>
          <div class="meta">
            <span>⭐ ${m.rating ?? "-"}</span>
            <span>${"💲".repeat(m.priceLevel || 0)}</span>
          </div>
          <p class="muted">${m.description ?? ""}</p>
        </div>
      `;
      card.addEventListener("click", () => openPlaceModal(m.id));
      grid.appendChild(card);
    });
  }

  // ---------- Place Modal ----------
  const modal = $("#placeModal");
  const modalCloseBtn = $("#modalClose");
  let lastFocusedEl = null;

  async function findMerchantById(id) {
    if (!store.merchants.has(id)) {
      await ensureDivisionLoaded("kuching");
    }
    return store.merchants.get(id) || null;
  }

  function fillOrHide(el, content, prefix = "") {
    if (!el) return;
    if (!content) {
      el.textContent = "";
      el.hidden = true;
    } else {
      el.hidden = false;
      el.textContent = prefix ? `${prefix} ${content}` : content;
    }
  }

  function setAction(el, hrefOrNull, label) {
    if (!el) return;
    if (!hrefOrNull) {
      el.setAttribute("disabled", "true");
      el.removeAttribute("href");
      el.title = "";
    } else {
      el.removeAttribute("disabled");
      el.href = hrefOrNull;
      el.title = label || "";
    }
  }

  function buildMapLink(loc, address) {
    if (loc?.lat && loc?.lng) return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
    if (address) return `https://www.google.com/maps?q=${encodeURIComponent(address)}`;
    return null;
  }

  async function openPlaceModal(id) {
  const m = await findMerchantById(id);
  if (!m) return;

  lastFocusedEl = document.activeElement;

  // 填資料（同你原本）
  const gallery = $("#modalGallery");
  gallery.innerHTML = "";
  const pics = (m.images && m.images.length ? m.images : [m.cover]).filter(Boolean);
  pics.forEach(src => {
    const img = new Image();
    img.src = src;
    img.alt = m.name;
    gallery.appendChild(img);
  });
  $("#placeTitle").textContent = m.name;
  $("#placeMeta").innerHTML = `
    ${m.rating ? `<span>⭐ ${m.rating}</span>` : ""}
    ${m.priceLevel ? `<span>${"💲".repeat(m.priceLevel)}</span>` : ""}
  `;
  $("#placeDesc").textContent = m.description || "";
  fillOrHide($("#infoAddress"), m.address, "📍");
  fillOrHide($("#infoHours"), m.openHours, "⏰");
  setAction($("#actCall"), m.phone ? `tel:${m.phone}` : null, "Call");
  setAction($("#actWA"), m.whatsapp ? `https://wa.me/${m.whatsapp.replace(/\D/g,'')}` : null, "WhatsApp");
  setAction($("#actWeb"), m.website || null, "Website");
  setAction($("#actMap"), buildMapLink(m.location, m.address), "Map");
  $("#actShare").onclick = async () => {
    const shareUrl = `${location.origin}${location.pathname}#/p/${m.id}`;
    if (navigator.share) { try { await navigator.share({ title: m.name, text: m.description || "", url: shareUrl }); } catch{} }
    else { await navigator.clipboard?.writeText(shareUrl); alert("Link copied."); }
  };
  $("#actFav").onclick = () => toggleFavorite(m.id);
  updateFavButton(m.id);

  // 開啟：先顯示元素，再下一幀移除 aria-hidden 觸發過場
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    modal.setAttribute("aria-hidden", "false");
    modalCloseBtn.focus();
  });

  if (!location.hash.startsWith(`#/p/${m.id}`)) {
    history.pushState(null, "", `#/p/${m.id}`);
  }
}

function closePlaceModal() {
  if (modal.hidden) return;

  // 先切 aria-hidden=true 觸發淡出動畫
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  // 等動畫結束後才真正 hidden
  const onDone = (e) => {
    // 只在 backdrop 自己的 opacity 過場結束時處理一次
    if (e && e.target !== modal) return;
    modal.hidden = true;
    modal.removeEventListener("transitionend", onDone);
  };
  modal.addEventListener("transitionend", onDone);

  if (lastFocusedEl) lastFocusedEl.focus();

  // 清掉 #/p/... 不新增歷史紀錄
  if (location.hash.startsWith("#/p/")) {
    history.replaceState(null, "", location.pathname + location.search);
  }
}

  // ✅ 暴露到全域
  window.openPlaceModal = openPlaceModal;
  window.closePlaceModal = closePlaceModal;

  // 事件：✕、背景、ESC
  modalCloseBtn?.addEventListener("click", closePlaceModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closePlaceModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePlaceModal();
  });

  // ---------- Favorites ----------
  const FAV_KEY = "heriland:favs";
  function getFavs(){
    try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); }
    catch { return new Set(); }
  }
  function saveFavs(set){
    localStorage.setItem(FAV_KEY, JSON.stringify([...set]));
  }
  function toggleFavorite(id){
    const s = getFavs();
    if (s.has(id)) s.delete(id); else s.add(id);
    saveFavs(s);
    updateFavButton(id);
  }
  function updateFavButton(id){
    const s = getFavs();
    const btn = $("#actFav");
    if (!btn) return;
    btn.innerHTML = s.has(id) ? "❤️ <span>Favorited</span>" : "🤍 <span>Favorite</span>";
  }

  // ---------- Config ----------
  async function applyConfig() {
    const cfg = await loadJSON("config/config.json");
    if (!cfg) return;
    const btnSubmit = document.getElementById("btnSubmit");
    if (btnSubmit && cfg.features?.submitForm) {
      btnSubmit.hidden = false;
      btnSubmit.href = cfg.links?.submitFormUrl || "#";
    }

// 在 applyConfig() 裡面加：
const bbSubmit = document.getElementById("bbSubmit");
if (bbSubmit && cfg.features?.submitForm) {
  bbSubmit.hidden = false;
  bbSubmit.onclick = () => { document.getElementById("btnSubmit")?.click(); };
}

  }

  // ---------- Hash Routing ----------
  window.addEventListener("hashchange", async () => {
    const m = location.hash.match(/^#\/p\/(.+)$/);
    if (m && m[1]) await openPlaceModal(m[1]);
    else closePlaceModal();
  });

  // ---------- Init ----------
  await Promise.all([
    renderDivisions(),
    ensureDivisionLoaded("kuching"),
    renderTopPicks(),
    applyConfig()
  ]);

// === Header RWD：漢堡選單開關 ===
(function(){
  const nav = document.getElementById('primaryNav');
  const btn = document.getElementById('btnMenu');
  if (!nav || !btn) return;

  const closeNav = () => {
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
  };
  const openNav = () => {
    nav.classList.add('open');
    btn.setAttribute('aria-expanded','true');
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    nav.classList.contains('open') ? closeNav() : openNav();
  });

  // 點外面或按 ESC 關閉
  window.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && e.target !== btn) closeNav();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNav();
  });

  // 視窗放大到桌機時重置狀態
  const mq = window.matchMedia('(min-width: 840px)');
  mq.addEventListener?.('change', () => closeNav());
})();

  console.log("HeriLand homepage + modal fixed ✅");
})();