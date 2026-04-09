# LoopLock

A lightweight YouTube A-B loop browser extension for ASMR, language learning, and focused replay use cases.

## Overview

LoopLock is a browser extension prototype that lets users select a custom **A-B playback range** on a YouTube video and repeatedly loop only that segment.

It is designed for scenarios where users want to replay a precise part of a video without constantly dragging the progress bar, such as:

- ASMR listening
- language shadowing and repeated listening
- replaying short educational segments
- focused audio/video repetition

## Current Status

**MVP Alpha**

The current version is focused on **YouTube** and has been tested as a working prototype.

### What currently works

- Detects the main YouTube video on a watch page
- Lets users set **A** and **B** points
- Supports **Loop On / Off**
- Supports **Clear**
- Supports panel collapse / expand
- Resets A/B and Loop state when switching to a new YouTube video
- Preserves A/B while pausing/resuming the same video

## Current Product Rules

This version intentionally keeps behavior simple and predictable.

- Currently optimized for **YouTube**
- Uses a floating control panel on the page
- Does **not** save A/B ranges across videos
- When switching to a new video:
  - A and B are cleared
  - Loop is reset to Off
- Pausing the current video does not clear A/B

## Demo Behavior

### Main workflow

1. Open a YouTube watch page
2. Wait for the LoopLock panel to appear
3. Play the video to the point you want
4. Click **Set A**
5. Continue to the desired end point
6. Click **Set B**
7. Click **Loop On**
8. The extension will repeatedly replay that A-B segment

### Expected reset behavior

When you:

- click into another YouTube video
- use browser Back to return to a different video
- use browser Forward to move to another video

LoopLock should:

- clear A/B
- reset Loop to Off
- treat the new video as a fresh session

## Screenshots

You can add screenshots here later.

Suggested sections:

- Floating panel on YouTube watch page
- Set A / Set B example
- Loop active state
- New video reset behavior

Example placeholder:

```md
![LoopLock panel screenshot](./docs/screenshot-panel.png)