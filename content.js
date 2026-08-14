(async function 主流程() {
  await 收集日志IP();
  await 收集软件清单();
  await 处理日志监控();
  await 处理日志监视();
  await 运行步骤引擎("missionRunner", MISSION_STEPS);
  await 运行步骤引擎("ddosRunner", DDOS_STEPS);
  await 运行步骤引擎("researchRunner", RESEARCH_STEPS);
  await 运行步骤引擎("puzzleRunner", PUZZLE_STEPS);
  await 运行步骤引擎("massHackRunner", MASSHACK_STEPS);
  await 运行步骤引擎("collectRunner", COLLECT_STEPS);
  await 运行步骤引擎("repGrindRunner", REP_GRIND_STEPS);
  await 运行步骤引擎("repKillRunner", REP_KILL_STEPS);
})();
