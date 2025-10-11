/* =========================================================
   HeriLand — Home (rows-first)
   - reads data/collections.json
   - aggregates merchants from all divisions
   - renders Netflix-like rows
   ========================================================= */
import { sheet, toast } from './ui.js';

(async () => {
  const $ = s => document.querySelector(s);

  // 根目錄部署（GitHub Pages 友善）
  const ROOT = '.';
  const url = (p) => {
    if (!p) return '#';
    if (/^https?:\/\//i.test(p)) return p;       // 絕對網址
    if (p.startsWith('/')) return `${ROOT}${p}`;  // 以 / 開頭 → 補 ROOT
    return `${ROOT}/${p.replace(/^\.\//,'')}`;    // 其他相對 → 補 ROOT/
  };

  // 年份
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // helpers
  async function loadJSON(path){
    const u = url(path);
    try{
      const r = await fetch(u);
      if(!r.ok) throw new Error(`${r.status} ${u}`);
      return await r.json();
    }catch(e){
      console.warn("[loadJSON]", u, e);
      return null;
    }
  }
  function el(tag, cls, html){ const x=document.createElement(tag); if(cls) x.className=cls; if(html!=null) x.innerHTML=html; return x; }
  function mapLink(loc, addr){ if(loc?.lat && loc?.lng) return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`; if(addr) return `https://www.google.com/maps?q=${encodeURIComponent(addr)}`; return null; }

  // Quick chips
  const QUICK = [
    { label:"Taste",      tags:["food"] },
    { label:"Culture",    tags:["culture","museum","temple"] },
    { label:"Nature",     tags:["nature","park","waterfall","beach"] },
    { label:"Stay",       tags:["stay","hotel"] },
    { label:"Local",      tags:["local","market"] },
    { label:"Experience", tags:["scenic","event","adventure","family"] },
    { label:"Modern",     tags:["modern","shopping"] }
  ];
  const qc = $("#quickChips");
  QUICK.forEach(q=>{
    const a = el("a","chip",q.label);
    a.href = url(`places.html#?tags=${encodeURIComponent(q.tags.join(","))}`);
    qc.appendChild(a);
  });

  // ── 載入 divisions 與 merchants
  const cities = await loadJSON('data/cities.json');
  const divisionIds = (cities?.divisions || []).map(d=>d.id);

  let ALL = [];
  for (const id of divisionIds){
    const data = await loadJSON(`data/merchants/${id}.json`);
    if (data?.items) ALL.push(...data.items);
  }

  // ── Hero rail
  function renderHero(items){
    const rail = $("#heroRail"); rail.innerHTML = "";
    items.forEach(it=>{
      const card = el("a","hero-card",`
        <img src="${url(it.image)}" alt="">
        <span class="hero-caption">
          ${it.title} ${it.sponsored ? '<em class="ad">Ad</em>' : ''}
        </span>
      `);
      card.href = url(it.url || "#");
      rail.appendChild(card);
    });
  }

  // ── Row builders
  function cardPoster(m){
    const a = el("article","card poster",`
      <div class="thumb" style="background-image:url('${m.cover}')"></div>
      <h3 class="t">${m.name}</h3>
    `);
    a.addEventListener("click", ()=> openModal(m));
    return a;
  }
  function cardMini(m){
    const a = el("article","card mini",`
      <div class="thumb" style="background-image:url('${m.cover}')"></div>
      <div class="meta"><span>⭐ ${m.rating ?? "-"}</span></div>
    `);
    a.addEventListener("click", ()=> openModal(m));
    return a;
  }
  function divisionPill(d){
    const a = el("a","division-pill",`<span>${d.name_en.replace(" Division","")}</span>`);
    a.href = url(`places.html#/d/${d.id}`);
    return a;
  }

  function filterBySource(src){
    let arr = [...ALL];
    if (src?.filter?.featured) arr = arr.filter(x=>x.featured);
    if (src?.tags?.length) {
      const set = new Set(src.tags.map(t=>String(t).toLowerCase()));
      arr = arr.filter(x => (x.tagIds||[]).some(t => set.has(String(t).toLowerCase())));
    }
    if (src?.sort === "updatedAt:desc"){
      arr.sort((a,b)=> new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    if (src?.limit) arr = arr.slice(0, src.limit);
    return arr;
  }

  function renderRow(rowDef){
    const host = $("#rowsHost");
    const sec = el("section","row-section");
    const head = el("div","row-head",`
      <h2>${rowDef.title || ""}</h2>
      ${rowDef.type!=="division-row" ? `<a class="see-all" href="${url('places.html')}">See all</a>` : ''}
    `);
    const rail = el("div","rail");

    if (rowDef.type === "poster-row"){
      filterBySource(rowDef.source).forEach(m => rail.appendChild(cardPoster(m)));
    } else if (rowDef.type === "mini-row"){
      filterBySource(rowDef.source).forEach(m => rail.appendChild(cardMini(m)));
    } else if (rowDef.type === "division-row"){
      (cities?.divisions||[]).forEach(d => rail.appendChild(divisionPill(d)));
    }

    sec.appendChild(head);
    sec.appendChild(rail);
    host.appendChild(sec);
  }

  // ── Modal（沿用你的）
  const modal = $("#placeModal");
  const modalCloseBtn = $("#modalClose");
  function fillText(sel, text){ const e=$(sel); if(!e) return; e.textContent = text || ""; }
  function action(el, href){ if(!el) return; if(href){ el.removeAttribute("disabled"); el.href=href; } else { el.setAttribute("disabled","true"); el.removeAttribute("href"); } }

  function openModal(m){
    const g = $("#modalGallery"); g.innerHTML = "";
    (m.images?.length ? m.images : [m.cover]).forEach(src => { const i=new Image(); i.src=src; g.appendChild(i); });
    fillText("#placeTitle", m.name);
    $("#placeMeta").innerHTML = `
      ${m.rating ? `<span>⭐ ${m.rating}</span>` : ""}
      ${m.priceLevel ? `<span>${"💲".repeat(m.priceLevel)}</span>` : ""}
    `;
    fillText("#placeDesc", m.description);
    fillText("#infoAddress", m.address);
    fillText("#infoHours", m.openHours);
    action($("#actCall"), m.phone ? `tel:${m.phone}` : null);
    action($("#actWA"), m.whatsapp ? `https://wa.me/${m.whatsapp.replace(/\D/g,'')}` : null);
    action($("#actWeb"), m.website || null);
    action($("#actMap"), mapLink(m.location, m.address));

    $("#actShare").onclick = async () => {
      const shareUrl = `${location.origin}${location.pathname}#/p/${m.id}`;
      if (navigator.share) { try{ await navigator.share({title:m.name, text:m.description||"", url: shareUrl}); }catch{} }
      else { await navigator.clipboard?.writeText(shareUrl); alert("Link copied."); }
    };
    $("#actFav").onclick = () => { toggleFavorite(m.id); updateFavButton(m.id); };
    updateFavButton(m.id);

    modal.hidden = false; modal.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
    modalCloseBtn?.focus();
    if (!location.hash.startsWith(`#/p/${m.id}`)) history.pushState(null,"",`#/p/${m.id}`);
  }
  function closeModal(){
    if (modal.hidden) return;
    modal.hidden = true; modal.setAttribute("aria-hidden","true"); document.body.style.overflow="";
    if (location.hash.startsWith("#/p/")) history.pushState(null,"",location.pathname + location.search);
  }
  modalCloseBtn?.addEventListener("click", closeModal);
  modal?.addEventListener("click", e=>{ if(e.target===modal) closeModal(); });
  window.addEventListener("keydown", e=>{ if(e.key==="Escape") closeModal(); });
  window.addEventListener("hashchange", ()=>{
    const m = location.hash.match(/^#\/p\/(.+)$/); if (!m) closeModal();
  });

  // favorites
  const FAV_KEY = "heriland:favs";
  function getFavs(){ try{ return new Set(JSON.parse(localStorage.getItem(FAV_KEY)||"[]")); }catch{ return new Set(); } }
  function saveFavs(s){ localStorage.setItem(FAV_KEY, JSON.stringify([...s])); }
  function toggleFavorite(id){ const s=getFavs(); s.has(id)? s.delete(id): s.add(id); saveFavs(s); }
  function updateFavButton(id){ const s=getFavs(); const btn=$("#actFav"); if(!btn) return; btn.innerHTML = s.has(id) ? "❤️ <span>Favorited</span>" : "🤍 <span>Favorite</span>"; }



// ===== Glass overlay search (anchored to #searchPill) =====
const overlay   = document.getElementById('searchOverlay');
const resultsEl = document.getElementById('overlayResults');
const closeBtn  = document.getElementById('overlayClose');
const field     = document.getElementById('searchField');
const pill      = document.getElementById('searchPill');

function positionAnchors(){
  if (!pill || !resultsEl) return;

  const safe = 12;             // 左右保險邊
  const margin = 8;            // pill 底緣到結果面板的距離
  const r = pill.getBoundingClientRect();
  const vw = window.innerWidth;

  // 結果面板寬度：跟 pill 同寬，但預留左右保險邊
  const left  = Math.max(safe, Math.round(r.left));
  const right = Math.max(safe, Math.round(vw - r.right));
  const width = Math.round(vw - left - right);

  resultsEl.style.left = `${left}px`;
  resultsEl.style.top  = `${Math.round(r.bottom + margin)}px`;
  resultsEl.style.width = `${width}px`;

  // 同步把 pill 固定位置寫進 CSS 變數（讓它浮在 overlay 上）
  document.documentElement.style.setProperty('--pill-left',  `${left}px`);
  document.documentElement.style.setProperty('--pill-top',   `${Math.round(r.top)}px`);
  document.documentElement.style.setProperty('--pill-width', `${width}px`);
}

let _lockY = 0;

function lockScroll(){
  _lockY = window.scrollY || document.documentElement.scrollTop || 0;
  document.documentElement.style.setProperty('--lock-top', `-${_lockY}px`);
  document.body.style.setProperty('--lock-top', `-${_lockY}px`);
  document.body.classList.add('search-lock');   // <- 真鎖
}

function unlockScroll(){
  document.body.classList.remove('search-lock');
  document.body.style.removeProperty('--lock-top');
  document.documentElement.style.removeProperty('--lock-top');
  window.scrollTo(0, _lockY || 0);              // 回復原位置
}

function openOverlay(){
  if (!overlay) return;
  overlay.hidden = false;
  lockScroll();                 // ★ 鎖住背景
  positionAnchors();

  requestAnimationFrame(()=>{
    overlay.classList.add('active');
    resultsEl.classList.add('active');
  });

  field?.focus();

  addEventListener('resize', positionAnchors);
  addEventListener('scroll', positionAnchors, { passive:true });
  window.visualViewport?.addEventListener('resize', positionAnchors);
  window.visualViewport?.addEventListener('scroll', positionAnchors);
}

function closeOverlay(){
  if (!overlay) return;
  overlay.classList.remove('active');
  resultsEl.classList.remove('active');

  setTimeout(()=>{ overlay.hidden = true; }, 250);
  unlockScroll();               // ★ 解鎖並回到原位

  removeEventListener('resize', positionAnchors);
  removeEventListener('scroll', positionAnchors);
  window.visualViewport?.removeEventListener('resize', positionAnchors);
  window.visualViewport?.removeEventListener('scroll', positionAnchors);
}

// 只允許 overlayResults 直向捲動，其它地方禁止捲動
overlay?.addEventListener('touchmove', (e)=>{
  if (!resultsEl.contains(e.target)) {
    e.preventDefault();
  }
}, { passive: false });

// 點背景（非結果面板）關閉
overlay?.addEventListener('click', (e)=>{
  if (e.target === overlay) closeOverlay();
});
closeBtn?.addEventListener('click', closeOverlay);
window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeOverlay(); });

// 聚合搜尋
function searchMerchants(q){
  if (!q) return [];
  const s = q.trim().toLowerCase();
  const score = (m) => {
    let sc = 0;
    const name = (m.name||'').toLowerCase();
    const desc = (m.description||'').toLowerCase();
    if (name.startsWith(s)) sc += 6;
    if (name.includes(s))  sc += 3;
    if (desc.includes(s))  sc += 2;
    if ((m.tagIds||[]).some(t => String(t).toLowerCase().includes(s))) sc += 1;
    return sc;
  };
  return [...ALL]
    .map(m => [score(m), m])
    .filter(([sc]) => sc>0)
    .sort((a,b)=>b[0]-a[0])
    .slice(0, 30)
    .map(([,m])=>m);
}

function renderResults(list){
  resultsEl.innerHTML = '';
  if (!list.length){
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:10px 12px; color:#666; font-size:14px;';
    empty.textContent = 'No results. Try another keyword.';
    resultsEl.appendChild(empty);
    return;
  }
  list.forEach(m=>{
    const row = document.createElement('div');
    row.className = 'result-item';
    row.innerHTML = `
      <div class="result-thumb" style="background-image:url('${m.cover}')"></div>
      <div class="result-main">
        <div class="result-title">${m.name}</div>
        <div class="result-sub">${m.address || ''}</div>
      </div>
      <div class="result-meta">
        ${m.rating ? `⭐ ${m.rating}` : ''} ${m.priceLevel ? ` · ${'💲'.repeat(m.priceLevel)}` : ''}
      </div>
    `;
    row.addEventListener('click', ()=>{ closeOverlay(); openModal(m); });
    resultsEl.appendChild(row);
  });
}

// 進入搜尋狀態：點 pill 或聚焦 input
pill?.addEventListener('click', openOverlay);
field?.addEventListener('focus', openOverlay);

// 即時搜尋（防抖）
let tmr=null;
field?.addEventListener('input', (e)=>{
  clearTimeout(tmr);
  const q = e.target.value;
  tmr = setTimeout(()=> renderResults(searchMerchants(q)), 120);
});

// 首次打開時，若沒有輸入就先清空結果並定位
field?.addEventListener('focus', ()=>{
  resultsEl.innerHTML = '';
  positionAnchors();
});

  // ── collections → render
  const collections = await loadJSON('data/collections.json');
  const rows = collections?.rows || [];
  const heroDef = rows.find(r => r.type === "hero-rail");
  if (heroDef?.items?.length) renderHero(heroDef.items);
  rows.filter(r => r.type !== "hero-rail").forEach(renderRow);

  console.log("Home rows initialized ✅");
})();