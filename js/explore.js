/* =========================================================
   HeriLand — Home (rows-first)
   - reads /data/collections.json
   - aggregates merchants from all divisions
   - renders Netflix-like rows
   ========================================================= */
(async () => {
  const $ = s => document.querySelector(s);
  const yearEl = $("#year"); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- helpers ----------
  async function loadJSON(path){
    try{ const r = await fetch(path); if(!r.ok) throw new Error(r.status); return await r.json(); }
    catch(e){ console.warn("[loadJSON]", path, e); return null; }
  }
  function el(tag, cls, html){ const x=document.createElement(tag); if(cls) x.className=cls; if(html!=null) x.innerHTML=html; return x; }
  function mapLink(loc, addr){ if(loc?.lat && loc?.lng) return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`; if(addr) return `https://www.google.com/maps?q=${encodeURIComponent(addr)}`; return null; }

  // ---------- search pill ----------
  $("#btnSearch")?.addEventListener("click", () => {
    location.href = "/pages/places.html";
  });

  // ---------- quick chips ----------
  const QUICK = [
    { label:"Taste", tags:["food"] },
    { label:"Culture", tags:["culture","museum","temple"] },
    { label:"Nature", tags:["nature","park","waterfall","beach"] },
    { label:"Stay", tags:["stay","hotel"] },
    { label:"Local", tags:["local","market"] },
    { label:"Experience", tags:["scenic","event","adventure","family"] },
    { label:"Modern", tags:["modern","shopping"] }
  ];
  const qc = $("#quickChips");
  QUICK.forEach(q=>{
    const a = el("a","chip",q.label);
    a.href = `/pages/places.html#?tags=${encodeURIComponent(q.tags.join(","))}`;
    qc.appendChild(a);
  });

  // ---------- load cities & merchants ----------
  const cities = await loadJSON("/data/cities.json");
  const divisionIds = (cities?.divisions || []).map(d=>d.id);
  // 聚合所有 division 的 merchants（首頁要跨區策展）
  let ALL = [];
  for (const id of divisionIds){
    const data = await loadJSON(`/data/merchants/${id}.json`);
    if (data?.items) ALL.push(...data.items);
  }

  // ---------- hero rail ----------
  function renderHero(items){
    const rail = $("#heroRail"); rail.innerHTML = "";
    items.forEach(it=>{
      const card = el("a","hero-card",`
        <img src="${it.image}" alt="">
        <span class="hero-caption">
          ${it.title} ${it.sponsored ? '<em class="ad">Ad</em>' : ''}
        </span>
      `);
      card.href = it.url || "#";
      rail.appendChild(card);
    });
  }

  // ---------- row builders ----------
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
    a.href = `/pages/places.html#/d/${d.id}`;
    return a;
  }

  function filterBySource(src){
    let arr = [...ALL];
    if (src?.filter?.featured) arr = arr.filter(x=>x.featured);
    if (src?.tags?.length) {
      const set = new Set(src.tags.map(t=>t.toLowerCase()));
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
    // section head
    const sec = el("section","row-section");
    const head = el("div","row-head",`
      <h2>${rowDef.title || ""}</h2>
      ${rowDef.type!=="division-row" ? '<a class="see-all" href="/pages/places.html">See all</a>' : ''}
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

  // ---------- modal ----------
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
    // share & fav
    $("#actShare").onclick = async () => {
      const url = `${location.origin}${location.pathname}#/p/${m.id}`;
      if (navigator.share) { try{ await navigator.share({title:m.name, text:m.description||"", url}); }catch{} }
      else { await navigator.clipboard?.writeText(url); alert("Link copied."); }
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

  // favorites（沿用你的 key）
  const FAV_KEY = "heriland:favs";
  function getFavs(){ try{ return new Set(JSON.parse(localStorage.getItem(FAV_KEY)||"[]")); }catch{ return new Set(); } }
  function saveFavs(s){ localStorage.setItem(FAV_KEY, JSON.stringify([...s])); }
  function toggleFavorite(id){ const s=getFavs(); s.has(id)? s.delete(id): s.add(id); saveFavs(s); }
  function updateFavButton(id){ const s=getFavs(); const btn=$("#actFav"); if(!btn) return; btn.innerHTML = s.has(id) ? "❤️ <span>Favorited</span>" : "🤍 <span>Favorite</span>"; }

  // ---------- collections → render ----------
  const collections = await loadJSON("/data/collections.json");
  const rows = collections?.rows || [];

  // Hero rail
  const heroDef = rows.find(r => r.type === "hero-rail");
  if (heroDef?.items?.length) renderHero(heroDef.items);

  // other rows
  rows.filter(r => r.type !== "hero-rail").forEach(renderRow);

  console.log("Home rows initialized ✅");
})();