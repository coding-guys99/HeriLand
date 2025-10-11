// 以 <div data-include="/partials/tabbar.html"></div> 的方式注入 partial
(async () => {
  const hosts = document.querySelectorAll("[data-include]");
  for (const host of hosts) {
    const url = host.getAttribute("data-include");
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      host.outerHTML = await res.text(); // 直接用 partial 取代容器
    } catch (e) {
      console.warn("[include]", url, e);
    }
  }
})();