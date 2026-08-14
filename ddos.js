const DEFAULT_VDDOS_OPTIONS = [
  { name: "Advanced DDoS.vddos", version: "5.0", sizeMb: 256 },
  { name: "Intermediate DDoS.vddos", version: "3.0", sizeMb: 0 },
];

function findHdbIps() {
  const IP集合 = new Set();
  for (const 链接元素 of document.querySelectorAll('a[href*="ip="]')) {
    const 地址 = new URL(链接元素.href, location.href).searchParams.get("ip");
    if (地址) IP集合.add(地址);
  }
  if (IP集合.size === 0) {
    const IP正则 = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    let 匹配项;
    while ((匹配项 = IP正则.exec(document.body.innerText))) IP集合.add(匹配项[0]);
  }
  return [...IP集合];
}

function findFreeSpaceMb() {
  const 容器 = [...document.querySelectorAll("span.small")].find(
    (元素) => 元素.querySelector("span.green") && 元素.querySelector("span.red")
  );
  if (!容器) return null;
  const 匹配项 = 容器.querySelector("span.green").textContent.trim().match(/([\d.]+)\s*(GB|MB)/i);
  if (!匹配项) return null;
  const 数值 = parseFloat(匹配项[1]);
  return 匹配项[2].toUpperCase() === "GB" ? 数值 * 1024 : 数值;
}

function findUploadSpeedMBps() {
  for (const 元素 of document.querySelectorAll("span.small")) {
    const 加粗元素 = 元素.querySelector("strong");
    if (!加粗元素 || !/Mbit/i.test(加粗元素.textContent)) continue;
    const 匹配项 = 元素.textContent.match(/([\d.]+)\s*MB\/s\s*-\s*([\d.]+)\s*MB\/s/i);
    if (匹配项) return parseFloat(匹配项[2]);
  }
  return null;
}

function findDdosDuplicateError() {
  return 查找包含文字的错误提示("You already have installed a virus of this type");
}

function findDdosDiskSpaceError() {
  return 查找包含文字的错误提示("You do not have enough disk space");
}

function findDdosRamError() {
  for (const 元素 of document.querySelectorAll(".alert-danger")) {
    if (/\bram\b/i.test(元素.textContent)) return 元素;
  }
  return null;
}

