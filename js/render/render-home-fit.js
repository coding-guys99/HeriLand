// js/render/render-home-fit.js
(async function(){
  const wall = document.getElementById('cityWall');
  const wrap = wall.closest('.city-wall-wrap');
  const lang = localStorage.getItem('hl_lang') || 'en';

  // 讀城市清單
  let cities = [];
  try{
    const res = await fetch('data/cities/index.json?cb='+Date.now());
    cities = await res.json();
  }catch(e){
    console.warn('Failed to load cities index', e);
  }
  if (!Array.isArray(cities) || !cities.length){
    wall.innerHTML = `<div class="empty small">No cities yet.</div>`;
    return;
  }

  // ===== 排序策略：前 N 固定，其餘每日種子洗牌 =====
  const pinCount = 2; // 置頂精選數量（依 index.json 開頭順序）
  const todaySeed = new Date().toISOString().slice(0,10);
  const cacheKey  = 'hl_city_order_' + todaySeed;

  let order;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const slugs = JSON.parse(cached);
    const bySlug = Object.fromEntries(cities.map(c=>[c.slug, c]));
    order = slugs.map(s=>bySlug[s]).filter(Boolean);
  } else {
    const pinned = cities.slice(0, pinCount);
    const rest   = seededShuffle(cities.slice(pinCount), todaySeed);
    order = [...pinned, ...rest];
    localStorage.setItem(cacheKey, JSON.stringify(order.map(o=>o.slug)));
  }

  // ===== 決定欄數（跟 CSS 斷點一致），計算列數 & 設定牆高度 =====
  function currentCols(){
    if (window.matchMedia('(max-width: 640px)').matches) return 2;
    if (window.matchMedia('(max-width: 1200px)').matches) return 3;
    return 4;
  }

  function setWallVars(){
    const cols = currentCols();
    const rows = Math.ceil(order.length / cols);
    // 設定 rows
    document.documentElement.style.setProperty('--rows', rows);

    // 算出牆高（視窗高 - header - main padding - 額外 margin）
    const header = document.querySelector('.site-header');
    const headerH = header ? header.getBoundingClientRect().height : 64;
    const vpH = window.innerHeight;
    const sidePad = 24; // main 上下 padding 合計的估值（你若有改，這裡一起改）
    const wallH = Math.max(240, vpH - headerH - sidePad); // 最少 240px 以免太小
    document.documentElement.style.setProperty('--wall-h', wallH + 'px');
  }

  setWallVars();
  window.addEventListener('resize', setWallVars);

  // ===== 產生 X/O 節奏（不使用 large，確保一頁塞滿） =====
  const xo = (i)=> (i % 2 === 0 ? 'x' : 'o');

  wall.innerHTML = order.map((c, i) => {
    const name  = (c.name && (c.name[lang] || c.name.en)) || c.slug;
    const cover = c.cover || '';
    const klass = xo(i);
    const imgTag = cover ? `<img src="${cover}" alt="${escapeHtml(name)}">` : '';
    return `
      <div class="tile ${klass}" data-city="${c.slug}" role="link" tabindex="0" aria-label="Open ${escapeHtml(name)}">
        ${imgTag}
        <span class="label">${escapeHtml(name)}</span>
      </div>
    `;
  }).join('');

  // 點擊 / Enter 進城市
  wall.addEventListener('click', go);
  wall.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') go(e); });
  function go(e){
    const tile = e.target.closest('.tile'); if (!tile) return;
    const city = tile.getAttribute('data-city'); if (!city) return;
    location.href = `places.html?city=${encodeURIComponent(city)}`;
  }

  // ---------- 工具：Seeded Shuffle ----------
  function seededShuffle(arr, seedStr){
    const arrCopy = arr.slice();
    let seed = xmur3(seedStr)();
    for (let i = arrCopy.length - 1; i > 0; i--) {
      const r = mulberry32(seed + i)();
      const j = Math.floor(r * (i + 1));
      [arrCopy[i], arrCopy[j]] = [arrCopy[j], arrCopy[i]];
    }
    return arrCopy;
  }
  function xmur3(str){
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function(){
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function mulberry32(a){
    return function(){
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
})();