function initPopupUI() {
const logEl = document.getElementById("log");

function log(msg) {
  const time = new Date().toLocaleTimeString();
  logEl.textContent = `[${time}] ${msg}\n` + logEl.textContent;
}

const mainMenuEl = document.getElementById("mainMenu");
let activeSubmenuId = null;

function hideAll() {
  mainMenuEl.classList.add("hidden");
  for (const submenu of document.querySelectorAll(".submenu")) submenu.classList.remove("active");
  for (const panel of document.querySelectorAll(".module-panel")) panel.classList.remove("active");
}

function showMainMenu() {
  hideAll();
  mainMenuEl.classList.remove("hidden");
  activeSubmenuId = null;
}

function showSubmenu(submenuId) {
  hideAll();
  document.getElementById(submenuId).classList.add("active");
  activeSubmenuId = submenuId;
}

function showPanel(panelId) {
  hideAll();
  for (const panel of document.querySelectorAll(".module-panel")) {
    panel.classList.toggle("active", panel.id === panelId);
  }
}

for (const groupBtn of document.querySelectorAll("#mainMenu [data-group]")) {
  groupBtn.addEventListener("click", () => showSubmenu(groupBtn.dataset.group));
}
for (const item of document.querySelectorAll(".submenu .menu-item[data-target]")) {
  item.addEventListener("click", () => showPanel(item.dataset.target));
}
for (const backToMainBtn of document.querySelectorAll("[data-back-to-main]")) {
  backToMainBtn.addEventListener("click", showMainMenu);
}
for (const backBtn of document.querySelectorAll(".module-panel [data-back]")) {
  backBtn.addEventListener("click", () => (activeSubmenuId ? showSubmenu(activeSubmenuId) : showMainMenu()));
}

document.getElementById("setupBtn").addEventListener("click", () => {
  activeSubmenuId = null;
  showPanel("panel-setup");
});

const hwautoCardEl = document.getElementById("hwauto-card");
const hwautoCollapseToggleEl = document.getElementById("hwauto-collapse-toggle");
hwautoCollapseToggleEl.addEventListener("click", () => {
  const collapsed = hwautoCardEl.classList.toggle("collapsed");
  hwautoCollapseToggleEl.innerHTML = collapsed ? "&#9650;" : "&#9660;";
});

document.getElementById("hwauto-hide-toggle").addEventListener("click", async () => {
  await chrome.storage.local.set({ overlayHidden: true });
  const overlayRoot = document.getElementById("hwauto-overlay-root");
  if (overlayRoot) overlayRoot.style.display = "none";
});

const hasTabsApi = typeof chrome !== "undefined" && !!chrome.tabs;

if (hasTabsApi) {
  chrome.storage.local.set({ overlayHidden: false });
}

const ALL_RUNNER_KEYS = [
  "researchRunner",
  "collectRunner",
  "repGrindRunner",
  "repKillRunner",
  "logMonitor",
  "bgLogMonitor",
  "logWatcherRunner",
  "softwareGather",
  "missionRunner",
  "ddosRunner",
  "puzzleRunner",
  "massHackRunner",
];

document.getElementById("stopAllBtn").addEventListener("click", async () => {
  const stored = await chrome.storage.local.get(ALL_RUNNER_KEYS);
  const updates = {};
  let stoppedCount = 0;
  for (const key of ALL_RUNNER_KEYS) {
    const runner = stored[key];
    if (runner && runner.running) {
      updates[key] = { ...runner, running: false };
      stoppedCount++;
    }
  }
  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
  clearBgAlarm("bgLogMonitor");
  log(stoppedCount > 0 ? `Stopped ${stoppedCount} running task(s).` : "Nothing was running.");
  renderResearchStatus();
  renderCollectStatus();
  renderRepGrindStatus();
  renderRepKillStatus();
  renderLogMonitorStatus();
  渲染后台日志监控状态();
  renderLogWatcherStatus();
  renderSoftwareGatherStatus();
  renderMissionStatus();
  renderDdosStatus();
  renderPuzzleStatus();
  renderMassHackStatus();
});

async function getActiveTab() {
  if (hasTabsApi) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }
  const tabId = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getTabId" }, (response) => resolve(response?.tabId));
  });
  return { id: tabId, url: location.href };
}

function navigateTab(tabId, url) {
  if (hasTabsApi) {
    chrome.tabs.update(tabId, { url });
  } else {
    location.href = url;
  }
}

function reloadTab(tabId) {
  if (hasTabsApi) {
    chrome.tabs.reload(tabId);
  } else {
    location.reload();
  }
}

function createBgAlarm(name, options) {
  if (hasTabsApi) {
    chrome.alarms.create(name, options);
  } else {
    chrome.runtime.sendMessage({ action: "createAlarm", payload: { name, options } });
  }
}

function clearBgAlarm(name) {
  if (hasTabsApi) {
    chrome.alarms.clear(name);
  } else {
    chrome.runtime.sendMessage({ action: "clearAlarm", payload: { name } });
  }
}

function setToolbarBadgeText(text) {
  if (hasTabsApi) {
    chrome.action.setBadgeText({ text });
  } else {
    chrome.runtime.sendMessage({ action: "setBadgeText", payload: { text } });
  }
}

function downloadTextFile(text, mimeType, filename) {
  const url = `data:${mimeType};charset=utf-8,${encodeURIComponent(text)}`;
  if (hasTabsApi) {
    chrome.downloads.download({ url, filename });
  } else {
    chrome.runtime.sendMessage({ action: "download", payload: { url, filename } });
  }
}

function parseIpList(text) {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseSizeToMb(text) {
  const match = text.trim().match(/([\d.]+)\s*(GB|MB)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return match[2].toUpperCase() === "GB" ? value * 1024 : value;
}

function parseVddosOptions(text) {
  const options = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^(.*\S)\s+([\d.]+\s*(?:mb|gb))$/i);
    if (!match) continue;
    const sizeMb = parseSizeToMb(match[2]);
    if (sizeMb == null) continue;
    options.push({ name: match[1], sizeMb });
  }
  return options;
}

