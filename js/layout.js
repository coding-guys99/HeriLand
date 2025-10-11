(async function includeLayout() {
  const [header, footer] = await Promise.all([
    fetch('partials/header.html').then(r=>r.text()),
    fetch('partials/footer.html').then(r=>r.text())
  ]);
  document.body.insertAdjacentHTML('afterbegin', header);
  document.body.insertAdjacentHTML('beforeend', footer);

  // 導航 active 高亮
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-header .nav a').forEach(a=>{
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  // 漢堡菜單
  const btn = document.getElementById('menuToggle');
  if (btn) {
    btn.addEventListener('click', ()=>{
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      document.querySelector('.site-header').classList.toggle('open');
    });
  }

  // 語言切換（占位：若你有 i18n.js，這裡只要觸發它）
  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.value = localStorage.getItem('hl_lang') || 'en';
    langSelect.addEventListener('change', e=>{
      localStorage.setItem('hl_lang', e.target.value);
      if (window.applyI18n) window.applyI18n(e.target.value);
    });
  }

  // 城市下拉：從 /data/cities/index.json 動態載入
  try {
    const res = await fetch('data/cities/index.json?cb=' + Date.now());
    const cities = await res.json(); // [{slug:"kuching", name:{en:"Kuching","zh-TW":"古晋"}, ...}]
    const wrap = document.getElementById('citySelectWrap');
    if (wrap && Array.isArray(cities)) {
      const currentLang = localStorage.getItem('hl_lang') || 'en';
      const sel = document.createElement('select');
      sel.id = 'citySelect';
      cities.forEach(c=>{
        const opt = document.createElement('option');
        opt.value = c.slug;
        opt.textContent = (c.name && c.name[currentLang]) || c.slug;
        sel.appendChild(opt);
      });
      // 依 URL 預選
      const urlCity = (new URLSearchParams(location.search)).get('city');
      if (urlCity) sel.value = urlCity;

      sel.addEventListener('change', ()=>{
        const params = new URLSearchParams(location.search);
        params.set('city', sel.value);
        // 如果在 places.html 就就地刷新；不然導到 places.html
        if ((location.pathname.split('/').pop()||'index.html') === 'places.html') {
          location.search = params.toString();
        } else {
          location.href = 'places.html?' + params.toString();
        }
      });
      wrap.appendChild(sel);
    }
  } catch (e) {
    console.warn('City index load failed', e);
  }
})();