// js/render/render-home.js
(async function(){
  const wall = document.getElementById('cityWall');
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

  // ===== 排序策略 =====
  // 方案 A：每日固定隨機（不會每刷新都變）
  const todaySeed = new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const cacheKey = 'hl_city_order_' + todaySeed;

  let order;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    // 今日已產生排序
    order = JSON.parse(cached);
  } else {
    // 你可以改 pinCount，代表前 N 個城市固定不動（精選置頂）
    const pinCount = 2; // 例：固定 Kuching、Sibu（視你的 index.json 順序而定）
    const pinned = cities.slice(0, pinCount);
    const rest   = cities.slice(pinCount);
    const shuffled = seededShuffle(rest, todaySeed);
    order = [...pinned, ...shuffled];
    localStorage.setItem(cacheKey, JSON.stringify(order.map(o=>o.slug)));
  }

  // 如果 localStorage 存的是 slug 陣列，轉回城市物件順序
  if (Array.isArray(order) && typeof order[0] === 'string') {
    const bySlug = Object.fromEntries(cities.map(c=>[c.slug, c]));
    order = order.map(slug => bySlug[slug]).filter(Boolean);
  }

  // ===== 產生棋盤節奏（XOX） =====
  // 規則：以格子索引 i 決定 X/O 風格與大小：X、O 交錯；每 4 個出現 1 個 large
  const tileClassFor = (i) => {
    const xo = (i % 2 === 0) ? 'x' : 'o';
    const big = (i % 4 === 0) ? ' large' : '';
    return `${xo}${big}`;
  };

  wall.innerHTML = order.map((c, i) => {
    const name  = (c.name && (c.name[lang] || c.name.en)) || c.slug;
    const cover = c.cover || '';
    const klass = tileClassFor(i);
    const imgTag = cover ? `<img src="${cover}" alt="${escapeHtml(name)}">` : '';
    return `
      <div class="tile ${klass}" data-city="${c.slug}" role="link" tabindex="0" aria-label="Open ${escapeHtml(name)}">
        ${imgTag}
        <span class="label">${escapeHtml(name)}</span>
        <!-- <span class="badge">${i+1}</span> 可關閉編號以更乾淨 -->
      </div>
    `;
  }).join('');

  // 點擊/Enter 進入城市
  wall.addEventListener('click', handleGo);
  wall.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') handleGo(e); });
  function handleGo(e){
    const tile = e.target.closest('.tile');
    if (!tile) return;
    const city = tile.getAttribute('data-city');
    if (city) location.href = `places.html?city=${encodeURIComponent(city)}`;
  }

  // ---------- 工具：Seeded Shuffle（每日固定、不中斷一致） ----------
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
  function xmur3(str){ // 產生數值種子
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
  function mulberry32(a){ // 依種子生成 0~1 隨機數
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