const DDOS_STEPS = {
  goto_link_resolve_ip: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "link_resolve_login1" }),
    perform: (页面主体, 状态) => {
      location.href = `https://hackerwars.io/internet?ip=${状态.downloadCenterIp}`;
    },
  },
  link_resolve_login1: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?action=login"]'),
    resolve: () => ({ next: "link_resolve_login2" }),
    perform: (元素) => 元素.click(),
  },
  link_resolve_login2: {
    timeout: 15000,
    find: () => 按值查找提交按钮("Login"),
    resolve: () => ({ next: "link_resolve_software" }),
    perform: (元素) => 元素.click(),
  },
  link_resolve_software: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "resolve_vddos_links" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  resolve_vddos_links: {
    timeout: 15000,
    find: (状态) => {
      const 选项列表 = 状态.vddosOptions && 状态.vddosOptions.length > 0 ? 状态.vddosOptions : DEFAULT_VDDOS_OPTIONS;
      const 已解析列表 = [];
      for (const 选项 of 选项列表) {
        const 链接 = 查找软件行链接(选项.name, 选项.version, "cmd=up");
        if (链接) 已解析列表.push({ ...选项, uploadUrl: 链接.href });
      }
      return 已解析列表.length > 0 ? 已解析列表 : null;
    },
    resolve: (已解析列表) => ({ next: "link_resolve_return", patch: { vddosOptionsResolved: 已解析列表 } }),
    perform: async (已解析列表, 状态) => {
      await chrome.storage.local.set({
        vddosLinkCache: { optionsKey: JSON.stringify(状态.vddosOptions || []), resolved: 已解析列表 },
      });
    },
  },
  link_resolve_return: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "link_resolve_logout" }),
    perform: (页面主体, 状态) => {
      location.href = `https://hackerwars.io/internet?ip=${状态.downloadCenterIp}`;
    },
  },
  link_resolve_logout: {
    timeout: 15000,
    find: 查找登出控件,
    resolve: (元素, 状态) => ({ next: 状态.ipQueue && 状态.ipQueue.length > 0 ? "goto_target" : "goto_hdb" }),
    perform: (元素) => 元素.click(),
  },
  goto_hdb: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "hdb_export" }),
    perform: () => {
      location.href = "https://hackerwars.io/hdb";
    },
  },
  hdb_export: {
    timeout: 15000,
    find: () => document.querySelector("#hdb-export"),
    resolve: () => ({ next: "hdb_collect" }),
    perform: (元素) => 元素.click(),
  },
  hdb_collect: {
    timeout: 15000,
    find: () => {
      const IP列表 = findHdbIps();
      return IP列表.length > 0 ? IP列表 : null;
    },
    resolve: (IP列表) => ({ next: "goto_target", patch: { ipQueue: IP列表, totalIpCount: IP列表.length } }),
    perform: () => {},
  },
  goto_target: {
    timeout: 15000,
    find: (状态) => (状态.ipQueue && 状态.ipQueue.length > 0 ? 状态.ipQueue[0] : "done"),
    resolve: (找到结果, 状态) =>
      找到结果 === "done"
        ? { next: "goto_target", stop: true }
        : { next: "login1", patch: { currentIp: 找到结果, ipQueue: 状态.ipQueue.slice(1), ddosExcludedSizes: [] } },
    perform: (找到结果) => {
      if (找到结果 !== "done") location.href = `https://hackerwars.io/internet?ip=${找到结果}`;
    },
  },
  login1: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?action=login"]'),
    resolve: () => ({ next: "login2" }),
    perform: (元素) => 元素.click(),
  },
  login2: {
    timeout: 15000,
    find: () => 按值查找提交按钮("Login"),
    resolve: () => ({ next: "goto_software" }),
    perform: (元素) => 元素.click(),
  },
  goto_software: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?view=software"]'),
    resolve: () => ({ next: "check_space" }),
    perform: (元素) => 元素.click(),
  },
  check_space: {
    timeout: 15000,
    find: () => {
      const freeMb = findFreeSpaceMb();
      return freeMb != null ? { freeMb, uploadMBps: findUploadSpeedMBps() } : null;
    },
    resolve: ({ freeMb, uploadMBps }, 状态) => {
      const 最大秒数 = (状态.vddosMaxMinutes || 5) * 60;
      const 已排除集合 = new Set(状态.ddosExcludedSizes || []);
      const 选中项 = [...状态.vddosOptionsResolved]
        .filter((项) => !已排除集合.has(项.sizeMb))
        .sort((a, b) => b.sizeMb - a.sizeMb)
        .find((项) => 项.sizeMb <= freeMb && (uploadMBps == null || 项.sizeMb / uploadMBps <= 最大秒数));
      return 选中项
        ? { next: "upload_ddos", patch: { ddosChoice: 选中项 } }
        : { next: "goto_logs", patch: { ddosSkip: true } };
    },
    perform: () => {},
  },
  upload_ddos: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "click_install" }),
    perform: (页面主体, 状态) => {
      location.href = 状态.ddosChoice.uploadUrl;
    },
  },
  click_install: {
    timeout: 90000,
    skipElapsedGate: true,
    find: (状态) => {
      if (findDdosDiskSpaceError()) return { kind: "no_space" };
      if (findDdosRamError()) return { kind: "no_ram" };
      const 链接 = 查找软件行链接(状态.ddosChoice.name, 状态.ddosChoice.version, "cmd=install");
      return 链接 ? { kind: "install", el: 链接 } : null;
    },
    resolve: (找到结果, 状态) => {
      if (找到结果.kind === "no_space") {
        return {
          next: "check_space",
          patch: { ddosExcludedSizes: [...(状态.ddosExcludedSizes || []), 状态.ddosChoice.sizeMb] },
        };
      }
      if (找到结果.kind === "no_ram") return { next: "goto_logs", patch: { ddosSkip: true } };
      return { next: "wait_infect_done" };
    },
    perform: (找到结果) => {
      if (找到结果.kind === "install") 找到结果.el.click();
    },
  },
  wait_infect_done: {
    timeout: 120000,
    skipElapsedGate: true,
    find: (状态) => {
      if (findDdosDuplicateError()) return { kind: "duplicate" };
      if (document.querySelector(".elapsed")) return null;
      const 行 = 查找软件行(状态.ddosChoice.name, 状态.ddosChoice.version);
      if (!行) return null;
      return 行.classList.contains("installed") || 行.querySelector('a[href*="cmd=uninstall"]') ? { kind: "installed" } : null;
    },
    resolve: (找到结果) => ({ next: "goto_logs", patch: { ddosSkip: 找到结果.kind === "duplicate" } }),
    perform: () => {},
  },
  goto_logs: {
    timeout: 15000,
    find: (状态) => (状态.currentIp === 状态.downloadCenterIp ? true : document.querySelector('a[href="?view=logs"]')),
    resolve: (找到结果, 状态) => (状态.currentIp === 状态.downloadCenterIp ? { next: "logout" } : { next: "clear_logs" }),
    perform: (找到结果) => {
      if (找到结果 !== true) 找到结果.click();
    },
  },
  clear_logs: {
    timeout: 15000,
    find: () => {
      const textarea = 获取日志文本框();
      const button = 获取编辑日志按钮();
      return textarea && button ? { textarea, button } : null;
    },
    resolve: () => ({ next: "logout" }),
    // 只清除包含自身IP的行，而不是整页清空 — 留下目标其他日志更不容易引起怀疑
    perform: async ({ textarea, button }) => {
      await 取消陈旧日志编辑进程();
      textarea.value = 移除自身IP所在行(textarea.value, 获取自身IP());
      button.click();
    },
  },
  logout: {
    timeout: 15000,
    find: 查找登出控件,
    resolve: (元素, 状态) => ({ next: "goto_target", complete: !状态.ddosSkip }),
    perform: (元素) => 元素.click(),
  },
};
