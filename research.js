function findResearchForm() {
  const cyclesSelect = document.querySelector("select#cycles");
  const deleteCheckbox = document.querySelector('input[type="checkbox"][name="delete"]');
  const submitBtn = document.querySelector("#research-price-btn")?.closest("button[type='submit']");
  return cyclesSelect && deleteCheckbox && submitBtn ? { cyclesSelect, deleteCheckbox, submitBtn } : null;
}

function findLoginSubmit() {
  return document.querySelector("#login-submit");
}

function randomBetween(最小毫秒, 最大毫秒) {
  return 最小毫秒 + Math.random() * (最大毫秒 - 最小毫秒);
}

const RESEARCH_BROWSE_PAGES = [
  "https://hackerwars.io/finances",
  "https://hackerwars.io/internet",
  "https://hackerwars.io/software",
  "https://hackerwars.io/log",
  "https://hackerwars.io/hardware",
  "https://hackerwars.io/hdb",
  "https://hackerwars.io/missions",
  "https://hackerwars.io/utilities",
  "https://hackerwars.io/clan",
  "https://hackerwars.io/ranking",
  "https://hackerwars.io/fame",
];
const RESEARCH_PROCESSES_LEAD_MS = 2 * 60 * 1000;
const RESEARCH_BROWSE_MIN_MS = 5 * 60 * 1000;
const RESEARCH_BROWSE_MAX_MS = 10 * 60 * 1000;

function findCompleteProcessLink() {
  return [...document.querySelectorAll('a[href*="pid="]')].find(
    (链接元素) => 链接元素.textContent.trim().toLowerCase() === "complete"
  );
}

const RESEARCH_STEPS = {
  goto_university: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "submit_research" }),
    perform: (页面主体, 状态) => {
      if (location.href !== 状态.universityUrl) location.href = 状态.universityUrl;
    },
  },
  submit_research: {
    timeout: 15000,
    find: () => {
      const 登录按钮 = findLoginSubmit();
      if (登录按钮) return { kind: "login", el: 登录按钮 };
      const form = findResearchForm();
      return form ? { kind: "research", form } : null;
    },
    resolve: (找到结果) => ({ next: 找到结果.kind === "login" ? "goto_university" : "await_elapsed_start" }),
    perform: (找到结果, 状态) => {
      if (找到结果.kind === "login") {
        找到结果.el.click();
        return;
      }
      const { cyclesSelect, deleteCheckbox, submitBtn } = 找到结果.form;
      设置输入框值(cyclesSelect, String(状态.researchCycles || 1));
      if (!deleteCheckbox.checked) {
        deleteCheckbox.checked = true;
        deleteCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
      submitBtn.click();
    },
  },
  await_elapsed_start: {
    timeout: 15000,
    find: () => {
      const 登录按钮 = findLoginSubmit();
      if (登录按钮) return { kind: "login", el: 登录按钮 };
      const waitMs = 查找倒计时剩余毫秒();
      return waitMs != null ? { kind: "elapsed", waitMs } : null;
    },
    resolve: (找到结果) =>
      找到结果.kind === "login"
        ? { next: "goto_university" }
        : { next: "browse", patch: { researchDeadline: Date.now() + 找到结果.waitMs } },
    perform: (找到结果) => {
      if (找到结果.kind === "login") 找到结果.el.click();
    },
  },
  browse: {
    timeout: 15000,
    find: () => document.body,
    resolve: (页面主体, 状态) => ({
      next: 状态.researchDeadline - Date.now() <= RESEARCH_PROCESSES_LEAD_MS ? "goto_processes" : "browse",
    }),
    perform: async (页面主体, 状态) => {
      const 剩余毫秒 = 状态.researchDeadline - Date.now();
      if (剩余毫秒 <= RESEARCH_PROCESSES_LEAD_MS) return;
      const 页面 = RESEARCH_BROWSE_PAGES[Math.floor(Math.random() * RESEARCH_BROWSE_PAGES.length)];
      const 等待时长 = Math.min(randomBetween(RESEARCH_BROWSE_MIN_MS, RESEARCH_BROWSE_MAX_MS), 剩余毫秒 - RESEARCH_PROCESSES_LEAD_MS);
      await 休眠(Math.max(等待时长, 0));
      location.href = 页面;
    },
  },
  goto_processes: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "wait_for_complete" }),
    perform: () => {
      location.href = "https://hackerwars.io/processes";
    },
  },
  wait_for_complete: {
    timeout: 20 * 60 * 1000,
    find: () => {
      const 登录按钮 = findLoginSubmit();
      if (登录按钮) return { kind: "login", el: 登录按钮 };
      const 链接 = findCompleteProcessLink();
      return 链接 ? { kind: "complete", el: 链接 } : null;
    },
    resolve: (找到结果) => ({
      next: 找到结果.kind === "login" ? "goto_processes" : "goto_university",
      complete: 找到结果.kind === "complete",
    }),
    perform: async (找到结果) => {
      找到结果.el.click();
      if (找到结果.kind === "complete") await 休眠(2000);
    },
  },
};
