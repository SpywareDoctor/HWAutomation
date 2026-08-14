function 查找已连接IP() {
  const 输入框 = document.querySelector('input.browser-bar[name="ip"]');
  return 输入框 ? 输入框.value.trim() : null;
}

function 是否有下载选项(行) {
  return !!行.querySelector(".he16-download");
}

function 采集软件表格() {
  const 条目列表 = [];
  for (const 行 of document.querySelectorAll("table.table-software tbody tr[id]")) {
    if (!是否有下载选项(行)) continue;
    const 单元格 = 行.querySelectorAll("td");
    if (单元格.length < 4) continue;
    const 名称 = 单元格[1].textContent.trim();
    const 版本 = 单元格[2].textContent.trim();
    const 大小 = 单元格[3].textContent.trim();
    if (!名称) continue;
    条目列表.push({ name: 名称, version: 版本, size: 大小 });
  }
  return 条目列表;
}

async function 收集软件清单() {
  const { softwareGather: 采集配置 } = await chrome.storage.local.get("softwareGather");
  if (!采集配置 || !采集配置.running) return;

  const IP地址 = 查找已连接IP();
  if (!IP地址) return;

  const 条目列表 = 采集软件表格();
  if (条目列表.length === 0) return;

  const { softwareGatherEntries: 已采集条目 = {} } = await chrome.storage.local.get("softwareGatherEntries");
  已采集条目[IP地址] = { items: 条目列表, gatheredAt: Date.now() };
  await chrome.storage.local.set({ softwareGatherEntries: 已采集条目 });
  console.log("[HWAuto] gathered", 条目列表.length, "software item(s) from", IP地址);
}
