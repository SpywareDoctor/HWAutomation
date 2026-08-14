# HackerWars Automator

> **Unlike HExbot, which scraped and collected your data, this extension has no sockets — it doesn't even have hardcoded IP addresses or accounts in it.**
>
> The only hardcoded data is the preset names/sizes for the Spam, Warez, and Miner infection buttons:
>
> - **Spam** — `Super Spam.vspam` 1gb, `Advanced Spam.vspam` 236mb, `Decent Spam.vspam` 36mb
> - **Warez** — `Super Warez.vwarez` 1gb, `Advanced Warez.vwarez` 236mb, `Decent Warez.vwarez` 36mb
> - **Miner** — `Super Miner.vminer` 1.7gb, `Advanced Miner.vminer` 413mb, `Decent Miner.vminer` 63mb

A manual-trigger browser extension (Manifest V3) that automates repetitive tasks in [hackerwars.io](https://hackerwars.io), a hacking-themed browser game. It adds an on-page overlay with start/stop controls for each automation; nothing runs until you trigger it.

## Features

| Module | What it does |
| --- | --- |
| `missions.js` | Auto-accepts and completes missions (delete/steal software, bank checks, transfers) by priority. |
| `ddos.js` | Buys/installs DDoS viruses and runs them against target IPs, handling disk space, RAM, and duplicate-install errors. |
| `research.js` | Cycles through research pages/processes with randomized delays to look organic. |
| `puzzle.js` | Answers in-game riddles/puzzles from a known answer table. |
| `masshack.js` | Walks a queue of target IPs and hacks each one in turn. |
| `repgrind.js` | Repeatedly hacks a target IP using exploits/bruteforce to grind reputation XP. |
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

## Disclaimer

This tool interacts with a third-party game. Use at your own risk with respect to that game's terms of service.
