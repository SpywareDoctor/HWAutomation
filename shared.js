
function 获取标签页ID() {
  return new Promise((完成) => {
    chrome.runtime.sendMessage({ action: "getTabId" }, (响应) => 完成(响应?.tabId));
  });
}

function 查找倒计时剩余毫秒() {
  const 元素 = document.querySelector(".elapsed");
  if (!元素) return null;
  const 匹配 = 元素.textContent.trim().match(/(\d+)\s*h\s*:\s*(\d+)\s*m\s*:\s*(\d+)\s*s/i);
  if (!匹配) return null;
  const [, 时, 分, 秒] = 匹配.map(Number);
  return ((时 * 60 + 分) * 60 + 秒) * 1000;
}

function 等待条件成立(查找函数, 超时毫秒, 状态, 跳过倒计时检测) {
  return new Promise((完成) => {
    const 开始时间 = Date.now();
    let 已用倒计时等待 = false;
    (function 轮询() {
      const 已耗时 = Date.now() - 开始时间;
      if (已耗时 >= 超时毫秒) return 完成(null);

      if (!跳过倒计时检测 && !已用倒计时等待) {
        const 倒计时毫秒 = 查找倒计时剩余毫秒();
        if (倒计时毫秒 != null) {
          已用倒计时等待 = true;
          const 延迟 = Math.min(倒计时毫秒 + 2000, 超时毫秒 - 已耗时);
          console.log("[HWAuto] elapsed timer found, pausing", 延迟, "ms before continuing");
          return setTimeout(轮询, 延迟);
        }
      }

      const 结果 = 查找函数(状态);
      if (结果) return 完成(结果);

      setTimeout(轮询, 400);
    })();
  });
}

function 按值查找提交按钮(目标值) {
  for (const 输入项 of document.querySelectorAll('input[type="submit"]')) {
    if (输入项.value.trim().toLowerCase() === 目标值.toLowerCase()) return 输入项;
  }
  return null;
}

function 设置输入框值(元素, 值) {
  元素.value = 值;
  元素.dispatchEvent(new Event("input", { bubbles: true }));
  元素.dispatchEvent(new Event("change", { bubbles: true }));
}

function 查找登出控件() {
  for (const 元素 of document.querySelectorAll(".hide-phone")) {
    if (元素.textContent.trim() === "Logout") return 元素.closest("a") || 元素;
  }
  return null;
}

function 查找软件行链接(文件名, 文件版本, 链接子串) {
  for (const 行 of document.querySelectorAll("tr[id]")) {
    const 单元格 = 行.querySelectorAll("td");
    if (单元格.length < 3) continue;
    if (单元格[1].textContent.trim() === 文件名 && (文件版本 == null || 单元格[2].textContent.trim() === 文件版本)) {
      return 行.querySelector(`a[href*="${链接子串}"]`);
    }
  }
  return null;
}

function 查找软件行(文件名, 文件版本) {
  for (const 行 of document.querySelectorAll("tr[id]")) {
    const 单元格 = 行.querySelectorAll("td");
    if (单元格.length < 3) continue;
    if (单元格[1].textContent.trim() === 文件名 && (文件版本 == null || 单元格[2].textContent.trim() === 文件版本)) return 行;
  }
  return null;
}

function 查找包含文字的错误提示(文字) {
  for (const 元素 of document.querySelectorAll(".alert-danger")) {
    if (元素.textContent.includes(文字)) return 元素;
  }
  return null;
}

function 追加历史记录(运行器, 条目) {
  const 历史记录 = [{ ...条目, at: Date.now() }, ...(运行器.history || [])].slice(0, 15);
  return 历史记录;
}

function 休眠(毫秒) {
  return new Promise((完成) => setTimeout(完成, 毫秒));
}

// 取消卡住的"编辑日志"进程，避免它悄悄吞掉下一次提交
async function 取消陈旧日志编辑进程() {
  try {
    const 响应 = await fetch("/processes");
    const html = await 响应.text();
    const 文档 = new DOMParser().parseFromString(html, "text/html");
    const 进程ID列表 = [];
    for (const 项 of 文档.querySelectorAll("li")) {
      if (!/Edit log/i.test(项.textContent)) continue;
      const 匹配项 = 项.innerHTML.match(/processBlock(\d+)/);
      if (匹配项) 进程ID列表.push(匹配项[1]);
    }
    for (const 进程ID of 进程ID列表) {
      await fetch(`/processes?pid=${进程ID}&del=1`);
    }
    if (进程ID列表.length > 0) console.log("[HWAuto] canceled", 进程ID列表.length, "stale log-edit process(es)");
  } catch (错误) {
    console.log("[HWAuto] cancelStaleLogEditProcesses failed", 错误);
  }
}

