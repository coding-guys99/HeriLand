// js/render/render-detail.js
(async function(){
  // 取得 id &（可選）city
  const params = new URLSearchParams(location.search);
  const pid = params.get('id');
  const hintCity = params.get('city'); // 若從列表帶上 city 可加速

  const $ = (sel)=>document.querySelector(sel);
  const nameEl = $('#name'), coverEl = $('#cover'), catEl = $('#category'),
        tagsEl = $('#tags'), descEl = $('#desc'), addrEl = $('#address'),
        hoursEl = $('#hours'), favBtn = $('#favBtn'),
        navBtn = $('#navBtn'), siteBtn = $('#siteBtn'), waBtn = $('#waBtn');

  if (!pid){
    nameEl.textContent = 'Not found';
    return;
  }

  // 讀取城市索引
  const cities = await fetch('data/cities/index.json?cb='+Date.now()).then(r=>r.json());
  const order = hintCity ? [hintCity, ...cities.map(c=>c.slug).filter(s=>s!==hintCity)] : cities.map(c=>c.slug);

  // 在各城市檔案中尋找目標地點
  let place=null, foundCity=null;
  for (const slug of order){
    try{
      const res = await fetch(`data/cities/${slug}.json?cb=${Date.now()}`);
      if (!res.ok) continue;
      const arr = await res.json();
      place = Array.isArray(arr) ? arr.find(x=>x.id===pid) : null;
      if (place){ foundCity = slug; break; }
    }catch(e){}
  }

  if (!place){
    nameEl.textContent = 'Place not found';
    return;
  }

  // 渲染基本訊息
  document.title = `${place.name} — HeriLand`;
  nameEl.textContent = place.name || 'Unnamed';
  catEl.textContent  = [place.category, foundCity?.[0]?.toUpperCase()+foundCity?.slice(1)]
    .filter(Boolean).join(' · ');
  coverEl.src = place.cover || 'assets/img/placeholder-16x9.jpg';
  coverEl.alt = place.name || '';

  tagsEl.innerHTML = (place.tags||[]).map(t=>`<span class="chip">${t}</span>`).join('');
  descEl.textContent = place.highlights || place.desc || '';
  addrEl.textContent = place.address ? `📍 ${place.address}` : '';
  hoursEl.textContent= place.opening_hours ? `🕒 ${place.opening_hours}` : '';

  // 收藏按鈕
  const setFavUI = (fav)=> {
    favBtn.setAttribute('aria-pressed', String(fav));
    favBtn.textContent = fav ? '★ Saved' : '☆ Save';
  };
  setFavUI(window.HLFav.isFavorite(place.id));
  favBtn.addEventListener('click', ()=>{
    const fav = window.HLFav.toggleFavorite(place.id);
    setFavUI(fav);
  });

  // 導航/外部連結
  const lat = Number(place.lat), lng = Number(place.lng);
  if (!Number.isNaN(lat) && !Number.isNaN(lng)){
    const q = encodeURIComponent(`${lat},${lng} (${place.name||''})`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;
    navBtn.href = mapsUrl;
  } else {
    navBtn.style.display = 'none';
  }

  if (place.website){ siteBtn.href = place.website; siteBtn.style.display='inline-block'; }
  if (place.whatsapp){ waBtn.href = `https://wa.me/${place.whatsapp}`; waBtn.style.display='inline-block'; }

  // 地圖（Leaflet）
  if (!Number.isNaN(lat) && !Number.isNaN(lng) && window.L){
    const map = L.map('map', { scrollWheelZoom:false }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    L.marker([lat,lng]).addTo(map).bindPopup(place.name || '').openPopup();
  } else {
    document.getElementById('map').style.display = 'none';
  }
})();