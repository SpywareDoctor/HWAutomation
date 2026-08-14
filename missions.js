
const MISSION_TITLES = {
  "delete software": "delete",
  "steal software": "steal",
  "check bank status": "bank",
  "transfer money": "transfer",
};

const MISSION_TYPE_PRIORITY = ["transfer", "bank", "steal", "delete"];

function findMissionLink(启用的类型) {
  const 类型列表 = 启用的类型 && 启用的类型.length > 0 ? 启用的类型 : MISSION_TYPE_PRIORITY;
  const 链接列表 = [...document.querySelectorAll('a[href*="?id="]')];
  for (const 类型 of MISSION_TYPE_PRIORITY) {
    if (!类型列表.includes(类型)) continue;
    const 匹配项 = 链接列表.find((链接元素) => MISSION_TITLES[链接元素.textContent.trim().toLowerCase()] === 类型);
    if (匹配项) return { el: 匹配项, missionType: 类型 };
  }
  return null;
}

function findMissionDoesNotExistError() {
  for (const 元素 of document.querySelectorAll(".alert-danger")) {
    if (元素.textContent.includes("This mission does not exist")) return 元素;
  }
  return null;
}

function parseMissionInfo() {
  const 信息 = {};
  for (const 标签元素 of document.querySelectorAll("td .item")) {
    const 标签文字 = 标签元素.textContent.trim();
    const 值单元格 = 标签元素.closest("td")?.nextElementSibling;
    if (!值单元格) continue;
    if (标签文字 === "Victim") {
      const 链接 = 值单元格.querySelector('a[href*="ip="]');
      信息.victimIp = 链接 ? new URL(链接.href, location.href).searchParams.get("ip") : null;
    } else if (标签文字 === "File") {
      const 版本元素 = 值单元格.querySelector(".small");
      信息.fileVersion = 版本元素 ? 版本元素.textContent.trim() : "";
      const 克隆节点 = 值单元格.cloneNode(true);
      克隆节点.querySelector(".small")?.remove();
      信息.fileName = 克隆节点.textContent.trim();
    } else if (标签文字 === "Reward") {
      const 数字字符串 = 值单元格.textContent.replace(/[^0-9]/g, "");
      信息.reward = 数字字符串 ? Number(数字字符串) : null;
    } else if (标签文字 === "Hirer") {
      const 链接 = 值单元格.querySelector('a[href*="ip="]');
      信息.hirerIp = 链接 ? new URL(链接.href, location.href).searchParams.get("ip") : null;
    } else if (标签文字 === "Bank Account") {
      const 克隆节点 = 值单元格.cloneNode(true);
      克隆节点.querySelector("a")?.remove();
      信息.bankAccount = 克隆节点.textContent.trim().replace(/^#/, "");
    } else if (标签文字 === "Account From") {
      const 链接 = 值单元格.querySelector('a[href*="ip="]');
      const 克隆节点 = 值单元格.cloneNode(true);
      克隆节点.querySelector("a")?.remove();
      信息.accountFrom = 克隆节点.textContent.trim().replace(/^#/, "");
      信息.accountFromIp = 链接 ? new URL(链接.href, location.href).searchParams.get("ip") : null;
    } else if (标签文字 === "Account To") {
      const 链接 = 值单元格.querySelector('a[href*="ip="]');
      const 克隆节点 = 值单元格.cloneNode(true);
      克隆节点.querySelector("a")?.remove();
      信息.accountTo = 克隆节点.textContent.trim().replace(/^#/, "");
      信息.accountToIp = 链接 ? new URL(链接.href, location.href).searchParams.get("ip") : null;
    }
  }
  return 信息;
}

function findBankHackLink() {
  return document.querySelector('a[href*="action=hack"][href*="type=bank"]');
}

function findBankAccountForm() {
  const input = document.querySelector('input[name="acc"][placeholder="Account to hack"]');
  const button = input?.closest("form")?.querySelector('button[type="submit"]');
  return input && button ? { input, button } : null;
}

function findBankTransferForm() {
  const moneyInput = document.querySelector("input#money");
  const transferInput = document.querySelector('input[name="acc"][placeholder="Transfer to..."]');
  const ipInput = document.querySelector('input[name="ip"][placeholder="IP of the receiver account"]');
  const button = [...document.querySelectorAll('button[type="submit"]')].find(
    (按钮元素) => 按钮元素.textContent.trim().toLowerCase() === "transfer money"
  );
  return moneyInput && transferInput && ipInput && button ? { moneyInput, transferInput, ipInput, button } : null;
}

function findBankLogoutLink() {
  return document.querySelector('a[href*="bAction=logout"]');
}

function findSoftwareResetMinutes() {
  const 匹配项 = document.body.innerText.match(/Next software reset:?\s*(\d+)\s*minutes?/i);
  return 匹配项 ? Number(匹配项[1]) : null;
}

function findNewMissionsResetMinutes() {
  const 匹配项 = document.body.innerText.match(/New missions will be generated in\s*(\d+)\s*minutes?/i);
  return 匹配项 ? Number(匹配项[1]) : null;
}

function findDollarLabel() {
  const 任务链接元素 = document.querySelector('a[href="missions"]');
  if (!任务链接元素) return null;
  for (const 元素 of 任务链接元素.querySelectorAll(".label")) {
    if (元素.textContent.trim() === "$") return 元素;
  }
  return null;
}

function findBuyBitcoinsLink() {
  for (const 链接元素 of document.querySelectorAll("a")) {
    if (链接元素.querySelector(".he32-btc-buy")) return 链接元素;
    if (链接元素.textContent.replace(/\s+/g, " ").trim().toLowerCase().startsWith("buy bitcoins")) return 链接元素;
  }
  return null;
}

const MISSION_STEPS = {
  find_mission: {
    timeout: 15000,
    find: (状态) => findMissionLink(状态.enabledTypes),
    resolve: (找到结果) => ({ next: "accept1", patch: { missionType: 找到结果.missionType, stage: "victim" } }),
    perform: (找到结果) => 找到结果.el.click(),
    onNotFound: () => {
      const 剩余分钟 = findNewMissionsResetMinutes();
      if (剩余分钟 != null) {
        const 上限分钟 = Math.min(剩余分钟, 20);
        return {
          retryDelayMs: 上限分钟 * 60000 + 30000,
          reason: `no missions available, waiting ~${上限分钟}m + 30s for new missions`,
        };
      }
      return {
        retryDelayMs: 2 * 60000,
        reason: "no missions available, waiting 2m and refreshing",
      };
    },
  },
  accept1: {
    timeout: 15000,
    find: () => document.querySelector(".mission-accept"),
    resolve: () => ({ next: "accept2" }),
    perform: (元素) => 元素.click(),
    onNotFound: () => {
      if (!findMissionDoesNotExistError()) return null;
      return {
        retryDelayMs: 0,
        reason: "mission no longer exists, restarting search",
        next: "find_mission",
        href: "https://hackerwars.io/missions",
      };
    },
  },
  accept2: {
    timeout: 10000,
    find: () => 按值查找提交按钮("Accept"),
    resolve: () => ({ next: "read_info" }),
    perform: (元素) => 元素.click(),
  },
  read_info: {
    timeout: 15000,
    find: () => {
      const 信息 = parseMissionInfo();
      return 信息.victimIp && (信息.fileName || 信息.bankAccount || 信息.accountFrom) ? 信息 : null;
    },
    resolve: (信息, 状态) => ({
      next: 状态.missionType === "bank" || 状态.missionType === "transfer" ? "bank_hack" : "hack",
      patch: {
        victimIp: 信息.victimIp,
        fileName: 信息.fileName,
        fileVersion: 信息.fileVersion,
        reward: 信息.reward,
        hirerIp: 信息.hirerIp,
        bankAccount: 信息.bankAccount,
        accountFrom: 信息.accountFrom,
        accountFromIp: 信息.accountFromIp,
        accountTo: 信息.accountTo,
        accountToIp: 信息.accountToIp,
        currentAccount: 状态.missionType === "bank" ? 信息.bankAccount : 信息.accountFrom,
        transferPhase: 状态.missionType === "transfer" ? "initial" : undefined,
      },
    }),
    perform: (信息, 状态) => {
      const 目标IP = 状态.missionType === "transfer" ? 状态.accountFromIp : 状态.victimIp;
      location.href = `https://hackerwars.io/internet?ip=${目标IP}`;
    },
  },
  hack: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?action=hack"]'),
    resolve: () => ({ next: "post_hack" }),
    perform: (元素) => 元素.click(),
  },
  post_hack: {
    timeout: 15000,
    find: () => {
      const bf = document.querySelector('a[href*="method=bf"]');
      if (bf) return { kind: "bruteforce", el: bf };
      const login = 按值查找提交按钮("Login");
      if (login) return { kind: "login", el: login };
      return null;
    },
    resolve: ({ kind }, 状态) => ({
      next: kind === "bruteforce" ? "await_login" : 状态.stage === "hirer" ? "hirer_software" : "software",
    }),
    perform: ({ el }) => el.click(),
  },
  await_login: {
    timeout: 120000,
    find: () => 按值查找提交按钮("Login"),
    resolve: (元素, 状态) => ({ next: 状态.stage === "hirer" ? "hirer_software" : "software" }),
    perform: (元素) => 元素.click(),
  },
  software: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?view=software"]'),
    resolve: (元素, 状态) => ({ next: 状态.missionType === "steal" ? "steal_download" : "delete_file" }),
    perform: (元素) => 元素.click(),
  },
  delete_file: {
    timeout: 15000,
    find: (状态) => 查找软件行链接(状态.fileName, 状态.fileVersion, "cmd=del"),
    resolve: () => ({ next: "goto_own_software_for_reupload" }),
    perform: (元素) => 元素.click(),
    onNotFound: () => {
      const 剩余分钟 = findSoftwareResetMinutes();
      if (剩余分钟 == null) return null;
      const 上限分钟 = Math.min(剩余分钟, 20);
      return {
        retryDelayMs: 上限分钟 * 60000 + 30000,
        reason: `software not spawned yet, waiting ~${上限分钟}m + 30s for reset`,
      };
    },
  },
  goto_own_software_for_reupload: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "reupload_deleted_file" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  reupload_deleted_file: {
    timeout: 15000,
    find: (状态) => 查找软件行链接(状态.fileName, 状态.fileVersion, "cmd=up"),
    resolve: () => ({ next: "logout" }),
    perform: (元素) => 元素.click(),
  },
  steal_download: {
    timeout: 15000,
    find: (状态) => 查找软件行链接(状态.fileName, 状态.fileVersion, "cmd=dl"),
    resolve: () => ({ next: "logout" }),
    perform: (元素) => 元素.click(),
    onNotFound: () => {
      const 剩余分钟 = findSoftwareResetMinutes();
      if (剩余分钟 == null) return null;
      const 上限分钟 = Math.min(剩余分钟, 20);
      return {
        retryDelayMs: 上限分钟 * 60000 + 30000,
        reason: `software not spawned yet, waiting ~${上限分钟}m + 30s for reset`,
      };
    },
  },
  logout: {
    timeout: 15000,
    find: 查找登出控件,
    resolve: (元素, 状态) => ({
      next: 状态.missionType === "steal" && 状态.stage === "victim" ? "goto_hirer" : "wait_for_dollar",
    }),
    perform: (元素) => 元素.click(),
  },
  goto_hirer: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "hack", patch: { stage: "hirer" } }),
    perform: (页面主体, 状态) => {
      location.href = `https://hackerwars.io/internet?ip=${状态.hirerIp}`;
    },
  },
  hirer_software: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?view=software"]'),
    resolve: () => ({ next: "check_hirer_existing_file" }),
    perform: (元素) => 元素.click(),
  },
  check_hirer_existing_file: {
    timeout: 15000,
    find: (状态) => ({ link: 查找软件行链接(状态.fileName, 状态.fileVersion, "cmd=del") }),
    resolve: ({ link }) => ({ next: link ? "delete_hirer_existing_file" : "goto_own_software" }),
    perform: () => {},
  },
  delete_hirer_existing_file: {
    timeout: 15000,
    find: (状态) => 查找软件行链接(状态.fileName, 状态.fileVersion, "cmd=del"),
    resolve: () => ({ next: "confirm_hirer_file_deleted" }),
    perform: (元素) => 元素.click(),
    onNotFound: () => {
      const 剩余分钟 = findSoftwareResetMinutes();
      if (剩余分钟 == null) return null;
      const 上限分钟 = Math.min(剩余分钟, 20);
      return {
        retryDelayMs: 上限分钟 * 60000 + 30000,
        reason: `software not spawned yet, waiting ~${上限分钟}m + 30s for reset`,
      };
    },
  },
  confirm_hirer_file_deleted: {
    timeout: 15000,
    find: (状态) => (查找软件行链接(状态.fileName, 状态.fileVersion, "cmd=del") ? null : true),
    resolve: () => ({ next: "goto_own_software" }),
    perform: () => {},
  },
  goto_own_software: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "upload_file" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  upload_file: {
    timeout: 15000,
    find: (状态) => 查找软件行链接(状态.fileName, 状态.fileVersion, "cmd=up"),
    resolve: () => ({ next: "logout_hirer" }),
    perform: (元素) => 元素.click(),
  },
  logout_hirer: {
    timeout: 15000,
    find: 查找登出控件,
    resolve: () => ({ next: "goto_own_software_2" }),
    perform: (元素) => 元素.click(),
  },
  goto_own_software_2: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "delete_own_file" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  delete_own_file: {
    timeout: 15000,
    find: (状态) => 查找软件行链接(状态.fileName, 状态.fileVersion, "action=del"),
    resolve: () => ({ next: "wait_for_dollar" }),
    perform: (元素) => 元素.click(),
  },
  bank_hack: {
    timeout: 15000,
    find: findBankHackLink,
    resolve: () => ({ next: "bank_hack_account" }),
    perform: (元素) => 元素.click(),
  },
  bank_hack_account: {
    timeout: 15000,
    find: findBankAccountForm,
    resolve: (找到结果, 状态) => ({
      next: "bank_login",
      patch: {
        bankLoginNext: 状态.missionType === "transfer" && 状态.transferPhase === "initial" ? "transfer_to_designated_account" : "bank_transfer",
      },
    }),
    perform: ({ input, button }, 状态) => {
      设置输入框值(input, 状态.currentAccount);
      button.click();
    },
  },
  bank_login: {
    timeout: 90000,
    find: () => {
      const login = 按值查找提交按钮("Login");
      if (login) return { kind: "login", el: login };
      if (findBankTransferForm()) return { kind: "skip" };
      return null;
    },
    resolve: (找到结果, 状态) => ({ next: 状态.bankLoginNext }),
    perform: ({ kind, el }) => {
      if (kind === "login") el.click();
    },
  },
  transfer_to_designated_account: {
    timeout: 90000,
    find: findBankTransferForm,
    resolve: () => ({ next: "wait_for_dollar" }),
    perform: ({ transferInput, ipInput, button }, 状态) => {
      设置输入框值(transferInput, 状态.accountTo);
      设置输入框值(ipInput, 状态.accountToIp);
      button.click();
    },
  },
  bank_transfer: {
    timeout: 90000,
    find: findBankTransferForm,
    resolve: (找到结果, 状态) => ({
      next: 状态.transferPhase === "sweep" ? "goto_btc" : "wait_for_dollar",
      patch: { transferAmount: 找到结果.moneyInput.value, postBtcNext: "goto_missions" },
    }),
    perform: ({ transferInput, ipInput, button }, 状态) => {
      设置输入框值(transferInput, 状态.selfTransferAccount);
      设置输入框值(ipInput, 状态.selfTransferIp);
      button.click();
    },
  },
  wait_for_dollar: {
    timeout: 60000,
    find: findDollarLabel,
    resolve: () => ({ next: "complete1" }),
    perform: (元素) => 元素.click(),
  },
  complete1: {
    timeout: 30000,
    find: () => document.querySelector(".mission-complete"),
    resolve: () => ({ next: "complete2" }),
    perform: (元素, 状态) => {
      if (状态.missionType === "bank") {
        const 金额输入框 = document.querySelector("#amount-input");
        if (金额输入框) 设置输入框值(金额输入框, 状态.transferAmount);
      }
      元素.click();
    },
  },
  complete2: {
    timeout: 10000,
    find: () => document.querySelector("#modal-submit"),
    resolve: (元素, 状态) => ({
      next: "goto_btc",
      patch: { postBtcNext: 状态.missionType === "transfer" ? "goto_account_to" : "goto_missions" },
      complete: true,
    }),
    perform: (元素) => 元素.click(),
  },
  goto_account_to: {
    timeout: 15000,
    find: () => document.body,
    resolve: (页面主体, 状态) => ({
      next: "bank_hack",
      patch: { transferPhase: "sweep", currentAccount: 状态.accountTo },
    }),
    perform: (页面主体, 状态) => {
      location.href = `https://hackerwars.io/internet?ip=${状态.accountToIp}`;
    },
  },
  goto_btc: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "buy_btc_click" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?redirect=btc";
    },
  },
  buy_btc_click: {
    timeout: 15000,
    find: findBuyBitcoinsLink,
    resolve: () => ({ next: "buy_btc_submit" }),
    perform: (元素) => 元素.click(),
  },
  buy_btc_submit: {
    timeout: 15000,
    find: () => {
      const 登录按钮 = document.querySelector("#btc-login");
      if (登录按钮) return { kind: "login", el: 登录按钮 };
      const 购买按钮 = document.querySelector("#btc-submit");
      return 购买按钮 ? { kind: "buy", el: 购买按钮 } : null;
    },
    resolve: (找到结果, 状态) => ({ next: 找到结果.kind === "login" ? "buy_btc_click" : 状态.postBtcNext || "goto_missions" }),
    perform: (找到结果) => 找到结果.el.click(),
  },
  goto_missions: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "find_mission" }),
    perform: () => {
      location.href = "https://hackerwars.io/missions";
    },
  },
};
