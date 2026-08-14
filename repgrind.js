const REP_GRIND_STEPS = {
  goto_target: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "hack" }),
    perform: (页面主体, 状态) => {
      location.href = `https://hackerwars.io/internet?ip=${状态.repIp}`;
    },
  },
  hack: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?action=hack"]'),
    resolve: (元素, 状态) => ({
      next: 状态.useExploit !== false ? "select_exploit" : 状态.useBruteforce !== false ? "bruteforce" : "wait_final",
    }),
    perform: (元素) => 元素.click(),
  },
  select_exploit: {
    timeout: 15000,
    find: () => document.querySelector('a[href*="method=xp"]:not(.btn-success)'),
    resolve: () => ({ next: "confirm_exploit" }),
    perform: (元素) => 元素.click(),
  },
  confirm_exploit: {
    timeout: 90000,
    find: () => document.querySelector('a.btn-success[href*="method=xp"]'),
    resolve: (元素, 状态) => ({ next: 状态.useBruteforce !== false ? "hack_again" : "wait_final" }),
    perform: (元素) => 元素.click(),
  },
  hack_again: {
    timeout: 90000,
    find: () => document.querySelector('a[href="?action=hack"]'),
    resolve: () => ({ next: "bruteforce" }),
    perform: (元素) => 元素.click(),
  },
  bruteforce: {
    timeout: 30000,
    find: () => document.querySelector('a[href*="method=bf"]'),
    resolve: () => ({ next: "wait_final" }),
    perform: (元素) => 元素.click(),
  },
  wait_final: {
    timeout: 120000,
    find: () => document.body,
    resolve: (页面主体, 状态) => ({
      next: 状态.useBankTransfer ? "goto_bank" : "finish_wait",
      patch: 状态.useBankTransfer ? { bankPass: 1 } : {},
    }),
    perform: () => {},
  },
  goto_bank: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "bank_hack" }),
    perform: (页面主体, 状态) => {
      location.href = `https://hackerwars.io/internet?ip=${状态.bankIp}`;
    },
  },
  bank_hack: {
    timeout: 15000,
    skipElapsedGate: true,
    find: findBankHackLink,
    resolve: () => ({ next: "bank_hack_account" }),
    perform: (元素) => 元素.click(),
  },
  bank_hack_account: {
    timeout: 15000,
    skipElapsedGate: true,
    find: findBankAccountForm,
    resolve: () => ({ next: "bank_login" }),
    perform: ({ input, button }, 状态) => {
      设置输入框值(input, 状态.bankPass === 1 ? 状态.bankAccountFrom : 状态.bankAccountTo);
      button.click();
    },
  },
  bank_login: {
    timeout: 30000,
    skipElapsedGate: true,
    find: () => {
      const 登录按钮 = 按值查找提交按钮("Login");
      if (登录按钮) return { kind: "login", el: 登录按钮 };
      if (findBankTransferForm()) return { kind: "skip" };
      return null;
    },
    resolve: () => ({ next: "bank_read_balance" }),
    perform: (找到结果) => {
      if (找到结果.kind === "login") 找到结果.el.click();
    },
  },
  bank_read_balance: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => {
      const 表单 = findBankTransferForm();
      if (!表单) return null;
      return /\d/.test(表单.moneyInput.value || "") ? 表单 : null;
    },
    resolve: (找到结果) => {
      const 余额 = parseInt((找到结果.moneyInput.value || "").replace(/[^0-9]/g, ""), 10) || 0;
      const 每笔金额 = Math.round(余额 / 100);
      const 最后一笔金额 = Math.max(余额 - 每笔金额 * 99, 0);
      return {
        next: "bank_transfer_chunk",
        patch: { bankChunkAmount: 每笔金额, bankChunksRemaining: 99, bankLastAmount: 最后一笔金额, bankCurrentAmount: null },
      };
    },
    perform: () => {},
  },
  bank_transfer_chunk: {
    timeout: 90000,
    skipElapsedGate: true,
    find: findBankTransferForm,
    resolve: (找到结果, 状态) => {
      const 剩余笔数 = 状态.bankChunksRemaining || 0;
      if (状态.bankChunkAmount > 0 && 剩余笔数 > 0) {
        return { next: "bank_transfer_chunk", patch: { bankChunksRemaining: 剩余笔数 - 1, bankCurrentAmount: 状态.bankChunkAmount } };
      }
      if (状态.bankLastAmount > 0) {
        return { next: "bank_transfer_chunk", patch: { bankLastAmount: 0, bankCurrentAmount: 状态.bankLastAmount } };
      }
      return { next: "bank_logout", patch: { bankCurrentAmount: null } };
    },
    perform: ({ transferInput, moneyInput, ipInput, button }, 状态) => {
      if (!状态.bankCurrentAmount) return;
      const 目标账户 = 状态.bankPass === 1 ? 状态.bankAccountTo : 状态.bankAccountFrom;
      设置输入框值(transferInput, 目标账户);
      设置输入框值(moneyInput, `$${状态.bankCurrentAmount}`);
      设置输入框值(ipInput, 状态.bankIp);
      button.click();
    },
  },
  bank_logout: {
    timeout: 15000,
    skipElapsedGate: true,
    find: findBankLogoutLink,
    resolve: (找到结果, 状态) => ({
      next: 状态.bankPass === 1 ? "bank_hack" : "finish_wait",
      patch: 状态.bankPass === 1 ? { bankPass: 2 } : {},
    }),
    perform: (元素) => 元素.click(),
  },
  finish_wait: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "goto_target", stop: true, complete: true }),
    perform: async () => {
      await 休眠(randomBetween(1000, 5000));
    },
  },
};
