// js/places.js
(function(){
  // ---------- Utilities ----------
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s||"").replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const params = new URLSearchParams(location.search);
  const isDesktop = () => window.matchMedia('(min-width:768px)').matches;

  const state = {
    scope: (params.get('scope')||'').toLowerCase()==='sarawak' ? 'sarawak' : '',
    city: params.get('city')||'',
    cat: params.get('cat')||'',
    sort: params.get('sort')||'hot',
    q: params.get('q')||'',
    id: params.get('id')||''
  };
  if (!state.scope && !state.city && state.cat) state.scope = 'sarawak';

  const CITY_NAME = {
    kuching:'Kuching', sibu:'Sibu', miri:'Miri', bintulu:'Bintulu', sarikei:'Sarikei',
    kapit:'Kapit', mukah:'Mukah', limbang:'Limbang', samarahan:'Samarahan',
    'sri-aman':'Sri Aman', serian:'Serian', betong:'Betong'
  };
  const CITY_ORDER = ['kuching','samarahan','serian','sri-aman','betong','sarikei','sibu','mukah','bintulu','kapit','miri','limbang'];

  // tag → category
  const tag2cat = (tags=[])=>{
    const t = new Set((tags||[]).map(x=>String(x).toLowerCase()));
    const has = k => t.has(k);
    if (has('stay')||has('hotel')||has('lodge')||has('resort')) return 'Stay';
    if (has('culture')||has('museum')||has('temple')||has('history')||has('landmark')||has('market')||has('handicraft')||has('university')||has('shopping')||has('modern')) return 'Culture';
    if (has('food')||has('drink')||has('bar')||has('cafe')||has('seafood')||has('local')) return 'Taste';
    if (has('nature')||has('beach')||has('park')||has('waterfall')||has('adventure')||has('scenic')||has('family')||has('event')||has('sport')) return 'Experience';
    if (has('transport')) return 'Transport';
    return '';
  };

  const derive = (raw)=> raw.map(x=>{
    const cover = (Array.isArray(x.images)&&x.images[0]) ? x.images[0] : (x.cover||'');
    const category = x.category || tag2cat(x.tagIds||[]);
    return {
      id:x.id, name:x.name, cityId:x.cityId, category,
      tags:x.tagIds||[], address:x.address||'',
      loc: x.location && typeof x.location.lat==='number' && typeof x.location.lng==='number' ? x.location : null,
      cover, hours:x.openHours||x.hours||'',
      rating: (typeof x.rating==='number')?x.rating:null,
      priceLevel: (typeof x.priceLevel==='number')?Math.max(0,Math.min(3,x.priceLevel)):null,
      phone: x.phone||'', whatsapp: x.whatsapp||'', website: x.website||'', email: x.email||'',
      socials: Object.assign({instagram:'',facebook:''}, x.socials||{}),
      status: x.status||'active',
      featured: !!x.featured,
      updatedAt: x.updatedAt||null
    };
  }).filter(x=> x.status==='active');

  // ---------- Data ----------
  // 同時支援：1) const MERCHANTS = [...]  2) window.MERCHANTS = [...]
  const RAW = (typeof window !== 'undefined' && window.MERCHANTS)
           || (typeof MERCHANTS !== 'undefined' ? MERCHANTS : []);
  const ALL = derive(RAW);   // ★ 這行是關鍵：把 RAW 轉成 ALL 供後續使用

  // ---------- Header & chips ----------
  function setHeader(){
    const scopeText = state.scope==='sarawak' ? 'Sarawak' : (CITY_NAME[state.city]||'Sarawak');
    const catText = state.cat ? ` · ${state.cat}` : '';
    $('#pageTitle') && ($('#pageTitle').textContent = `${scopeText}${catText}`);
    $('#pageSub') && ($('#pageSub').textContent = state.scope==='sarawak'
      ? '跨城市結果 · 點上方城市可切換到單一城市'
      : `城市結果 · ${CITY_NAME[state.city]||''}`);
  }
  function buildScopeCityChips(){
    const row = $('#scopeCities'); if(!row) return;
    if (state.scope!=='sarawak'){ row.hidden = true; return; }
    row.hidden = false;
    row.innerHTML = ['all',...CITY_ORDER].map(slug=>{
      if (slug==='all') return `<a class="chip ${state.city?'':'active'}" data-city="" href="#">All</a>`;
      return `<a class="chip ${state.city===slug?'active':''}" data-city="${slug}" href="#">${CITY_NAME[slug]||slug}</a>`;
    }).join('');
    row.onclick = e=>{
      const a = e.target.closest('.chip'); if(!a) return;
      e.preventDefault();
      state.city = a.dataset.city || '';
      writeURL(); render();
    };
  }

  // Toolbar interactions
  (function bindToolbar(){
    const row = $('#chipsRow'); if(!row) return;
    row.addEventListener('click', e=>{
      const a = e.target.closest('.chip'); if(!a) return;
      e.preventDefault();
      if (a.id==='clear'){ state.cat=''; state.q=''; $('#q').value=''; writeURL(); render(); return; }
      if (a.dataset.cat){ state.cat = a.dataset.cat; writeURL(); render(); return; }
      if (a.dataset.sort){ state.sort = a.dataset.sort; writeURL(); render(); return; }
    });
    $('#q') && ($('#q').value = state.q);
    $('#q') && $('#q').addEventListener('input', ()=>{ state.q = $('#q').value.trim(); writeURL(); render(); });
  })();

  function writeURL(extra={}){
    const s = new URLSearchParams();
    if (state.scope==='sarawak') s.set('scope','sarawak');
    if (state.city) s.set('city',state.city);
    if (state.cat) s.set('cat',state.cat);
    if (state.sort) s.set('sort',state.sort);
    if (state.q) s.set('q',state.q);
    if (state.id) s.set('id',state.id);
    for (const k in extra){ if (extra[k]!=null && extra[k]!=='') s.set(k, extra[k]); }
    history.replaceState(null,'', location.pathname + '?' + s.toString());
  }

  // ---------- Filtering / Sorting ----------
  function distanceKm(a,b){
    if (!a||!b) return Infinity;
    const R=6371, toRad = d=>d*Math.PI/180;
    const dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng);
    const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(s));
  }
  async function getUserLoc(){
    return new Promise(res=>{
      if(!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(
        p=>res({lat:p.coords.latitude,lng:p.coords.longitude}),
        ()=>res(null),
        {enableHighAccuracy:true,timeout:3000}
      );
    });
  }
  function filterData(){
    let data = ALL.slice();
    if (state.scope==='sarawak'){
      if (state.city) data = data.filter(x=> x.cityId===state.city);
    } else if (state.city){
      data = data.filter(x=> x.cityId===state.city);
    }
    if (state.cat) data = data.filter(x=> x.category===state.cat);
    if (state.q){
      const q = state.q.toLowerCase();
      data = data.filter(x=>
        (x.name||'').toLowerCase().includes(q) ||
        (x.address||'').toLowerCase().includes(q) ||
        (x.tags||[]).some(t=> String(t).toLowerCase().includes(q))
      );
    }
    return data;
  }
  async function sortData(data){
    const by = state.sort||'hot';
    if (by==='new'){
      data.sort((a,b)=> new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
    } else if (by==='top'){
      data.sort((a,b)=> (b.rating||0)-(a.rating||0));
    } else if (by==='near'){
      const me = await getUserLoc();
      if (!me) return sortHot(data);
      data.sort((a,b)=> distanceKm(a.loc,me)-distanceKm(b.loc,me));
    } else { sortHot(data); }
    return data;
  }
  function sortHot(arr){
    arr.sort((a,b)=>{
      if (a.featured!==b.featured) return b.featured - a.featured;
      if ((a.rating||0)!==(b.rating||0)) return (b.rating||0)-(a.rating||0);
      return new Date(b.updatedAt||0)-new Date(a.updatedAt||0);
    });
    return arr;
  }

  // ---------- Render cards ----------
  function priceMarks(n){ if(n==null||n<=0) return ''; return '฿'.repeat(Math.max(1,Math.min(3,n))); }
  function buildIcons(x){
    const icons = [];
    if (x.phone) icons.push(`<a class="ic" href="tel:${encodeURIComponent(x.phone.replace(/\s+/g,''))}" aria-label="Call">${iconPhone()}</a>`);
    if (x.whatsapp) {
      const num = x.whatsapp.replace(/[^\d]/g,'');
      if (num) icons.push(`<a class="ic" href="https://wa.me/${num}" target="_blank" rel="noopener" aria-label="WhatsApp">${iconWa()}</a>`);
    }
    if (x.website) icons.push(`<a class="ic" href="${esc(x.website)}" target="_blank" rel="noopener" aria-label="Website">${iconGlobe()}</a>`);
    if (x.email) icons.push(`<a class="ic" href="mailto:${esc(x.email)}" aria-label="Email">${iconMail()}</a>`);
    if (x.socials?.instagram) icons.push(`<a class="ic" href="${esc(x.socials.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${iconIg()}</a>`);
    if (x.socials?.facebook) icons.push(`<a class="ic" href="${esc(x.socials.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">${iconFb()}</a>`);
    return icons.join('');
  }
  function cardHTML(x, showCityBadge){
    const tagChips = (x.tags||[]).slice(0,3).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
    const rating = (x.rating!=null) ? `⭐ ${x.rating.toFixed(1)}` : '';
    const price = priceMarks(x.priceLevel);
    const badge = showCityBadge ? `<div class="badge">${esc(CITY_NAME[x.cityId]||x.cityId)}</div>` : '';
    const img = x.cover ? `<img src="${esc(x.cover)}" alt="${esc(x.name)}" onerror="this.remove()">` : '';
    return `
      <article class="card" data-id="${esc(x.id)}" data-city="${esc(x.cityId)}">
        <div class="thumb">${badge}${img}</div>
        <div class="body">
          <h3 class="title">${esc(x.name)}</h3>
          <p class="meta">${[x.category||'','·',x.address||''].filter(Boolean).join(' ')}</p>
          <div class="tags">${tagChips}</div>
          <p class="meta">${[rating, price].filter(Boolean).join('　')}</p>
        </div>
        <div class="actions">
          <a class="btn ghost js-open" href="place.html?id=${encodeURIComponent(x.id)}&city=${encodeURIComponent(x.cityId)}">Details</a>
          ${buildIcons(x)}
        </div>
      </article>
    `;
  }
  function skeleton(n=8){
    $('#list').innerHTML = Array.from({length:n}).map(()=>`
      <article class="card">
        <div class="thumb skeleton"></div>
        <div class="body">
          <div class="skeleton" style="height:22px;width:70%;border-radius:8px;margin:6px 0 10px"></div>
          <div class="skeleton" style="height:14px;width:40%;border-radius:8px;margin:4px 0 12px"></div>
          <div class="skeleton" style="height:24px;width:60%;border-radius:999px;margin:6px 0"></div>
        </div>
        <div class="actions"><div class="skeleton" style="height:36px;width:96px;border-radius:10px"></div></div>
      </article>
    `).join('');
    $('#empty').hidden = true;
  }

  async function render(){
    setHeader(); buildScopeCityChips();
    document.querySelectorAll('[data-sort]').forEach(el=> el.classList.toggle('active', el.dataset.sort===state.sort));
    document.querySelectorAll('[data-cat]').forEach(el=> el.classList.toggle('active', el.dataset.cat===state.cat));

    skeleton(8);
    let data = filterData();
    data = await sortData(data);

    if (!data.length){
      $('#list').innerHTML = '';
      $('#empty').hidden = false;
      return;
    }
    const showCityBadge = state.scope==='sarawak' && !state.city;
    $('#list').innerHTML = data.map(x=>cardHTML(x,showCityBadge)).join('');
    $('#empty').hidden = true;
  }

  // ================= Bottom Sheet =================
  let sheetEl, backdropEl, dragEl, focusTrapEls = [];
  function ensureSheet(){
    // 先嘗試使用 HTML 已有的節點
    sheetEl = document.getElementById('detailSheet');
    backdropEl = document.getElementById('sheetBackdrop');

    if (!sheetEl){
      // Fallback：若頁面沒放就動態建立（通常用不到）
      sheetEl = document.createElement('div');
      sheetEl.className = 'sheet'; sheetEl.id = 'detailSheet';
      document.body.appendChild(sheetEl);
      backdropEl = document.createElement('div');
      backdropEl.className = 'sheet-backdrop'; backdropEl.id = 'sheetBackdrop';
      document.body.appendChild(backdropEl);
    }

    dragEl = sheetEl.querySelector('.sheet__drag') || sheetEl;

    backdropEl.addEventListener('click', closeSheet);
    dragEl.addEventListener('mousedown', startDrag);
    dragEl.addEventListener('touchstart', startDrag, {passive:false});

    const zoomBtn = sheetEl.querySelector('.sheet__zoom');
    if (zoomBtn){
      zoomBtn.addEventListener('click', ()=>{
        sheetEl.classList.add('sheet--open');
        sheetEl.classList.remove('sheet--half');
      });
    }
    document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeSheet(); });
  }

  let startY=0, startTop=0, dragging=false;
  function startDrag(e){
    e.preventDefault();
    dragging = true;
    startY = (e.touches? e.touches[0].clientY : e.clientY);
    startTop = sheetEl.getBoundingClientRect().top;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('touchmove', onDrag, {passive:false});
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
  }
  function onDrag(e){
    if(!dragging) return;
    const y = (e.touches? e.touches[0].clientY : e.clientY);
    const dy = Math.max(0, y - startY);
    const vh = window.innerHeight;
    const current = Math.min(vh*0.92, Math.max(vh*0.08, startTop + dy));
    const pct = Math.max(0, (current/vh)*100);
    sheetEl.style.transition = 'none';
    sheetEl.style.transform = `translateY(${pct}vh)`;
  }
  function endDrag(){
    if(!dragging) return;
    dragging=false;
    sheetEl.style.transition = '';
    const rect = sheetEl.getBoundingClientRect();
    const vh = window.innerHeight;

    // >75% 關閉；30%~75% 半開；<=30% 全開
    if (rect.top > vh*0.75){
      closeSheet();
    } else if (rect.top > vh*0.30){
      sheetEl.classList.add('sheet--half');
      sheetEl.classList.remove('sheet--open');
    } else {
      sheetEl.classList.add('sheet--open');
      sheetEl.classList.remove('sheet--half');
    }

    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchend', endDrag);
  }

  function openSheet(itemOrId){
    if (isDesktop()){ // 桌機直接去獨立頁
      const it = typeof itemOrId==='string' ? ALL.find(x=>x.id===itemOrId) : itemOrId;
      if (it) location.href = `place.html?id=${encodeURIComponent(it.id)}&city=${encodeURIComponent(it.cityId)}`;
      return;
    }
    ensureSheet();
    document.body.style.overflow = 'hidden';
    const it = (typeof itemOrId==='string') ? ALL.find(x=>x.id===itemOrId) : itemOrId;
    if (!it) return;
    state.id = it.id; writeURL();

    // 填內容（輕量，無滾動）
    const sThumb = $('#sThumb');
    const sTitle = $('#sTitle');
    const sRating = $('#sRating');
    const sTags  = $('#sTags');
    const sCall  = $('#sCall');

    sThumb.innerHTML = it.cover ? `<img src="${esc(it.cover)}" alt="${esc(it.name)}">` : '';
    sTitle.textContent = it.name;
    sRating.textContent = it.rating ? `⭐ ${it.rating.toFixed(1)}` : '';
    sTags.innerHTML = (it.tags||[]).slice(0,2).map(t=>`<span>${esc(t)}</span>`).join('');
    sCall.href = it.phone ? `tel:${encodeURIComponent(it.phone.replace(/\s+/g,''))}` : '#';

    // 導航（若有座標）
    const navBtn = $('#sNav');
    if (navBtn){
      const url = it.loc ? `https://www.google.com/maps?q=${it.loc.lat},${it.loc.lng}` : '#';
      navBtn.onclick = ()=>{ if (it.loc) window.open(url,'_blank'); };
      navBtn.disabled = !it.loc;
    }
    // 分享（若支援）
    const shareBtn = $('#sShare');
    if (shareBtn){
      shareBtn.onclick = async ()=>{
        const shareData = { title: it.name, text: `${it.name} · ${it.cityId}`, url: location.href };
        if (navigator.share){ try{ await navigator.share(shareData); }catch(_){} }
        else { navigator.clipboard && navigator.clipboard.writeText(location.href); }
      };
    }

    // 初始半開（50%）與顯示遮罩
    sheetEl.classList.remove('sheet--open'); // 先移除全開
    sheetEl.classList.add('sheet--half','sheet--visible');
    sheetEl.style.transform = '';            // 交給 class 控制
    const bd = $('#sheetBackdrop'); if (bd){ bd.style.opacity='1'; bd.style.pointerEvents='auto'; }

    // 焦點鎖
    focusTrapEls = Array.from(sheetEl.querySelectorAll('a,button,[tabindex]:not([tabindex="-1"])'));
    (focusTrapEls[0]||sheetEl).focus();
    document.addEventListener('focus', trapFocus, true);
  }
  function closeSheet(){
    document.removeEventListener('focus', trapFocus, true);
    document.body.style.overflow = '';
    if (!sheetEl) return;
    sheetEl.classList.remove('sheet--open','sheet--half','sheet--visible');
    sheetEl.style.transform = 'translateY(100vh)';
    const bd = $('#sheetBackdrop'); if (bd){ bd.style.opacity='0'; bd.style.pointerEvents='none'; }
    state.id = ''; writeURL();
  }
  function trapFocus(e){
    if (!sheetEl || (!sheetEl.classList.contains('sheet--open') && !sheetEl.classList.contains('sheet--half'))) return;
    if (!sheetEl.contains(e.target)){
      e.stopPropagation();
      (focusTrapEls[0]||sheetEl).focus();
    }
  }

  // 事件代理：點「Details」在手機改為抽屜
  document.addEventListener('click', e=>{
    const a = e.target.closest('.js-open'); if(!a) return;
    const card = e.target.closest('.card'); if(!card) return;
    if (!isDesktop()){
      e.preventDefault();
      const id = card.getAttribute('data-id');
      openSheet(id);
    }
  });

  // 初始：render，且若 URL 有 id 則手機直接開抽屛；桌機導向詳情頁
  window.addEventListener('load', ()=>{
    render().then(()=>{
      if (state.id){
        if (isDesktop()){
          const it = ALL.find(x=>x.id===state.id);
          if (it) location.href = `place.html?id=${encodeURIComponent(it.id)}&city=${encodeURIComponent(it.cityId)}`;
        } else {
          openSheet(state.id);
        }
      }
    });
  });

  // ---------- Icons ----------
  function iconPhone(){return `<svg viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.2 2.4 3.2 4.4 5.6 5.6l2-2c.3-.3.8-.4 1.2-.2 1 .4 2.1.6 3.2.6.6 0 1 .4 1 .9V20a1 1 0 0 1-1 1C10.6 21 3 13.4 3 4a1 1 0 0 1 1-1h3.2c.5 0 .9.4.9 1 0 1.1.2 2.2.6 3.2.2.4.1.9-.2 1.2l-2 2Z" fill="currentColor"/></svg>`}
  function iconWa(){return `<svg viewBox="0 0 24 24" fill="none"><path d="M20 12a8 8 0 1 0-14.7 4.6L4 21l4.5-1.2A8 8 0 0 0 20 12Z" stroke="currentColor" stroke-width="1.4"/><path d="M9 9c0 3 3 6 6 6l1.2-.6c.3-.1.6 0 .8.2l.6.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`}
  function iconGlobe(){return `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.4"/><path d="M3 12h18M12 3c2.7 2.6 2.7 15.4 0 18-2.7-2.6-2.7-15.4 0-18Z" stroke="currentColor" stroke-width="1.4"/></svg>`}
  function iconMail(){return `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M4 7l8 6 8-6" stroke="currentColor" stroke-width="1.4"/></svg>`}
  function iconIg(){return `<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.4"/><circle cx="17" cy="7" r="1" fill="currentColor"/></svg>`}
  function iconFb(){return `<svg viewBox="0 0 24 24" fill="none"><path d="M14 9h2V6h-2c-1.7 0-3 1.3-3 3v2H8v3h3v6h3v-6h2.2l.8-3H14V9z" fill="currentColor"/></svg>`}
})();