(async function(){
  // 取得 URL 參數 ?city=
  const params = new URLSearchParams(location.search);
  const citySlug = params.get('city') || 'kuching';

  // 標題處理
  const cityTitle = document.getElementById('cityTitle');
  const cityDesc  = document.getElementById('cityDesc');
  const grid      = document.getElementById('grid');

  cityTitle.textContent = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
  cityDesc.textContent = "Discover places and local stories from " + cityTitle.textContent + ".";

  // 嘗試載入該城市的資料
  try{
    const res = await fetch(`data/cities/${citySlug}.json?cb=${Date.now()}`);
    if(!res.ok) throw new Error('no file');
    const places = await res.json();

    if(!Array.isArray(places) || places.length===0){
      grid.innerHTML = `<p>No data found for ${citySlug} yet.</p>`;
      return;
    }

    // 生成卡片
    grid.innerHTML = places.map(p=>`
      <a class="place-card" href="place.html?id=${p.id}">
        <img src="${p.cover}" alt="${p.name}">
        <h3>${p.name}</h3>
        <p>${p.category || ''}</p>
        <div style="margin:0 16px 16px;">
          ${(p.tags||[]).map(t=>`<span class="chip">${t}</span>`).join('')}
        </div>
      </a>
    `).join('');
  }
  catch(err){
    console.warn(err);
    grid.innerHTML = `<p>資料載入失敗，請稍後再試。</p>`;
  }
})();