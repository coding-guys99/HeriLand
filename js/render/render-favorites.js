// js/render/render-favorites.js
(async function(){
  const grid  = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const count = document.getElementById('count');
  const clearAllBtn = document.getElementById('clearAll');

  const favIds = window.HLFav.getFavorites();
  updateCount();

  if (!favIds.length){
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  // 讀城市索引
  let cities = [];
  try {
    cities = await fetch('data/cities/index.json?cb='+Date.now()).then(r=>r.json());
  } catch(e){
    console.warn('City index load failed', e);
  }
  const slugs = Array.isArray(cities) && cities.length ? cities.map(c=>c.slug) : [];

  // 讀每個城市的資料（平行）
  const allPlaces = [];
  await Promise.all(slugs.map(async slug=>{
    try{
      const res = await fetch(`data/cities/${slug}.json?cb=${Date.now()}`);
      if (!res.ok) return;
      const arr = await res.json();
      if (Array.isArray(arr)) {
        arr.forEach(p => allPlaces.push({...p, _city: slug}));
      }
    }catch(e){}
  }));

  // 過濾出收藏的項目，並照收藏順序排序
  const favSet = new Set(favIds);
  const list = favIds
    .map(id => allPlaces.find(p => p.id === id))
    .filter(Boolean);

  render(list);

  // 事件：取消收藏（事件委派）
  grid.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('[data-unfav]');
    if (!btn) return;
    const id = btn.getAttribute('data-unfav');
    const ok = window.HLFav.toggleFavorite(id); // 會把它移除
    if (!ok){ // 移除後回傳 false，表示現在不在收藏中
      const card = ev.target.closest('.card');
      card?.parentElement?.removeChild(card);
      // 同步從 list 移除並更新計數/空狀態
      const idx = list.findIndex(x=>x.id===id);
      if (idx>=0) list.splice(idx,1);
      updateCount();
      if (!list.length){
        empty.style.display = 'block';
      }
    }
  });

  // 事件：清空全部
  clearAllBtn.addEventListener('click', ()=>{
    if (!window.confirm('Clear all favorites?')) return;
    window.HLFav.setFavorites([]);
    grid.innerHTML = '';
    updateCount();
    empty.style.display = 'block';
  });

  // -------- helpers --------
  function render(items){
    grid.innerHTML = items.map(p=>`
      <article class="card">
        <a href="place.html?id=${p.id}&city=${p._city}">
          <img src="${p.cover || 'assets/img/placeholder-16x9.jpg'}" alt="${escapeHtml(p.name||'')}">
          <h3>${escapeHtml(p.name||'Unnamed')}</h3>
          <p>${escapeHtml([p.category, cap(p._city)].filter(Boolean).join(' · '))}</p>
        </a>
        <span class="pill">${cap(p._city)}</span>
        <button class="unfav" data-unfav="${p.id}">Remove</button>
      </article>
    `).join('');
  }

  function updateCount(){
    const n = window.HLFav.getFavorites().length;
    count.textContent = `${n} place${n===1?'':'s'}`;
  }
  function cap(s){ return (s||'').charAt(0).toUpperCase() + (s||'').slice(1); }
  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
})();