const SETUP_IP_FIELDS = [
  { key: "downloadCenter", id: "setupIpDownloadCenter", label: "Download Center" },
  { key: "firstInternational", id: "setupIpFirstInternational", label: "First International" },
  { key: "hebc", id: "setupIpHebc", label: "HEBC" },
  { key: "americanExpense", id: "setupIpAmericanExpense", label: "American Expense" },
  { key: "swissInternationalBank", id: "setupIpSwissInternationalBank", label: "Swiss International Bank" },
  { key: "ultimateBank", id: "setupIpUltimateBank", label: "Ultimate Bank" },
];
const BANK_LABELS = Object.fromEntries(
  SETUP_IP_FIELDS.filter((f) => f.key !== "downloadCenter").map((f) => [f.key, f.label])
);

async function loadSetupIps() {
  const { setupIps } = await chrome.storage.local.get("setupIps");
  const ips = setupIps || {};
  for (const field of SETUP_IP_FIELDS) {
    document.getElementById(field.id).value = ips[field.key] || "";
  }
  const setCount = SETUP_IP_FIELDS.filter((f) => ips[f.key]).length;
  document.getElementById("setupStatus").textContent = `${setCount}/${SETUP_IP_FIELDS.length} IP(s) set`;
}

document.getElementById("setupSaveBtn").addEventListener("click", async () => {
  const ips = {};
  for (const field of SETUP_IP_FIELDS) {
    const value = document.getElementById(field.id).value.trim();
    if (value) ips[field.key] = value;
  }
  await chrome.storage.local.set({ setupIps: ips });
  log("Setup saved.");
  loadSetupIps();
});

function formatHistory(history) {
  if (!history || history.length === 0) return "";
  const lines = history.slice(0, 5).map((h) => `[${new Date(h.at).toLocaleTimeString()}] ${h.msg}`);
  return "\n\nRecent:\n" + lines.join("\n");
}

async function renderResearchStatus() {
  const { researchRunner } = await chrome.storage.local.get("researchRunner");
  const el = document.getElementById("researchStatus");
  if (!researchRunner) {
    el.textContent = "idle";
    return;
  }
  const lines = [];
  if (researchRunner.running) {
    lines.push(`running: ${researchRunner.step}`);
  } else if (researchRunner.stuckAt) {
    lines.push(`stuck at: ${researchRunner.stuckAt}`);
  } else {
    lines.push(`stopped (${researchRunner.step || "idle"})`);
  }
  lines.push(`cycles completed: ${researchRunner.completedCount || 0}`);
  el.textContent = lines.join("\n") + formatHistory(researchRunner.history);
}

