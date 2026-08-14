const MASSHACK_STEPS = {
  goto_target: {
    timeout: 15000,
    find: (状态) => (状态.ipQueue && 状态.ipQueue.length > 0 ? 状态.ipQueue[0] : "done"),
    resolve: (找到结果, 状态) =>
      找到结果 === "done"
        ? { next: "goto_target", stop: true }
        : { next: "hack", patch: { currentIp: 找到结果, ipQueue: 状态.ipQueue.slice(1) } },
    perform: (找到结果) => {
      if (找到结果 !== "done") location.href = `https://hackerwars.io/internet?ip=${找到结果}`;
    },
  },
  hack: {
    timeout: 15000,
    find: () => {
      const 链接 = document.querySelector('a[href="?action=hack"]');
      if (链接) return { kind: "hack", el: 链接 };
      const 未找到 = [...document.querySelectorAll(".widget-content")].some((元素) =>
        /404 - Page not found/.test(元素.textContent)
      );
      return 未找到 ? { kind: "not_found" } : null;
    },
    resolve: ({ kind }) => ({ next: kind === "hack" ? "post_hack" : "goto_target", complete: kind === "not_found" }),
    perform: ({ kind, el }) => {
      if (kind === "hack") el.click();
    },
    onNotFound: () => ({
      retryDelayMs: 0,
      reason: "no hack link found (already hacked or invalid ip?) - skipping",
      next: "goto_target",
    }),
  },
  post_hack: {
    timeout: 15000,
    find: () => {
      const 暴力破解链接 = document.querySelector('a[href*="method=bf"]');
      if (暴力破解链接) return { kind: "bruteforce", el: 暴力破解链接 };
      const 登录按钮 = 按值查找提交按钮("Login");
      if (登录按钮) return { kind: "login" };
      return null;
    },
    resolve: ({ kind }) => ({ next: kind === "bruteforce" ? "await_bruteforce" : "goto_target", complete: kind !== "bruteforce" }),
    perform: ({ kind, el }) => {
      if (kind === "bruteforce") el.click();
    },
  },
  await_bruteforce: {
    timeout: 120000,
    find: () => 按值查找提交按钮("Login"),
    resolve: () => ({ next: "goto_target", complete: true }),
    perform: () => {},
  },
};
