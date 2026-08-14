
const PUZZLE_ANSWERS = {
  2: "3",
  3: "Eyjafjallajökull",
  4: "12, 4",
  5: "24",
  6: "Area 51",
  7: "4",
  8: "Hacker Wars",
  9: "Too Many Secrets",
  12: "Stay Hungry, Stay Foolish",
  13: "Aramis",
  14: "62.5",
  15: "50",
  16: "5, 1, 94",
  18: "Phoebe, Milena, Naomy",
  19: "4, 3",
  20: "a, d, c",
  21: "3, 3, 9",
  22: "5, 2",
  23: "99+99/99",
  24: "49, 35",
  25: "Every player who buys premium is awesome",
  26: "9, 18",
  27: "To be or not to be",
  28: "Hacker Experience",
  30: "Enigma",
  31: "Penny",
  32: "Nishiyama Onsen Keiunkan",
  33: "Hack The Planet",
  34: "password123",
  35: "47",
  36: "show no remorse",
  37: "Despacito",
  38: "1, 2, 3",
  39: "Diamond, Ruby, Sapphire",
  40: "Kung Fury",
  41: "Morpheus",
  42: "HACKER",
  43: "LCM+L",
  44: "Burj Khalifa",
  45: "Satoshi Nakamoto",
  46: "SHA256",
  47: "10/11/2019",
};

// gotchaMessage：先尝试直接向gotcha.php伪造"已通关"请求（另一个同游戏的机器人用过这招，
// 服务端从未真正验证游戏是否被玩过）。失败或未配置时，照旧回退到手动求解暂停。
const PUZZLE_MANUAL_GAMES = {
  1: { name: "Tic-Tac-Toe", gotchaMessage: "func=tictactoe&status=1" },
  11: { name: "the 2048 tile game", gotchaMessage: "func=2048&type=5" },
  17: { name: "Minesweeper", gotchaMessage: "func=minesweeper", solverUrl: "https://www.logigames.com/minesweeper/solver" },
  29: { name: "Lights Out", gotchaMessage: "func=lightsout", solverUrl: "https://scintilla.dev/lightsout-solver/" },
};

// 记录每个谜题编号的gotcha.php尝试状态。find()必须是同步的，所以请求在第一次轮询时发出，
// 结果在后续轮询中读取，而不是原地await。
const 谜题自动求解尝试记录 = {};

async function 尝试自动破解谜题(消息) {
  try {
    const 响应 = await fetch("/gotcha.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
      body: 消息,
      credentials: "same-origin",
    });
    const 数据 = await 响应.json();
    return 数据.status === "OK";
  } catch (错误) {
    console.log("[HWAuto] gotcha.php auto-solve failed", 错误);
    return false;
  }
}

const PUZZLE_SKIP_TO_FIXED_IP = {
  10: "1.2.3.4",
};

function findFirstPuzzleLink() {
  for (const 链接元素 of document.querySelectorAll('a[href*="internet?ip="]')) {
    const 标签元素 = 链接元素.querySelector(".whois-member");
    if (标签元素 && 标签元素.textContent.trim() === "First Puzzle") return 链接元素;
  }
  return null;
}

function findCrcRow() {
  for (const 行 of document.querySelectorAll("tr[id]")) {
    const 单元格 = 行.querySelectorAll("td");
    if (单元格.length < 3) continue;
    const name = 单元格[1].textContent.trim();
    if (!/\.crc$/i.test(name)) continue;
    const dlLink = 行.querySelector('a[href*="cmd=dl"]');
    if (!dlLink) continue;
    return { name, version: 单元格[2].textContent.trim(), dlLink };
  }
  return null;
}

function findQaAnswerForm() {
  const input = document.querySelector('input[name="qa-answer"]');
  const button = input?.closest("form")?.querySelector('input[type="submit"][value="Submit answer"]');
  return input && button ? { input, button } : null;
}