// 只删除包含自身IP的行，其余日志原样保留 — 比整页清空更不显眼
function 移除自身IP所在行(文本, 自身IP) {
  if (!自身IP) return "";
  return 文本
    .split(/\r?\n/)
    .filter((行) => !行.includes(自身IP))
    .join("\n");
}

const 步骤稳定延迟毫秒 = 1000;

const 重试闹钟阈值毫秒 = 60000;

async function 运行步骤引擎(存储键, 步骤表) {
  const { [存储键]: 运行器 } = await chrome.storage.local.get(存储键);
  if (!运行器 || !运行器.running) return;

  const 标签页ID = await 获取标签页ID();
  if (标签页ID == null || 运行器.tabId !== 标签页ID) return;

  const 步骤定义 = 步骤表[运行器.step];
  if (!步骤定义) return;

  await 休眠(步骤稳定延迟毫秒);

  const { [存储键]: 当前运行器 } = await chrome.storage.local.get(存储键);
  if (!当前运行器 || !当前运行器.running || 当前运行器.tabId !== 标签页ID || 当前运行器.step !== 运行器.step) return;

  console.log(`[HWAuto] ${存储键}: step`, 运行器.step, "on", location.href);
  const 找到结果 = await 等待条件成立(步骤定义.find, 步骤定义.timeout, 运行器, 步骤定义.skipElapsedGate);
  if (!找到结果) {
    const 重试指令 = 步骤定义.onNotFound?.(运行器);
    if (重试指令) {
      if (重试指令.pause) {
        console.log(`[HWAuto] ${存储键}: pausing -`, 重试指令.reason);
        await chrome.storage.local.set({
          [存储键]: {
            ...运行器,
            ...(重试指令.patch || {}),
            running: false,
            stuckAt: null,
            pausedReason: 重试指令.reason,
            lastAction: Date.now(),
            history: 追加历史记录(运行器, { msg: `${运行器.step}: paused - ${重试指令.reason}`, url: location.href }),
          },
        });
        return;
      }

      console.log(`[HWAuto] ${存储键}:`, 重试指令.reason, "- retrying in", 重试指令.retryDelayMs, "ms");
      const 下一步骤 = 重试指令.next || 运行器.step;
      await chrome.storage.local.set({
        [存储键]: {
          ...运行器,
          step: 下一步骤,
          lastAction: Date.now(),
          history: 追加历史记录(运行器, { msg: `${运行器.step}: ${重试指令.reason}`, url: location.href }),
        },
      });
      if (重试指令.retryDelayMs < 重试闹钟阈值毫秒) {
        setTimeout(async () => {
          const { [存储键]: 最新运行器 } = await chrome.storage.local.get(存储键);
          if (最新运行器 && 最新运行器.running && 最新运行器.tabId === 标签页ID && 最新运行器.step === 下一步骤) {
            if (重试指令.href) {
              location.href = 重试指令.href;
            } else {
              location.reload();
            }
          }
        }, 重试指令.retryDelayMs);
      } else {
        chrome.runtime.sendMessage({
          action: "scheduleReload",
          payload: { tabId: 标签页ID, storageKey: 存储键, step: 下一步骤, href: 重试指令.href || null, delayMs: 重试指令.retryDelayMs },
        });
      }
      return;
    }

    console.log(`[HWAuto] ${存储键}: stuck at`, 运行器.step, "on", location.href);
    await chrome.storage.local.set({
      [存储键]: {
        ...运行器,
        running: false,
        stuckAt: 运行器.step,
        lastAction: Date.now(),
        history: 追加历史记录(运行器, { msg: `stuck: no element found for "${运行器.step}"`, url: location.href }),
      },
    });
    return;
  }

  const 处理结果 = 步骤定义.resolve(找到结果, 运行器) || {};
  const 补丁 = 处理结果.patch || {};
  const 是否完成 = !!处理结果.complete;
  const 是否停止 = !!处理结果.stop;
  const 历史消息 = `${运行器.step}: found + clicked -> ${处理结果.next}${是否完成 ? " (complete)" : ""}`;

  const 更新后的运行器 = {
    ...运行器,
    ...补丁,
    step: 处理结果.next,
    stuckAt: null,
    pausedReason: null,
    running: !是否停止,
    lastAction: Date.now(),
    completedCount: 是否完成 ? (运行器.completedCount || 0) + 1 : 运行器.completedCount || 0,
    history: 追加历史记录(运行器, { msg: 历史消息, url: location.href }),
  };

  await chrome.storage.local.set({ [存储键]: 更新后的运行器 });

  await 步骤定义.perform(找到结果, 更新后的运行器);

  if (是否停止) {
    console.log(`[HWAuto] ${存储键}: finished, stopping`);
    return;
  }

  运行步骤引擎(存储键, 步骤表);
}
