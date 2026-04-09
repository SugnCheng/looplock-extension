# LoopLock

LoopLock is a browser extension prototype for YouTube that lets users select an A-B playback range and loop only that segment.

This project is currently focused on a practical MVP for YouTube listening scenarios such as:

- ASMR
- language learning
- short-segment replay
- focused audio/video repetition

## Current MVP Status

This is currently an **MVP Alpha**.

Working features:

- Detects the main YouTube video on a watch page
- Lets users set **A** and **B** points
- Loops the selected range with **Loop On / Off**
- Supports **Clear**
- Supports panel collapse / expand
- Resets A/B and Loop state when switching to a new YouTube video
- Preserves A/B while pausing/resuming the same video

## Current Product Rules

- Currently optimized for **YouTube**
- Uses a floating control panel on the page
- Does **not** save A/B ranges across videos
- When switching to a new video:
  - A and B are cleared
  - Loop is reset to Off
- Pausing the current video does not clear A/B

## Tech Stack

- TypeScript
- Vite
- Chrome Extension Manifest V3
- Vanilla DOM + CSS
- VS Code for development

## Project Structure

```text
looplock-extension/
├─ public/
│  └─ manifest.json
├─ src/
│  ├─ background/
│  ├─ content/
│  ├─ popup/
│  ├─ storage/
│  ├─ ui/
│  └─ shared/
├─ package.json
├─ tsconfig.json
└─ vite.config.ts