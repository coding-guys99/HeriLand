// js/store/favorites.js
(function(){
  const KEY = 'hl_favs';

  function getFavorites(){
    try{ return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch{ return []; }
  }
  function setFavorites(arr){
    localStorage.setItem(KEY, JSON.stringify(Array.from(new Set(arr))));
  }
  function isFavorite(id){
    return getFavorites().includes(id);
  }
  function toggleFavorite(id){
    const list = new Set(getFavorites());
    if (list.has(id)) list.delete(id); else list.add(id);
    setFavorites([...list]);
    return list.has(id);
  }

  // 暴露到全域
  window.HLFav = { getFavorites, setFavorites, isFavorite, toggleFavorite };
})();