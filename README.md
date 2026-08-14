# HackerWars Automator

> **Unlike HExbot, which scraped and collected your data, this extension has no sockets. It doesn't even have hardcoded IP addresses or accounts in it.**
>
> The only hardcoded data is the preset names/sizes for the Spam, Warez, and Miner infection buttons:
>
> - **Spam**: `Super Spam.vspam` 1gb, `Advanced Spam.vspam` 236mb, `Decent Spam.vspam` 36mb
> - **Warez**: `Super Warez.vwarez` 1gb, `Advanced Warez.vwarez` 236mb, `Decent Warez.vwarez` 36mb
> - **Miner**: `Super Miner.vminer` 1.7gb, `Advanced Miner.vminer` 413mb, `Decent Miner.vminer` 63mb

A manual-trigger browser extension (Manifest V3) that automates repetitive tasks in [hackerwars.io](https://hackerwars.io), a hacking-themed browser game. It adds an on-page overlay with start/stop controls for each automation; nothing runs until you trigger it.

## Features

| Module | What it does |
| --- | --- |
| `missions.js` | Auto-accepts and completes missions (delete/steal software, bank checks, transfers) by priority. |
| `ddos.js` | Buys/installs DDoS viruses and runs them against target IPs, handling disk space, RAM, and duplicate-install errors. |
| `research.js` | Cycles through research pages/processes with randomized delays to look organic. |
| `puzzle.js` | Answers in-game riddles/puzzles from a known answer table. |
| `masshack.js` | Walks a queue of target IPs and hacks each one in turn. |
| `repkill.js` | Finds and runs "destroy server" / "delete software" / "steal software" missions for reputation. |
| `collect.js` | Collects accumulated in-game money on a timer and clears the log afterward. |
| `softwareGather.js` | Scans the currently connected server for downloadable software and records it. |
| `logs.js` | Scrapes IP addresses out of the in-game log viewer for later use (e.g. by masshack). |
| `overlay.js` / `content.js` | Injects and wires up the floating control card shown on the game page. |
| `popup.html` / `popup.js` | Extension popup UI for configuring and toggling automations. |
| `background.js` | Service worker handling scheduling (`alarms`), storage, and cross-tab state. |
| `shared.js` | Common helpers (element finders, step-runner engine, etc.) used across modules. |

## Installation

1. Clone or download this repository.
2. Open `chrome://extensions` (or the equivalent in your Chromium-based browser).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder.
5. Navigate to [hackerwars.io](https://hackerwars.io) and use the overlay card or the extension popup to start/stop individual automations.

## Permissions

Declared in [manifest.json](manifest.json): `activeTab`, `scripting`, `storage`, `downloads`, `alarms`, and host access limited to `https://hackerwars.io/*`.

## Changelog

### Unreleased

**Added**

- `#btc-login` fallback added to the Buy Bitcoin step in `missions.js` and `collect.js`. If the buy button isn't present, the flow now checks for a login prompt, logs in, and retries the buy.
- Software reupload step added after a mission's delete-file step in `missions.js`, matching the current mission flow.

**Changed**

- `ddos.js` now skips log clearing entirely when the current target is the configured Download Center IP, since logs can't be edited there.
- `ddos.js` now detects a "not enough RAM" install error and skips that target (clearing logs and moving on) instead of waiting it out.
- UI text updated: "Puzzle 任务" renamed to "Puzzle 进行中" throughout the popup.

**Fixed**

- `background.js` now filters out the game's own "localhost" action log entries so the background log monitor no longer raises false alerts on actions we performed ourselves.
- Background message proxy extended with `createAlarm`, `clearAlarm`, `setBadgeText`, and `download` handlers so the on-page overlay (which has no direct access to those Chrome APIs) can use them through the service worker.

### 2.1.0 and earlier

Baseline release. Version history prior to 2.1.0 was not tracked in this document. Functionality at this point covered the modules listed under Features above: missions, DDoS, research, puzzle solving, mass hacking, collection, Rep Kill, software gathering, log scraping, and the popup/overlay UI.

## Disclaimer

This tool interacts with a third-party game. Use at your own risk with respect to that game's terms of service.
