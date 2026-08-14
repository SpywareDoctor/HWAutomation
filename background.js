chrome.runtime.onMessage.addListener((请求, 发送者, 发送响应) => {
  if (请求.action === "getTabId") {
    发送响应({ tabId: 发送者.tab?.id });
    return;
  }
  if (请求.action === "scheduleReload") {
    const { tabId: 标签页ID, storageKey: 存储键, step: 步骤, href: 链接, delayMs: 延迟毫秒 } = 请求.payload;
    const 闹钟名称 = JSON.stringify({ tabId: 标签页ID, storageKey: 存储键, step: 步骤, href: 链接 || null });
    chrome.alarms.create(闹钟名称, { delayInMinutes: Math.max(延迟毫秒 / 60000, 0.5) });
    发送响应({ ok: true });
    return;
  }
  if (请求.action === "openTab") {
    chrome.tabs.create({ url: 请求.payload.url });
    发送响应({ ok: true });
    return;
  }
  if (请求.action === "createAlarm") {
    chrome.alarms.create(请求.payload.name, 请求.payload.options);
    发送响应({ ok: true });
    return;
  }
  if (请求.action === "clearAlarm") {
    chrome.alarms.clear(请求.payload.name);
    发送响应({ ok: true });
    return;
  }
  if (请求.action === "setBadgeText") {
    chrome.action.setBadgeText({ text: 请求.payload.text });
    发送响应({ ok: true });
    return;
  }
  if (请求.action === "download") {
    chrome.downloads.download({ url: 请求.payload.url, filename: 请求.payload.filename });
    发送响应({ ok: true });
  }
});

// 直接从后台服务工作线程抓取/log（credentials: "include"携带会话cookie），
// 无需任何标签页停留在/log上。只标记与上次快照不同的新增行 — 第一次检查只用来建立基线，
// 不会把目标已有的全部日志都当成"新内容"报警。
const 后台日志监控闹钟名称 = "bgLogMonitor";

function 解码日志HTML实体(文本) {
  return 文本
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");
}

// "localhost"是站点自身用来标记"这是我们自己做的操作"的行（括号里的IP是我们的目标，不是入侵者），
// 不应触发警报；日志里出现的其他任何行为者，才是真正"有人连上了我"、值得警报的情况。
function 是否为自身操作行(行) {
  return /-\s*localhost\s/i.test(行);
}

async function 后台检查自身日志() {
  const { bgLogMonitor: 运行器 } = await chrome.storage.local.get("bgLogMonitor");
  if (!运行器 || !运行器.running) return;

  try {
    const 响应 = await fetch("https://hackerwars.io/log", { credentials: "include" });
    const html = await 响应.text();
    const 匹配 = html.match(/<textarea[^>]*name="log"[^>]*>([\s\S]*?)<\/textarea>/i);
    const 文本 = 匹配 ? 解码日志HTML实体(匹配[1]) : "";
    const 行列表 = 文本
      .split(/\r?\n/)
      .map((行) => 行.trim())
      .filter(Boolean);

    const 已有基线 = (运行器.knownLines || []).length > 0;
    const 已知集合 = new Set(运行器.knownLines || []);
    const 新增行列表 = 行列表.filter((行) => !已知集合.has(行));
    const 入侵行列表 = 新增行列表.filter((行) => !是否为自身操作行(行));

    const 更新后的状态 = { ...运行器, lastCheck: Date.now(), knownLines: 行列表.slice(0, 200) };
    if (已有基线 && 入侵行列表.length > 0) {
      更新后的状态.lastAlertAt = Date.now();
      更新后的状态.alertLines = 入侵行列表.slice(0, 20);
      chrome.action.setBadgeText({ text: String(入侵行列表.length) });
      chrome.action.setBadgeBackgroundColor({ color: "#d33" });
    }

    await chrome.storage.local.set({ bgLogMonitor: 更新后的状态 });
  } catch (错误) {
    console.log("[HWAuto] background log monitor check failed", 错误);
  }
}

chrome.alarms.onAlarm.addListener((闹钟) => {
  if (闹钟.name === 后台日志监控闹钟名称) {
    后台检查自身日志();
    return;
  }

  let 信息;
  try {
    信息 = JSON.parse(闹钟.name);
  } catch {
    return;
  }
  const { tabId: 标签页ID, storageKey: 存储键, step: 步骤, href: 链接 } = 信息;
  chrome.storage.local.get(存储键, (数据) => {
    const 运行器 = 数据[存储键];
    if (!运行器 || !运行器.running || 运行器.tabId !== 标签页ID || 运行器.step !== 步骤) return;
    chrome.tabs.get(标签页ID, (标签页) => {
      if (chrome.runtime.lastError || !标签页) return;
      if (链接) {
        chrome.tabs.update(标签页ID, { url: 链接 });
      } else {
        chrome.tabs.reload(标签页ID);
      }
    });
  });
});

chrome.tabs.onRemoved.addListener((标签页ID) => {
  chrome.storage.local.get(
    [
      "logMonitor",
      "logWatcherRunner",
      "missionRunner",
      "ddosRunner",
      "researchRunner",
      "puzzleRunner",
      "massHackRunner",
      "collectRunner",
      "repGrindRunner",
      "repKillRunner",
    ],
    ({
      logMonitor,
      logWatcherRunner,
      missionRunner,
      ddosRunner,
      researchRunner,
      puzzleRunner,
      massHackRunner,
      collectRunner,
      repGrindRunner,
      repKillRunner,
    }) => {
      const 更新集合 = {};
      if (logMonitor && logMonitor.tabId === 标签页ID && logMonitor.running) {
        更新集合.logMonitor = { ...logMonitor, running: false };
      }
      if (logWatcherRunner && logWatcherRunner.tabId === 标签页ID && logWatcherRunner.running) {
        更新集合.logWatcherRunner = { ...logWatcherRunner, running: false };
      }
      if (missionRunner && missionRunner.tabId === 标签页ID && missionRunner.running) {
        更新集合.missionRunner = { ...missionRunner, running: false };
      }
      if (ddosRunner && ddosRunner.tabId === 标签页ID && ddosRunner.running) {
        更新集合.ddosRunner = { ...ddosRunner, running: false };
      }
      if (researchRunner && researchRunner.tabId === 标签页ID && researchRunner.running) {
        更新集合.researchRunner = { ...researchRunner, running: false };
      }
      if (puzzleRunner && puzzleRunner.tabId === 标签页ID && puzzleRunner.running) {
        更新集合.puzzleRunner = { ...puzzleRunner, running: false };
      }
      if (massHackRunner && massHackRunner.tabId === 标签页ID && massHackRunner.running) {
        更新集合.massHackRunner = { ...massHackRunner, running: false };
      }
      if (collectRunner && collectRunner.tabId === 标签页ID && collectRunner.running) {
        更新集合.collectRunner = { ...collectRunner, running: false };
      }
      if (repGrindRunner && repGrindRunner.tabId === 标签页ID && repGrindRunner.running) {
        更新集合.repGrindRunner = { ...repGrindRunner, running: false };
      }
      if (repKillRunner && repKillRunner.tabId === 标签页ID && repKillRunner.running) {
        更新集合.repKillRunner = { ...repKillRunner, running: false };
      }
      if (Object.keys(更新集合).length) chrome.storage.local.set(更新集合);
    }
  );
});
