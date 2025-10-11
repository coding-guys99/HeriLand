// js/render/render-home-mobile-4x3.js
(async function(){
  const wall = document.getElementById('xoxWall');
  if (!wall) return;

  // 計算牆高度：視窗高 - header 高度（含邊框） - 一點緩衝
  function setWallHeight(){
    const header = document.querySelector('.site-header');
    const headerH = header ? header.getBoundingClientRect().height : 64;
    const vpH = window.innerHeight;
    const wallH = Math.max(300, vpH - headerH); // 至少 300
    document.documentElement.style.setProperty('--wall-h', wallH + 'px');
  }
  setWallHeight();
  window.addEventListener('resize', setWallHeight);

  // 讀城市資料
  const lang = localStorage.getItem('hl_lang') || 'en';
  let cities = [];
  try{
    const res = await fetch('data/cities/index.json?cb=' + Date.now());
    cities = await res.json();
  }catch(e){
    console.warn('Failed to load cities index', e);
  }

  // 填滿 4×3（12 格）；不夠 12 就補空白磚（不顯示）
  const maxTiles = 12;
  const items = (cities || []).slice(0, maxTiles);
  const blanks = Math.max(0, maxTiles - items.length);

  wall.innerHTML =
    items.map(c => {
      const name  = (c.name && (c.name[lang] || c.name.en)) || c.slug;
      const cover = c.cover || '';
      const img   = cover ? `<img src="${cover}" alt="${escapeHtml(name)}">` : '';
      return `
        <div class="tile" data-city="${c.slug}" role="link" tabindex="0" aria-label="Open ${escapeHtml(name)}">
          ${img}
          <div class="label">${escapeHtml(name)}</div>
        </div>
      `;
    }).join('') +
    Array.from({length: blanks}).map(()=>`<div class="tile" aria-hidden="true"></div>`).join('');

  // 點擊／Enter 導向
  wall.addEventListener('click', go);
  wall.addEventListener('keydown', e => { if (e.key === 'Enter') go(e); });

  function go(e){
    const t = e.target.closest('.tile'); if (!t) return;
    const city = t.getAttribute('data-city'); if (!city) return;
    location.href = `places.html?city=${encodeURIComponent(city)}`;
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
})();