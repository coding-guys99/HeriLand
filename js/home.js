/* =========================================================
   HeriLand — Home (rows-first)
   - reads data/collections.json
   - aggregates merchants from all divisions
   - renders Netflix-like rows
   - includes fullscreen glass search overlay (TikTok style)
   ========================================================= */
import { sheet, toast } from './ui.js';

(async () => {
  const $ = s => document.querySelector(s);

  // ===== 基本設定 =====
  const ROOT = '.';
  const url = (p) => {
    if (!p) return '#';
    if (/^https?:\/\//i.test(p)) return p;
    if (p.startsWith('/')) return `${ROOT}${p}`;
    return `${ROOT}/${p.replace(/^\.\//,'')}`;
  };

  // 年份
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // ===== helpers =====
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
  function el(tag, cls, html){
    const x = document.createElement(tag);
    if(cls) x.className = cls;
    if(html != null) x.innerHTML = html;
    return x;
  }
  function mapLink(loc, addr){
    if(loc?.lat && loc?.lng) return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
    if(addr) return `https://www.google.com/maps?q=${encodeURIComponent(addr)}`;
    return null;
  }

  // ===== Quick chips =====
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
    qc?.appendChild(a);
  });

  // ===== 載入 divisions + merchants =====
  const cities = await loadJSON('data/cities.json');
  const divisionIds = (cities?.divisions || []).map(d=>d.id) || [];

  let ALL = [];
  for (const id of divisionIds){
    const data = await loadJSON(`data/merchants/${id}.json`);
    if (data?.items) ALL.push(...data.items);
  }

  // ===== Hero rail =====
  function renderHero(items){
    const rail = $("#heroRail"); if (!rail) return;
    rail.innerHTML = "";
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

  // ===== Rows =====
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
    const host = $("#rowsHost"); if (!host) return;
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

  // ===== Modal（沿用） =====
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
  window.addEventListener("hashchange", ()=>{ const m = location.hash.match(/^#\/p\/(.+)$/); if (!m) closeModal(); });

  // ===== 收藏 =====
  const FAV_KEY = "heriland:favs";
  function getFavs(){ try{ return new Set(JSON.parse(localStorage.getItem(FAV_KEY)||"[]")); }catch{ return new Set(); } }
  function saveFavs(s){ localStorage.setItem(FAV_KEY, JSON.stringify([...s])); }
  function toggleFavorite(id){ const s=getFavs(); s.has(id)? s.delete(id): s.add(id); saveFavs(s); }
  function updateFavButton(id){
    const s=getFavs();
    const btn=$("#actFav"); if(!btn) return;
    btn.innerHTML = s.has(id) ? "❤️ <span>Favorited</span>" : "🤍 <span>Favorite</span>";
  }

  // ===== TikTok-style Fullscreen Search =====
  const overlay    = document.getElementById('searchOverlay');
  const inputEl    = document.getElementById('overlayInput');
  const listEl     = document.getElementById('overlayList');
  const hintEl     = document.getElementById('searchHint');
  const btnOpen    = document.getElementById('btnSearch');
  const btnClose   = document.getElementById('overlayClose');
  const clearBtn   = document.getElementById('searchClear');

  let _lockY = 0;
  function lockScroll(){
    _lockY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.style.setProperty('--lock-top', `-${_lockY}px`);
    document.body.style.setProperty('--lock-top', `-${_lockY}px`);
    document.body.classList.add('search-lock'); // 真正鎖住背景頁
  }
  function unlockScroll(){
    document.body.classList.remove('search-lock');
    document.body.style.removeProperty('--lock-top');
    document.documentElement.style.removeProperty('--lock-top');
    window.scrollTo(0, _lockY || 0);
  }

  function openSearch(){
    if (!overlay) return;
    overlay.hidden = false;
    requestAnimationFrame(()=> overlay.classList.add('active'));
    lockScroll();
    if (inputEl){
      inputEl.value = '';
      inputEl.focus();
    }
    if (listEl) listEl.innerHTML = '';
    if (hintEl) hintEl.textContent = 'Popular: seafood · museum · beach';
  }
  function closeSearch(){
    if (!overlay) return;
    overlay.classList.remove('active');
    setTimeout(()=> overlay.hidden = true, 250);
    unlockScroll();
  }

  btnOpen?.addEventListener('click', openSearch);
  btnClose?.addEventListener('click', closeSearch);
  overlay?.addEventListener('click', (e)=>{
    // 點擊背景（非內容）關閉
    if (e.target === overlay) closeSearch();
  });
  window.addEventListener('keydown', e=>{ if (e.key === 'Escape') closeSearch(); });

  // 搜尋函式（打分）
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
      .filter(([sc]) => sc > 0)
      .sort((a,b)=> b[0]-a[0])
      .slice(0, 50)
      .map(([,m])=>m);
  }

  // 渲染（白底列表＋序號＋白線分隔）
  function renderSearchList(list){
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!list.length){
      if (hintEl) hintEl.textContent = 'No results. Try another keyword.';
      return;
    }
    if (hintEl) hintEl.textContent = `Results · ${list.length}`;

    list.forEach((m, i)=>{
      const row = document.createElement('button');
      row.className = 'search-item';
      row.type = 'button';
      row.innerHTML = `
        <div class="search-index">${i+1}</div>
        <div class="search-thumb" style="background-image:url('${m.cover}')"></div>
        <div class="search-main">
          <div class="search-title">${m.name}</div>
          <div class="search-sub">${m.address || ''}</div>
          <div class="search-tags">${(m.tagIds||[]).join(' · ')}</div>
        </div>
        <div class="search-meta">${m.rating ?? ''}${m.priceLevel ? ` · ${'💲'.repeat(m.priceLevel)}` : ''}</div>
      `;
      row.addEventListener('click', ()=>{ closeSearch(); openModal(m); });
      listEl.appendChild(row);
    });
  }

  // 即時輸入（防抖）
  let _tmr = null;
  inputEl?.addEventListener('input', (e)=>{
    clearTimeout(_tmr);
    const q = e.target.value;
    _tmr = setTimeout(()=> renderSearchList(searchMerchants(q)), 120);
  });

  // 初次聚焦：清空結果
  inputEl?.addEventListener('focus', ()=>{
    if (listEl) listEl.innerHTML = '';
  });

  // 清除輸入
  clearBtn?.addEventListener('click', ()=>{
    if (!inputEl) return;
    inputEl.value = '';
    inputEl.focus();
    if (hintEl) hintEl.textContent = 'Popular: seafood · museum · beach';
    renderSearchList([]);
  });

  // ===== collections → render =====
  const collections = await loadJSON('data/collections.json');
  const rows = collections?.rows || [];
  const heroDef = rows.find(r => r.type === "hero-rail");
  if (heroDef?.items?.length) renderHero(heroDef.items);
  rows.filter(r => r.type !== "hero-rail").forEach(renderRow);

  console.log("Home rows initialized ✅");
})();