document.getElementById("researchStartBtn").addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab.url || !tab.url.includes("/university")) {
    log("Open the university research page for the item first, then hit Start.");
    return;
  }
  const researchCycles = parseFloat(document.getElementById("researchCycles").value) || 1;
  const { researchRunner: prev } = await chrome.storage.local.get("researchRunner");
  await chrome.storage.local.set({
    researchRunner: {
      running: true,
      tabId: tab.id,
      step: "goto_university",
      stuckAt: null,
      universityUrl: tab.url,
      researchCycles,
      completedCount: prev?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  reloadTab(tab.id);
  log("Research 任务 started.");
  renderResearchStatus();
});

document.getElementById("researchStopBtn").addEventListener("click", async () => {
  const { researchRunner } = await chrome.storage.local.get("researchRunner");
  if (!researchRunner) return;
  await chrome.storage.local.set({ researchRunner: { ...researchRunner, running: false } });
  log("Research 任务 stopped.");
  renderResearchStatus();
});

async function renderCollectStatus() {
  const { collectRunner } = await chrome.storage.local.get("collectRunner");
  const el = document.getElementById("collectStatus");
  if (!collectRunner) {
    el.textContent = "idle";
    return;
  }
  const lines = [];
  if (collectRunner.running) {
    lines.push(`running: ${collectRunner.step}`);
  } else if (collectRunner.stuckAt) {
    lines.push(`stuck at: ${collectRunner.stuckAt}`);
  } else {
    lines.push(`stopped (${collectRunner.step || "idle"})`);
  }
  lines.push(`collections completed: ${collectRunner.completedCount || 0}`);
  el.textContent = lines.join("\n") + formatHistory(collectRunner.history);
}

const COLLECT_MIN_INTERVAL_MINUTES = 10.5;
const COLLECT_DEFAULT_INTERVAL_MINUTES = 60;
const collectIntervalEl = document.getElementById("collectIntervalMinutes");

async function loadCollectInterval() {
  const { collectIntervalMinutes } = await chrome.storage.local.get("collectIntervalMinutes");
  collectIntervalEl.value = collectIntervalMinutes || COLLECT_DEFAULT_INTERVAL_MINUTES;
}

document.getElementById("collectStartBtn").addEventListener("click", async () => {
  let minutes = parseFloat(collectIntervalEl.value);
  if (!minutes || minutes < COLLECT_MIN_INTERVAL_MINUTES) {
    minutes = COLLECT_MIN_INTERVAL_MINUTES;
    collectIntervalEl.value = minutes;
    log(`Collect interval can't go below ${COLLECT_MIN_INTERVAL_MINUTES} minutes (site cooldown) — using that instead.`);
  }
  await chrome.storage.local.set({ collectIntervalMinutes: minutes });

  const tab = await getActiveTab();
  const { collectRunner: prev } = await chrome.storage.local.get("collectRunner");
  await chrome.storage.local.set({
    collectRunner: {
      running: true,
      tabId: tab.id,
      step: "goto_list",
      stuckAt: null,
      collectIntervalMs: minutes * 60 * 1000,
      completedCount: prev?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  navigateTab(tab.id, "https://hackerwars.io/list.php?action=collect");
  log(`Collect 任务 started (every ${minutes}m).`);
  renderCollectStatus();
});

document.getElementById("collectStopBtn").addEventListener("click", async () => {
  const { collectRunner } = await chrome.storage.local.get("collectRunner");
  if (!collectRunner) return;
  await chrome.storage.local.set({ collectRunner: { ...collectRunner, running: false } });
  log("Collect 任务 stopped.");
  renderCollectStatus();
});

async function renderRepGrindStatus() {
  const { repGrindRunner } = await chrome.storage.local.get("repGrindRunner");
  const el = document.getElementById("repGrindStatus");
  if (!repGrindRunner) {
    el.textContent = "idle";
    return;
  }
  const lines = [];
  if (repGrindRunner.running) {
    lines.push(`running: ${repGrindRunner.step}`);
  } else if (repGrindRunner.stuckAt) {
    lines.push(`stuck at: ${repGrindRunner.stuckAt}`);
  } else {
    lines.push(`stopped (${repGrindRunner.step || "idle"})`);
  }
  lines.push(`grinds completed: ${repGrindRunner.completedCount || 0}`);
  el.textContent = lines.join("\n") + formatHistory(repGrindRunner.history);
}

const repGrindUseExploitEl = document.getElementById("repGrindUseExploit");
const repGrindUseBruteforceEl = document.getElementById("repGrindUseBruteforce");
const repGrindIpEl = document.getElementById("repGrindIp");
const repGrindBankTransferEl = document.getElementById("repGrindBankTransfer");
const repGrindBankAccountFromEl = document.getElementById("repGrindBankAccountFrom");
const repGrindBankAccountToEl = document.getElementById("repGrindBankAccountTo");
const repGrindBankIpEl = document.getElementById("repGrindBankIp");
const repGrindBankStatusEl = document.getElementById("repGrindBankStatus");

async function loadRepGrindMethods() {
  const { repGrindMethods } = await chrome.storage.local.get("repGrindMethods");
  repGrindUseExploitEl.checked = repGrindMethods ? repGrindMethods.exploit : true;
  repGrindUseBruteforceEl.checked = repGrindMethods ? repGrindMethods.bruteforce : true;
}

async function loadRepGrindBankAccount() {
  const { repGrindBankAccount } = await chrome.storage.local.get("repGrindBankAccount");
  const accountFrom = repGrindBankAccount?.accountFrom || "";
  const accountTo = repGrindBankAccount?.accountTo || "";
  const ip = repGrindBankAccount?.ip || "";
  repGrindBankAccountFromEl.value = accountFrom;
  repGrindBankAccountToEl.value = accountTo;
  repGrindBankIpEl.value = ip;
  repGrindBankStatusEl.textContent =
    accountFrom || accountTo || ip ? `saved: from ${accountFrom || "-"} / to ${accountTo || "-"} / ip ${ip || "-"}` : "not set";
}

document.getElementById("repGrindBankSaveBtn").addEventListener("click", async () => {
  const accountFrom = repGrindBankAccountFromEl.value.trim();
  const accountTo = repGrindBankAccountToEl.value.trim();
  const ip = repGrindBankIpEl.value.trim();
  await chrome.storage.local.set({ repGrindBankAccount: { accountFrom, accountTo, ip } });
  log("Bank transfer info saved.");
  loadRepGrindBankAccount();
});

document.getElementById("repGrindStartBtn").addEventListener("click", async () => {
  const useExploit = repGrindUseExploitEl.checked;
  const useBruteforce = repGrindUseBruteforceEl.checked;
  const useBankTransfer = repGrindBankTransferEl.checked;
  const needsTarget = useExploit || useBruteforce;

  const targetIp = repGrindIpEl.value.trim();
  if (needsTarget && !targetIp) {
    log("Enter a target IP before starting Rep Grind (needed for Use Exploit/Use Bruteforce).");
    return;
  }

  const bankAccountFrom = repGrindBankAccountFromEl.value.trim();
  const bankAccountTo = repGrindBankAccountToEl.value.trim();
  const bankIp = repGrindBankIpEl.value.trim();
  if (useBankTransfer && (!bankAccountFrom || !bankAccountTo || !bankIp)) {
    log("Bank Transfer needs account from, account to, and Bank IP all filled in before starting.");
    return;
  }

  if (!needsTarget && !useBankTransfer) {
    log("Select Use Exploit, Use Bruteforce, or Bank Transfer before starting Rep Grind.");
    return;
  }

  await chrome.storage.local.set({ repGrindMethods: { exploit: useExploit, bruteforce: useBruteforce } });

  const startStep = needsTarget ? "goto_target" : "goto_bank";
  const startUrl = needsTarget ? `https://hackerwars.io/internet?ip=${targetIp}` : `https://hackerwars.io/internet?ip=${bankIp}`;

  const tab = await getActiveTab();
  const { repGrindRunner: prev } = await chrome.storage.local.get("repGrindRunner");
  await chrome.storage.local.set({
    repGrindRunner: {
      running: true,
      tabId: tab.id,
      step: startStep,
      stuckAt: null,
      useExploit,
      useBruteforce,
      repIp: targetIp,
      useBankTransfer,
      bankAccountFrom,
      bankAccountTo,
      bankIp,
      bankPass: needsTarget ? undefined : 1,
      completedCount: prev?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  navigateTab(tab.id, startUrl);
  log(needsTarget ? `Rep grind started against ${targetIp}.` : `Rep grind (bank transfer only) started against bank ${bankIp}.`);
  renderRepGrindStatus();
});

document.getElementById("repGrindStopBtn").addEventListener("click", async () => {
  const { repGrindRunner } = await chrome.storage.local.get("repGrindRunner");
  if (!repGrindRunner) return;
  await chrome.storage.local.set({ repGrindRunner: { ...repGrindRunner, running: false } });
  log("Rep grind stopped.");
  renderRepGrindStatus();
});

async function renderRepKillStatus() {
  const { repKillRunner } = await chrome.storage.local.get("repKillRunner");
  const el = document.getElementById("repKillStatus");
  if (!repKillRunner) {
    el.textContent = "idle";
    return;
  }
  const lines = [];
  if (repKillRunner.running) {
    lines.push(`running: ${repKillRunner.step}`);
  } else if (repKillRunner.stuckAt) {
    lines.push(`stuck at: ${repKillRunner.stuckAt}`);
  } else {
    lines.push(`stopped (${repKillRunner.step || "idle"})`);
  }
  lines.push(`missions killed: ${repKillRunner.completedCount || 0}`);
  el.textContent = lines.join("\n") + formatHistory(repKillRunner.history);
}

document.getElementById("repKillStartBtn").addEventListener("click", async () => {
  const tab = await getActiveTab();
  const { repKillRunner: prev } = await chrome.storage.local.get("repKillRunner");
  await chrome.storage.local.set({
    repKillRunner: {
      running: true,
      tabId: tab.id,
      step: "goto_missions",
      stuckAt: null,
      completedCount: prev?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  navigateTab(tab.id, "https://hackerwars.io/missions");
  log("Rep kill started.");
  renderRepKillStatus();
});

document.getElementById("repKillStopBtn").addEventListener("click", async () => {
  const { repKillRunner } = await chrome.storage.local.get("repKillRunner");
  if (!repKillRunner) return;
  await chrome.storage.local.set({ repKillRunner: { ...repKillRunner, running: false } });
  log("Rep kill stopped.");
  renderRepKillStatus();
});

async function renderLogMonitorStatus() {
  const { logMonitor } = await chrome.storage.local.get("logMonitor");
  const el = document.getElementById("logMonitorStatus");
  if (!logMonitor) {
    el.textContent = "idle";
    return;
  }
  const state = logMonitor.running ? "running" : "stopped";
  const last = logMonitor.lastCheck ? new Date(logMonitor.lastCheck).toLocaleTimeString() : "never";
  el.textContent = `${state} (tab ${logMonitor.tabId})\nlast check: ${last}\ncleared: ${logMonitor.clearedCount || 0}`;
}

document.getElementById("logMonitorStartBtn").addEventListener("click", async () => {
  const tab = await getActiveTab();
  await chrome.storage.local.set({
    logMonitor: { running: true, tabId: tab.id, lastCheck: null, clearedCount: 0 },
  });
  navigateTab(tab.id, "https://hackerwars.io/log");
  log("Log monitor started.");
  renderLogMonitorStatus();
});

document.getElementById("logMonitorStopBtn").addEventListener("click", async () => {
  const { logMonitor } = await chrome.storage.local.get("logMonitor");
  if (!logMonitor) return;
  await chrome.storage.local.set({ logMonitor: { ...logMonitor, running: false } });
  log("Log monitor stop requested (takes effect within ~30s).");
  renderLogMonitorStatus();
});

// chrome.alarms将periodInMinutes下限锁定为1分钟，这已经是能做到的最快轮询间隔。
const 后台日志监控轮询分钟 = 1;

async function 渲染后台日志监控状态() {
  const { bgLogMonitor } = await chrome.storage.local.get("bgLogMonitor");
  const el = document.getElementById("bgLogMonitorStatus");
  if (!bgLogMonitor) {
    el.textContent = "idle";
    return;
  }
  const state = bgLogMonitor.running ? "running" : "stopped";
  const last = bgLogMonitor.lastCheck ? new Date(bgLogMonitor.lastCheck).toLocaleTimeString() : "never";
  const alertLines = bgLogMonitor.alertLines || [];
  const alertMsg = alertLines.length > 0 ? `\n${alertLines.length} new line(s):\n${alertLines.slice(0, 5).join("\n")}` : "";
  el.textContent = `${state}\nlast check: ${last}${alertMsg}`;
}

document.getElementById("bgLogMonitorStartBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({
    bgLogMonitor: { running: true, lastCheck: null, knownLines: [], alertLines: [] },
  });
  createBgAlarm("bgLogMonitor", { periodInMinutes: 后台日志监控轮询分钟 });
  setToolbarBadgeText("");
  log("后台日志监控已启动 — polls /log directly, no tab needed.");
  渲染后台日志监控状态();
});

document.getElementById("bgLogMonitorStopBtn").addEventListener("click", async () => {
  const { bgLogMonitor } = await chrome.storage.local.get("bgLogMonitor");
  if (!bgLogMonitor) return;
  clearBgAlarm("bgLogMonitor");
  await chrome.storage.local.set({ bgLogMonitor: { ...bgLogMonitor, running: false } });
  log("后台日志监控已停止。");
  渲染后台日志监控状态();
});

document.getElementById("bgLogMonitorClearAlertBtn").addEventListener("click", async () => {
  const { bgLogMonitor } = await chrome.storage.local.get("bgLogMonitor");
  if (!bgLogMonitor) return;
  await chrome.storage.local.set({ bgLogMonitor: { ...bgLogMonitor, alertLines: [] } });
  setToolbarBadgeText("");
  渲染后台日志监控状态();
});

async function renderLogWatcherStatus() {
  const { logWatcherRunner } = await chrome.storage.local.get("logWatcherRunner");
  const { gatheredIps = [] } = await chrome.storage.local.get("gatheredIps");
  const el = document.getElementById("logWatcherStatus");
  if (!logWatcherRunner) {
    el.textContent = "idle";
    return;
  }
  const state = logWatcherRunner.running ? "running" : "stopped";
  const last = logWatcherRunner.lastCheck ? new Date(logWatcherRunner.lastCheck).toLocaleTimeString() : "never";
  const gatheredSince = gatheredIps.filter((e) => e.firstSeen >= logWatcherRunner.startedAt).length;
  el.textContent = `${state} (tab ${logWatcherRunner.tabId})\nlast reload: ${last}\ngathered this run: ${gatheredSince}`;
}

document.getElementById("logWatcherStartBtn").addEventListener("click", async () => {
  const tab = await getActiveTab();
  await chrome.storage.local.set({
    logWatcherRunner: { running: true, tabId: tab.id, lastCheck: null, startedAt: Date.now() },
  });
  log("Log watcher started on the current page.");
  renderLogWatcherStatus();
});

document.getElementById("logWatcherStopBtn").addEventListener("click", async () => {
  const { logWatcherRunner } = await chrome.storage.local.get("logWatcherRunner");
  if (!logWatcherRunner) return;
  await chrome.storage.local.set({ logWatcherRunner: { ...logWatcherRunner, running: false } });
  log("Log watcher stop requested (takes effect within ~3s).");
  renderLogWatcherStatus();
});

async function renderGatherStatus() {
  const { gatheredIps = [] } = await chrome.storage.local.get("gatheredIps");
  document.getElementById("gatherStatus").textContent = `${gatheredIps.length} IP(s) gathered`;
}

document.getElementById("gatherExportBtn").addEventListener("click", async () => {
  const { gatheredIps = [] } = await chrome.storage.local.get("gatheredIps");
  if (gatheredIps.length === 0) {
    log("No gathered IPs to export yet.");
    return;
  }
  downloadTextFile(JSON.stringify(gatheredIps, null, 2), "application/json", `hackerwars-gathered-ips-${Date.now()}.json`);
  log(`Exported ${gatheredIps.length} gathered IP(s).`);
});

document.getElementById("gatherClearBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({ gatheredIps: [] });
  log("Cleared gathered IPs.");
  renderGatherStatus();
});

function buildSoftwareGatherCsv(entries) {
  const ips = Object.keys(entries);
  const blocks = ips.map((ip) => {
    const lines = [ip, ...entries[ip].items.map((it) => `${it.name}, ${it.version}, ${it.size}`)];
    return lines.join("\n");
  });
  return blocks.join("\n\n");
}

async function renderSoftwareGatherStatus() {
  const { softwareGather } = await chrome.storage.local.get("softwareGather");
  const { softwareGatherEntries = {} } = await chrome.storage.local.get("softwareGatherEntries");
  const state = softwareGather?.running ? "running" : "stopped";
  const count = Object.keys(softwareGatherEntries).length;
  document.getElementById("softwareGatherStatus").textContent = `${state}\n${count} target(s) gathered`;
}

document.getElementById("softwareGatherStartBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({ softwareGather: { running: true } });
  log("Gather tool enabled — will scrape software from every target you connect to.");
  renderSoftwareGatherStatus();
});

document.getElementById("softwareGatherStopBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({ softwareGather: { running: false } });
  log("Gather tool disabled.");
  renderSoftwareGatherStatus();
});

document.getElementById("softwareGatherExportBtn").addEventListener("click", async () => {
  const { softwareGatherEntries = {} } = await chrome.storage.local.get("softwareGatherEntries");
  const ips = Object.keys(softwareGatherEntries);
  if (ips.length === 0) {
    log("No gathered software to export yet.");
    return;
  }
  const csv = buildSoftwareGatherCsv(softwareGatherEntries);
  downloadTextFile(csv, "text/csv", `hackerwars-software-gather-${Date.now()}.csv`);
  log(`Exported software from ${ips.length} target(s).`);
});

document.getElementById("softwareGatherClearBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({ softwareGatherEntries: {} });
  log("Cleared gathered software.");
  renderSoftwareGatherStatus();
});

async function renderMissionStatus() {
  const { missionRunner } = await chrome.storage.local.get("missionRunner");
  const el = document.getElementById("missionStatus");
  if (!missionRunner) {
    el.textContent = "idle";
    return;
  }
  const lines = [];
  if (missionRunner.running) {
    lines.push(`running: ${missionRunner.step}`);
  } else if (missionRunner.stuckAt) {
    lines.push(`stuck at: ${missionRunner.stuckAt}`);
  } else {
    lines.push(`stopped (${missionRunner.step || "idle"})`);
  }
  if (missionRunner.missionType) lines.push(`type: ${missionRunner.missionType}`);
  if (missionRunner.victimIp) lines.push(`victim: ${missionRunner.victimIp}`);
  if (missionRunner.fileName) lines.push(`file: ${missionRunner.fileName} ${missionRunner.fileVersion || ""}`);
  if (missionRunner.reward) lines.push(`reward: $${missionRunner.reward}`);
  lines.push(`completed: ${missionRunner.completedCount || 0}`);
  el.textContent = lines.join("\n") + formatHistory(missionRunner.history);
}

const MISSION_TYPE_CHECKBOXES = {
  delete: document.getElementById("missionTypeDelete"),
  steal: document.getElementById("missionTypeSteal"),
  bank: document.getElementById("missionTypeBank"),
  transfer: document.getElementById("missionTypeTransfer"),
};

async function loadMissionTypeFilter() {
  const { missionTypeFilter } = await chrome.storage.local.get("missionTypeFilter");
  const enabled = missionTypeFilter || ["delete", "steal", "bank", "transfer"];
  for (const [type, checkbox] of Object.entries(MISSION_TYPE_CHECKBOXES)) {
    checkbox.checked = enabled.includes(type);
  }
}

function getSelectedMissionTypes() {
  return Object.entries(MISSION_TYPE_CHECKBOXES)
    .filter(([, checkbox]) => checkbox.checked)
    .map(([type]) => type);
}

const selfTransferAccountEl = document.getElementById("selfTransferAccount");
const selfTransferIpEl = document.getElementById("selfTransferIp");
const selfTransferStatusEl = document.getElementById("selfTransferStatus");

async function loadSelfTransferAccount() {
  const { selfTransferAccount } = await chrome.storage.local.get("selfTransferAccount");
  if (selfTransferAccount) {
    selfTransferAccountEl.value = selfTransferAccount.account || "";
    selfTransferIpEl.value = selfTransferAccount.bankKey || "";
    const bankLabel = BANK_LABELS[selfTransferAccount.bankKey] || "(no bank selected)";
    const { setupIps } = await chrome.storage.local.get("setupIps");
    const resolvedIp = setupIps?.[selfTransferAccount.bankKey];
    selfTransferStatusEl.textContent = resolvedIp
      ? `saved: ${selfTransferAccount.account} @ ${bankLabel} (${resolvedIp})`
      : `saved: ${selfTransferAccount.account} @ ${bankLabel} — Go do the Setup`;
  } else {
    selfTransferStatusEl.textContent = "not set";
  }
}

document.getElementById("selfTransferSaveBtn").addEventListener("click", async () => {
  const account = selfTransferAccountEl.value.trim();
  const bankKey = selfTransferIpEl.value;
  if (!account || !bankKey) {
    log("Enter an account # and select a bank before saving.");
    return;
  }
  await chrome.storage.local.set({ selfTransferAccount: { account, bankKey } });
  log(`Self-transfer account saved: ${account} @ ${BANK_LABELS[bankKey]}`);
  loadSelfTransferAccount();
});

document.getElementById("missionStartBtn").addEventListener("click", async () => {
  const enabledTypes = getSelectedMissionTypes();
  if (enabledTypes.length === 0) {
    log("Select at least one mission type first.");
    return;
  }
  const needsSelfTransfer = enabledTypes.includes("bank") || enabledTypes.includes("transfer");
  const { selfTransferAccount } = await chrome.storage.local.get("selfTransferAccount");
  if (needsSelfTransfer && (!selfTransferAccount || !selfTransferAccount.bankKey)) {
    log("Set and save a self-transfer account first (needed for bank/transfer missions).");
    return;
  }
  let selfTransferIp = null;
  if (needsSelfTransfer) {
    const { setupIps } = await chrome.storage.local.get("setupIps");
    selfTransferIp = setupIps?.[selfTransferAccount.bankKey];
    if (!selfTransferIp) {
      log("Go do the Setup");
      return;
    }
  }
  await chrome.storage.local.set({ missionTypeFilter: enabledTypes });

  const tab = await getActiveTab();
  const { missionRunner: prev } = await chrome.storage.local.get("missionRunner");
  await chrome.storage.local.set({
    missionRunner: {
      running: true,
      tabId: tab.id,
      step: "find_mission",
      stuckAt: null,
      enabledTypes,
      selfTransferAccount: selfTransferAccount?.account,
      selfTransferIp,
      completedCount: prev?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  navigateTab(tab.id, "https://hackerwars.io/missions");
  log("Mission 任务 started.");
  renderMissionStatus();
});

document.getElementById("missionStopBtn").addEventListener("click", async () => {
  const { missionRunner } = await chrome.storage.local.get("missionRunner");
  if (!missionRunner) return;
  await chrome.storage.local.set({ missionRunner: { ...missionRunner, running: false } });
  log("Mission 任务 stopped.");
  renderMissionStatus();
});

async function renderDdosStatus() {
  const { ddosRunner } = await chrome.storage.local.get("ddosRunner");
  const el = document.getElementById("ddosStatus");
  if (!ddosRunner) {
    el.textContent = "idle";
    return;
  }
  const lines = [];
  if (ddosRunner.running) {
    lines.push(`running: ${ddosRunner.step}`);
  } else if (ddosRunner.stuckAt) {
    lines.push(`stuck at: ${ddosRunner.stuckAt}`);
  } else {
    lines.push(`stopped (${ddosRunner.step || "idle"})`);
  }
  if (ddosRunner.currentIp) lines.push(`target: ${ddosRunner.currentIp}`);
  if (ddosRunner.ipQueue) lines.push(`remaining: ${ddosRunner.ipQueue.length}/${ddosRunner.totalIpCount || 0}`);
  lines.push(`infected: ${ddosRunner.completedCount || 0}`);
  el.textContent = lines.join("\n") + formatHistory(ddosRunner.history);
}

const vddosOptionsEl = document.getElementById("vddosOptions");
const vddosOptionsStatusEl = document.getElementById("vddosOptionsStatus");
const vddosMaxMinutesEl = document.getElementById("vddosMaxMinutes");
const DEFAULT_VDDOS_MAX_MINUTES = 5;

async function loadVddosOptions() {
  const { vddosOptions, vddosMaxMinutes } = await chrome.storage.local.get(["vddosOptions", "vddosMaxMinutes"]);
  if (vddosOptions && vddosOptions.length > 0) {
    vddosOptionsEl.value = vddosOptions.map((o) => `${o.name} ${o.sizeMb}mb`).join("\n");
    vddosOptionsStatusEl.textContent = `saved: ${vddosOptions.length} option(s)`;
  } else {
    vddosOptionsStatusEl.textContent = "not set — using built-in defaults";
  }
  vddosMaxMinutesEl.value = vddosMaxMinutes || DEFAULT_VDDOS_MAX_MINUTES;
}

document.getElementById("vddosOptionsSaveBtn").addEventListener("click", async () => {
  const options = parseVddosOptions(vddosOptionsEl.value);
  if (options.length === 0) {
    log("No valid 病毒 options parsed — each line needs a name and a size (e.g. \"Small DDoS.vddos 50mb\").");
    return;
  }
  const maxMinutes = parseInt(vddosMaxMinutesEl.value, 10) || DEFAULT_VDDOS_MAX_MINUTES;
  await chrome.storage.local.set({ vddosOptions: options, vddosMaxMinutes: maxMinutes });
  log(`Saved ${options.length} vDDoS option(s), max upload time ${maxMinutes}m.`);
  loadVddosOptions();
});

const VDDOS_PRESETS = {
  spam: "Super Spam.vspam 1gb\nAdvanced Spam.vspam 236mb\nDecent Spam.vspam 36mb",
  warez: "Super Warez.vwarez 1gb\nAdvanced Warez.vwarez 236mb\nDecent Warez.vwarez 36mb",
  miner: "Super Miner.vminer 1.7gb\nAdvanced Miner.vminer 413mb\nDecent Miner.vminer 63mb",
};

function applyVddosPreset(name, text) {
  if (vddosOptionsEl.value.trim()) {
    log(`Virus options box already has content — clear it first to load the ${name} preset.`);
    return;
  }
  vddosOptionsEl.value = text;
  log(`Loaded ${name} preset — click Save Virus Options to apply.`);
}

document.getElementById("vddosPresetSpamBtn").addEventListener("click", () => applyVddosPreset("Spam", VDDOS_PRESETS.spam));
document.getElementById("vddosPresetWarezBtn").addEventListener("click", () => applyVddosPreset("Warez", VDDOS_PRESETS.warez));
document.getElementById("vddosPresetMinerBtn").addEventListener("click", () => applyVddosPreset("Miner", VDDOS_PRESETS.miner));

document.getElementById("vddosClearCacheBtn").addEventListener("click", async () => {
  vddosOptionsEl.value = "";
  await chrome.storage.local.remove(["vddosOptions", "vddosLinkCache"]);
  loadVddosOptions();
  const { setupIps } = await chrome.storage.local.get("setupIps");
  if (!setupIps?.downloadCenter) {
    log("Go do the Setup");
  } else {
    log(`Cleared virus options and cached links — download center IP is set (${setupIps.downloadCenter}).`);
  }
});

document.getElementById("ddosStartBtn").addEventListener("click", async () => {
  const tab = await getActiveTab();
  const { ddosRunner: prev } = await chrome.storage.local.get("ddosRunner");
  const { vddosOptions } = await chrome.storage.local.get("vddosOptions");
  const { vddosMaxMinutes } = await chrome.storage.local.get("vddosMaxMinutes");
  const { vddosLinkCache } = await chrome.storage.local.get("vddosLinkCache");
  const { setupIps } = await chrome.storage.local.get("setupIps");
  const manualIps = parseIpList(document.getElementById("ddosIpList").value);
  const afterLinksStep = manualIps.length > 0 ? "goto_target" : "goto_hdb";

  const optionsKey = JSON.stringify(vddosOptions || []);
  const canReuseCache = vddosLinkCache && vddosLinkCache.optionsKey === optionsKey;
  if (!canReuseCache && !setupIps?.downloadCenter) {
    log("Go do the Setup");
    return;
  }

  const base = {
    running: true,
    tabId: tab.id,
    stuckAt: null,
    vddosOptions: vddosOptions || [],
    vddosMaxMinutes: vddosMaxMinutes || DEFAULT_VDDOS_MAX_MINUTES,
    downloadCenterIp: setupIps?.downloadCenter,
    completedCount: prev?.completedCount || 0,
    startedAt: Date.now(),
  };
  if (manualIps.length > 0) {
    base.ipQueue = manualIps;
    base.totalIpCount = manualIps.length;
  }

  if (canReuseCache) {
    base.step = afterLinksStep;
    base.vddosOptionsResolved = vddosLinkCache.resolved;
    log(`Infection module started (reusing cached vDDoS links)${manualIps.length > 0 ? ` with ${manualIps.length} manual IP(s)` : ", auto-scraping /hdb"}.`);
  } else {
    base.step = "goto_link_resolve_ip";
    log(`Infection module started (resolving vDDoS links first)${manualIps.length > 0 ? ` with ${manualIps.length} manual IP(s)` : ""}.`);
  }

  await chrome.storage.local.set({ ddosRunner: base });
  navigateTab(tab.id, "https://hackerwars.io/internet");
  renderDdosStatus();
});

document.getElementById("ddosStopBtn").addEventListener("click", async () => {
  const { ddosRunner } = await chrome.storage.local.get("ddosRunner");
  if (!ddosRunner) return;
  await chrome.storage.local.set({ ddosRunner: { ...ddosRunner, running: false } });
  log("Infection module stopped.");
  renderDdosStatus();
});

async function renderPuzzleStatus() {
  const { puzzleRunner } = await chrome.storage.local.get("puzzleRunner");
  const el = document.getElementById("puzzleStatus");
  if (!puzzleRunner) {
    el.textContent = "idle";
    return;
  }
  const lines = [];
  if (puzzleRunner.running) {
    lines.push(`running: ${puzzleRunner.step}`);
  } else if (puzzleRunner.pausedReason) {
    lines.push(`paused: ${puzzleRunner.pausedReason}`);
  } else if (puzzleRunner.stuckAt) {
    lines.push(`stuck at: ${puzzleRunner.stuckAt}`);
  } else {
    lines.push(`stopped (${puzzleRunner.step || "idle"})`);
  }
  if (puzzleRunner.puzzleNumber) lines.push(`puzzle #: ${puzzleRunner.puzzleNumber}`);
  if (puzzleRunner.currentIp) lines.push(`target: ${puzzleRunner.currentIp}`);
  lines.push(`solved: ${puzzleRunner.completedCount || 0}`);
  el.textContent = lines.join("\n") + formatHistory(puzzleRunner.history);
}

document.getElementById("puzzleStartBtn").addEventListener("click", async () => {
  const tab = await getActiveTab();
  const { puzzleRunner: prev } = await chrome.storage.local.get("puzzleRunner");
  const 起始输入值 = document.getElementById("puzzleStartNumber").value.trim();
  const 起始谜题号 = 起始输入值 === "" ? 1 : Math.max(1, parseInt(起始输入值, 10) || 1);
  const resumeIp = document.getElementById("puzzleResumeIp").value.trim();
  await chrome.storage.local.set({
    puzzleRunner: {
      running: true,
      tabId: tab.id,
      step: resumeIp ? "hack" : "find_first_puzzle",
      stuckAt: null,
      pausedReason: null,
      puzzleNumber: 起始谜题号,
      completedCount: prev?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  if (resumeIp) {
    navigateTab(tab.id, `https://hackerwars.io/internet?ip=${resumeIp}`);
  } else {
    reloadTab(tab.id);
  }
  log(`Puzzle 进行中 started at puzzle #${起始谜题号}${resumeIp ? ` on ${resumeIp}` : ""}.`);
  renderPuzzleStatus();
});

document.getElementById("puzzleStopBtn").addEventListener("click", async () => {
  const { puzzleRunner } = await chrome.storage.local.get("puzzleRunner");
  if (!puzzleRunner) return;
  await chrome.storage.local.set({ puzzleRunner: { ...puzzleRunner, running: false } });
  log("Puzzle 进行中 stopped.");
  renderPuzzleStatus();
});

// 两种暂停状态都能用继续按钮恢复：pausedReason是主动暂停（等你去解谜），
// stuckAt是超时卡住（find()一直没匹配到东西）— 后者直接清掉stuckAt，
// 在当前页面上重新跑同一步，而不是像Start那样强制退回find_first_puzzle/第1题。
document.getElementById("puzzleContinueBtn").addEventListener("click", async () => {
  const { puzzleRunner } = await chrome.storage.local.get("puzzleRunner");
  if (!puzzleRunner || puzzleRunner.running || (!puzzleRunner.pausedReason && !puzzleRunner.stuckAt)) {
    log("Puzzle 进行中 isn't waiting on Continue right now.");
    return;
  }
  await chrome.storage.local.set({
    puzzleRunner: { ...puzzleRunner, running: true, continueRequested: true, pausedReason: null, stuckAt: null },
  });
  reloadTab(puzzleRunner.tabId);
  log("Continuing puzzle 进行中.");
  renderPuzzleStatus();
});

async function renderMassHackStatus() {
  const { massHackRunner } = await chrome.storage.local.get("massHackRunner");
  const el = document.getElementById("massHackStatus");
  if (!massHackRunner) {
    el.textContent = "idle";
    return;
  }
  const lines = [];
  if (massHackRunner.running) {
    lines.push(`running: ${massHackRunner.step}`);
  } else if (massHackRunner.stuckAt) {
    lines.push(`stuck at: ${massHackRunner.stuckAt}`);
  } else {
    lines.push(`stopped (${massHackRunner.step || "idle"})`);
  }
  if (massHackRunner.currentIp) lines.push(`target: ${massHackRunner.currentIp}`);
  if (massHackRunner.ipQueue) lines.push(`remaining: ${massHackRunner.ipQueue.length}/${massHackRunner.totalIpCount || 0}`);
  lines.push(`hacked: ${massHackRunner.completedCount || 0}`);
  el.textContent = lines.join("\n") + formatHistory(massHackRunner.history);
}

document.getElementById("massHackStartBtn").addEventListener("click", async () => {
  const ips = parseIpList(document.getElementById("massHackIpList").value);
  if (ips.length === 0) {
    log("Enter at least one IP first.");
    return;
  }
  const tab = await getActiveTab();
  const { massHackRunner: prev } = await chrome.storage.local.get("massHackRunner");
  await chrome.storage.local.set({
    massHackRunner: {
      running: true,
      tabId: tab.id,
      step: "goto_target",
      stuckAt: null,
      ipQueue: ips,
      totalIpCount: ips.length,
      completedCount: prev?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  navigateTab(tab.id, "https://hackerwars.io/internet");
  log(`Mass Hack started with ${ips.length} IP(s).`);
  renderMassHackStatus();
});

document.getElementById("massHackStopBtn").addEventListener("click", async () => {
  const { massHackRunner } = await chrome.storage.local.get("massHackRunner");
  if (!massHackRunner) return;
  await chrome.storage.local.set({ massHackRunner: { ...massHackRunner, running: false } });
  log("Mass Hack stopped.");
  renderMassHackStatus();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.collectRunner) renderCollectStatus();
  if (changes.repGrindRunner) renderRepGrindStatus();
  if (changes.repKillRunner) renderRepKillStatus();
  if (changes.logMonitor) renderLogMonitorStatus();
  if (changes.bgLogMonitor) 渲染后台日志监控状态();
  if (changes.logWatcherRunner) renderLogWatcherStatus();
  if (changes.gatheredIps) {
    renderGatherStatus();
    renderLogWatcherStatus();
  }
  if (changes.missionRunner) renderMissionStatus();
  if (changes.ddosRunner) renderDdosStatus();
  if (changes.researchRunner) renderResearchStatus();
  if (changes.puzzleRunner) renderPuzzleStatus();
  if (changes.massHackRunner) renderMassHackStatus();
  if (changes.softwareGather || changes.softwareGatherEntries) renderSoftwareGatherStatus();
  if (changes.setupIps) {
    loadSetupIps();
    loadSelfTransferAccount();
  }
});

renderCollectStatus();
renderRepGrindStatus();
renderRepKillStatus();
renderLogMonitorStatus();
渲染后台日志监控状态();
renderLogWatcherStatus();
renderGatherStatus();
renderSoftwareGatherStatus();
renderMissionStatus();
renderDdosStatus();
renderResearchStatus();
renderPuzzleStatus();
renderMassHackStatus();
loadMissionTypeFilter();
loadSelfTransferAccount();
loadVddosOptions();
loadRepGrindMethods();
loadRepGrindBankAccount();
loadCollectInterval();
loadSetupIps();
}

if (document.getElementById("hwauto-card")) {
  initPopupUI();
}
