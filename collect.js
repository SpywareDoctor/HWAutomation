const 默认收款间隔毫秒 = 60 * 60 * 1000;
const 最短收款间隔毫秒 = 10.5 * 60 * 1000;

const COLLECT_STEPS = {
  goto_list: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "collect" }),
    perform: () => {
      if (location.href !== "https://hackerwars.io/list.php?action=collect") {
        location.href = "https://hackerwars.io/list.php?action=collect";
      }
    },
  },
  collect: {
    timeout: 15000,
    find: () => 按值查找提交按钮("Collect my money!"),
    resolve: () => ({ next: "goto_log" }),
    perform: (元素) => 元素.click(),
  },
  goto_log: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "clear_log" }),
    perform: () => {
      location.href = "https://hackerwars.io/log";
    },
  },
  clear_log: {
    timeout: 15000,
    find: () => {
      const textarea = 获取日志文本框();
      const button = 获取编辑日志按钮();
      return textarea && button ? { textarea, button } : null;
    },
    resolve: (找到结果, 状态) => ({
      next: "goto_btc",
      patch: { collectDeadline: Date.now() + Math.max(状态.collectIntervalMs || 默认收款间隔毫秒, 最短收款间隔毫秒) },
      complete: true,
    }),
    perform: async ({ textarea, button }) => {
      await 取消陈旧日志编辑进程();
      textarea.value = "";
      button.click();
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
    find: () => document.querySelector("#btc-submit"),
    resolve: () => ({ next: "browse" }),
    perform: (元素) => 元素.click(),
  },
  browse: {
    timeout: 15000,
    find: () => document.body,
    resolve: (页面主体, 状态) => ({ next: Date.now() >= 状态.collectDeadline ? "goto_list" : "browse" }),
    perform: async (页面主体, 状态) => {
      const 剩余毫秒 = 状态.collectDeadline - Date.now();
      if (剩余毫秒 <= 0) return;
      const 页面 = RESEARCH_BROWSE_PAGES[Math.floor(Math.random() * RESEARCH_BROWSE_PAGES.length)];
      const 等待时长 = Math.min(randomBetween(RESEARCH_BROWSE_MIN_MS, RESEARCH_BROWSE_MAX_MS), 剩余毫秒);
      await 休眠(Math.max(等待时长, 0));
      location.href = 页面;
    },
  },
};
