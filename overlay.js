(async function 注入悬浮窗() {
  if (document.getElementById("hwauto-overlay-root")) return;

  const 根节点 = document.createElement("div");
  根节点.id = "hwauto-overlay-root";
  根节点.style.position = "fixed";
  根节点.style.bottom = "16px";
  根节点.style.right = "16px";
  根节点.style.zIndex = "999999";
  document.documentElement.appendChild(根节点);

  const { overlayHidden: 已隐藏 } = await chrome.storage.local.get("overlayHidden");
  if (已隐藏) {
    根节点.style.display = "none";
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.overlayHidden && !changes.overlayHidden.newValue) {
      根节点.style.display = "";
    }
  });

  let html;
  try {
    const 响应 = await fetch(chrome.runtime.getURL("popup.html"));
    html = await 响应.text();
  } catch (错误) {
    console.log("[HWAuto] overlay: failed to load popup.html", 错误);
    return;
  }

  const 文档 = new DOMParser().parseFromString(html, "text/html");

  const 样式元素 = document.createElement("style");
  样式元素.id = "hwauto-overlay-style";
  样式元素.textContent = 文档.querySelector("style")?.textContent || "";
  document.head.appendChild(样式元素);

  const 卡片 = 文档.getElementById("hwauto-card");
  if (!卡片) {
    console.log("[HWAuto] overlay: #hwauto-card not found in popup.html");
    return;
  }
  卡片.classList.add("collapsed");
  const 折叠按钮 = 卡片.querySelector("#hwauto-collapse-toggle");
  if (折叠按钮) 折叠按钮.innerHTML = "&#9650;";
  根节点.appendChild(卡片);

  if (typeof initPopupUI === "function") {
    initPopupUI();
  } else {
    console.log("[HWAuto] overlay: initPopupUI is not defined — check manifest.json script order");
  }
})();