function findPuzzleNextIp() {
  const 链接元素 = document.querySelector("#puzzle-next a");
  if (!链接元素) return null;
  return new URL(链接元素.href, location.href).searchParams.get("ip");
}

const PUZZLE_STEPS = {
  find_first_puzzle: {
    timeout: 15000,
    find: () => findFirstPuzzleLink(),
    resolve: (元素, 状态) => ({ next: "hack", patch: { puzzleNumber: 状态.puzzleNumber || 1 } }),
    perform: (元素) => 元素.click(),
  },
  hack: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?action=hack"]'),
    resolve: () => ({ next: "post_hack", patch: { currentIp: new URLSearchParams(location.search).get("ip") } }),
    perform: (元素) => 元素.click(),
  },
  post_hack: {
    timeout: 15000,
    find: () => {
      const 暴力破解链接 = document.querySelector('a[href*="method=bf"]');
      if (暴力破解链接) return { kind: "bruteforce", el: 暴力破解链接 };
      const 登录按钮 = 按值查找提交按钮("Login");
      if (登录按钮) return { kind: "login", el: 登录按钮 };
      return null;
    },
    resolve: ({ kind }) => ({ next: kind === "bruteforce" ? "await_login" : "goto_software" }),
    perform: ({ el }) => el.click(),
  },
  await_login: {
    timeout: 120000,
    find: () => 按值查找提交按钮("Login"),
    resolve: () => ({ next: "goto_software" }),
    perform: (元素) => 元素.click(),
  },
  goto_software: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?view=software"]'),
    resolve: () => ({ next: "find_crc" }),
    perform: (元素) => 元素.click(),
  },
  find_crc: {
    timeout: 15000,
    find: () => findCrcRow(),
    resolve: (找到结果) => ({ next: "await_download", patch: { crcFileName: 找到结果.name, crcFileVersion: 找到结果.version } }),
    perform: (找到结果) => 找到结果.dlLink.click(),
  },
  await_download: {
    timeout: 60000,
    find: () => document.body,
    resolve: () => ({ next: "install_crc" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  install_crc: {
    timeout: 15000,
    find: (状态) => 查找软件行链接(状态.crcFileName, 状态.crcFileVersion, "action=install"),
    resolve: () => ({ next: "await_install" }),
    perform: (元素) => 元素.click(),
  },
  await_install: {
    timeout: 60000,
    find: (状态) => {
      const 行 = 查找软件行(状态.crcFileName, 状态.crcFileVersion);
      return 行 && 行.classList.contains("installed") ? true : null;
    },
    resolve: () => ({ next: "delete_old_crc" }),
    perform: () => {},
  },
  delete_old_crc: {
    timeout: 15000,
    find: (状态) => {
      if (!状态.installedCrcFileName) return true;
      if (状态.installedCrcFileName === 状态.crcFileName && 状态.installedCrcFileVersion === 状态.crcFileVersion) return true;
      const 链接 = 查找软件行链接(状态.installedCrcFileName, 状态.installedCrcFileVersion, "action=del");
      return 链接 ? { link: 链接 } : true;
    },
    resolve: (找到结果, 状态) => {
      const 本地补丁 = { installedCrcFileName: 状态.crcFileName, installedCrcFileVersion: 状态.crcFileVersion };
      const 固定IP = PUZZLE_SKIP_TO_FIXED_IP[状态.puzzleNumber];
      return 固定IP
        ? { next: "logout", patch: { ...本地补丁, nextIp: 固定IP, puzzleNumber: 状态.puzzleNumber + 1 } }
        : { next: "find_riddle", patch: 本地补丁 };
    },
    perform: (找到结果) => {
      if (找到结果 && 找到结果.link) 找到结果.link.click();
    },
  },
  // 固定URL，不再依赖cmd=riddle链接查找（曾经不可靠）— 打开刚安装的crc对应的待解谜题。
  // 旧crc卸载是有.elapsed倒计时的真实进程，waitFor的倒计时等待逻辑会先等它完成再调用find()，
  // 所以这里用更长的超时，而不是缩短等待。
  find_riddle: {
    timeout: 120000,
    find: () => document.body,
    resolve: () => ({ next: "answer_qa" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=software&cmd=riddle";
    },
  },
  answer_qa: {
    timeout: 15000,
    find: findQaAnswerForm,
    resolve: (找到结果, 状态) => ({ next: PUZZLE_ANSWERS[状态.puzzleNumber] != null ? "grab_next_ip" : "await_puzzle_solve" }),
    perform: ({ input, button }, 状态) => {
      const 答案 = PUZZLE_ANSWERS[状态.puzzleNumber];
      if (答案 == null) return;
      设置输入框值(input, 答案);
      button.click();
    },
    onNotFound: () => ({
      retryDelayMs: 0,
      reason: "no Q&A gate found, trying auto-solve",
      next: "auto_solve_puzzle",
    }),
  },
  // 只有嵌入式小游戏（没有问答关卡）才会走到这一步。每个谜题编号只会发起一次gotcha.php请求，
  // 失败或没有配置gotchaMessage时落回原来的手动暂停。
  auto_solve_puzzle: {
    timeout: 20000,
    find: (状态) => {
      const 游戏 = PUZZLE_MANUAL_GAMES[状态.puzzleNumber];
      if (!游戏?.gotchaMessage) return "skip";
      if (!(状态.puzzleNumber in 谜题自动求解尝试记录)) {
        谜题自动求解尝试记录[状态.puzzleNumber] = "pending";
        尝试自动破解谜题(游戏.gotchaMessage).then((成功) => {
          谜题自动求解尝试记录[状态.puzzleNumber] = 成功 ? "ok" : "failed";
        });
      }
      const 求解状态 = 谜题自动求解尝试记录[状态.puzzleNumber];
      return 求解状态 === "pending" ? null : 求解状态;
    },
    resolve: (求解状态) => ({ next: 求解状态 === "ok" ? "solved_reload" : "await_puzzle_solve" }),
    perform: () => {},
  },
  // gotcha.php接受了伪造的完成请求 — 刷新页面让其反映已解决状态，就像真正通关后一样。
  solved_reload: {
    timeout: 5000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "grab_next_ip" }),
    perform: () => {
      location.reload();
    },
  },
  await_puzzle_solve: {
    timeout: 50,
    find: (状态) => (状态.continueRequested ? true : null),
    onNotFound: (状态) => {
      const 游戏 = PUZZLE_MANUAL_GAMES[状态.puzzleNumber];
      if (游戏) {
        const 已打开求解器 = 状态.solverTabOpenedFor === 状态.puzzleNumber;
        if (游戏.solverUrl && !已打开求解器) {
          chrome.runtime.sendMessage({ action: "openTab", payload: { url: 游戏.solverUrl } });
        }
        return {
          pause: true,
          reason: `Waiting for you to solve ${游戏.name}`,
          patch: 游戏.solverUrl ? { solverTabOpenedFor: 状态.puzzleNumber } : undefined,
        };
      }
      return {
        pause: true,
        reason: `Puzzle ${状态.puzzleNumber} has no saved answer — solve it manually, then hit Continue (or add it to PUZZLE_ANSWERS).`,
      };
    },
    resolve: () => ({ next: "grab_next_ip", patch: { continueRequested: false } }),
    perform: () => {},
  },
  grab_next_ip: {
    timeout: 15000,
    find: findPuzzleNextIp,
    resolve: (地址, 状态) => ({
      next: "logout",
      patch: { nextIp: 地址, puzzleNumber: 状态.puzzleNumber + 1 },
      complete: true,
    }),
    perform: () => {},
  },
  logout: {
    timeout: 15000,
    find: 查找登出控件,
    resolve: () => ({ next: "goto_next_target" }),
    perform: (元素) => 元素.click(),
  },
  goto_next_target: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "hack" }),
    perform: (页面主体, 状态) => {
      location.href = `https://hackerwars.io/internet?ip=${状态.nextIp}`;
    },
  },
};
