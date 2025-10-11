(function(){
  const init = () => {
    const bar = document.getElementById('TabBar');
    if (!bar) return;

    // 高亮目前頁
    const path = location.pathname;
    bar.querySelectorAll('.tab[data-match]').forEach(el=>{
      if (path.endsWith(el.dataset.match)) el.classList.add('active');
    });

    // Submit 顯示與點擊（由 config 控制）
    const btn = document.getElementById('tabSubmit');
    fetch('/config/config.json').then(r=>r.ok?r.json():null).then(cfg=>{
      if (!btn || !cfg?.features) return;
      if (cfg.features.submitForm){
        btn.hidden = false;
        btn.addEventListener('click', ()=>{
          const url = cfg.links?.submitFormUrl || '#';
          location.href = url;
        });
      }
    }).catch(()=>{});
  };

  // partial 注入是異步的，這裡等一等
  if (document.readyState === "complete" || document.readyState === "interactive"){
    setTimeout(init, 0);
  } else {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 0));
  }
})();