const REP_KILL_TITLES = ["destroy server", "delete software", "steal software"];

function findRepKillMissionLink() {
  for (const 链接元素 of document.querySelectorAll('a[href*="?id="]')) {
    if (REP_KILL_TITLES.includes(链接元素.textContent.trim().toLowerCase())) return 链接元素;
  }
  return null;
}

const REP_KILL_STEPS = {
  goto_missions: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "find_mission" }),
    perform: () => {
      if (location.pathname !== "/missions") location.href = "https://hackerwars.io/missions";
    },
  },
  find_mission: {
    timeout: 15000,
    find: () => findRepKillMissionLink(),
    resolve: () => ({ next: "accept1" }),
    perform: (元素) => 元素.click(),
    onNotFound: () => ({
      retryDelayMs: 2 * 60000,
      reason: "no destroy/delete/steal mission available, waiting 2m and refreshing",
    }),
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
    resolve: () => ({ next: "abort1" }),
    perform: (元素) => 元素.click(),
  },
  abort1: {
    timeout: 15000,
    find: () => document.querySelector(".mission-abort"),
    resolve: () => ({ next: "abort2" }),
    perform: (元素) => 元素.click(),
  },
  abort2: {
    timeout: 10000,
    find: () => 按值查找提交按钮("Abort"),
    resolve: () => ({ next: "goto_missions", complete: true }),
    perform: (元素) => 元素.click(),
  },
};
