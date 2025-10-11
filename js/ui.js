/* Minimal UI helpers: bottom sheet + toast */
export const sheet = (() => {
  let cur = null;
  function open(id){ close(); cur = document.getElementById(id); if(cur){ cur.removeAttribute('hidden'); document.body.style.overflow='hidden'; } }
  function close(){ if(cur){ cur.setAttribute('hidden',''); cur=null; document.body.style.overflow=''; } }
  function bindBackdrop(id){ const el = document.getElementById(id); if(!el) return; el.addEventListener('click', e=>{ if(e.target===el) close(); }); }
  return { open, close, bindBackdrop };
})();

export function toast(msg, ms=1800){
  let host = document.getElementById('toasts');
  if(!host){ host = document.createElement('div'); host.id='toasts'; document.body.appendChild(host); }
  const t = document.createElement('div'); t.className='toast'; t.textContent=msg;
  host.appendChild(t);
  setTimeout(()=> t.classList.add('in'), 10);
  setTimeout(()=> { t.classList.remove('in'); setTimeout(()=> t.remove(), 220); }, ms);
}