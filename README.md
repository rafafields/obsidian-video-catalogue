# Obsidian Video Catalogue

**Obsidian Video Catalogue (OVC)** is a desktop plugin for [Obsidian](https://obsidian.md) that automatically scans a folder of video files, extracts frames using FFmpeg, and sends them to a multimodal AI model via [OpenRouter](https://openrouter.ai) to generate categorized, tagged notes directly in your vault.

## Features

- Scans any folder on your system for video files (`.mp4`, `.mkv`, `.mov`, `.avi`, `.webm` and more)
- Extracts frames from each video at configurable intervals using a bundled FFmpeg binary (auto-downloaded on first use)
- Sends frames to a multimodal AI model for analysis
- Generates an Obsidian note per video with:
  - Title, description and category
  - Tags with a customizable prefix (default: `OVC-`)
  - Timeline of key events detected in the frames
  - Video metadata (size, extension, path, date)
- Tracks which videos have already been processed to avoid duplicates
- Supports multiple AI models via OpenRouter

## Installation

1. Download the latest release and copy `main.js`, `manifest.json` and `styles.css` to your vault at `.obsidian/plugins/obsidian-video-catalogue/`
2. Enable the plugin in **Settings → Community Plugins**
3. On first activation, FFmpeg will be downloaded automatically in the background (requires internet connection, ~50 MB)

## Setup

1. Go to **Settings → Obsidian Video Catalogue**
2. Enter the **video folder path** (absolute path on your system, e.g. `C:/Videos` or `/home/user/Videos`)
3. Enter the **note folder** inside your vault where notes will be created (e.g. `Videos/Notes`)
4. Add your **OpenRouter API key** ([get one here](https://openrouter.ai/keys))
5. Choose an **AI model** — Google Gemini 3 Flash is recommended for speed and quality
6. Optionally adjust the **number of frames** to extract (1–10) and the **tag prefix**

## Usage

Once configured, click **Generate Notes** in the settings tab or run the command **Generate notes for all videos** from the command palette.

A progress window will show:
- Total videos found
- Already processed (skipped)
- Videos being processed in real time
- A live log with timestamps

You can cancel at any time.

## Generated Note Format

Each note includes a YAML frontmatter block and structured content:

```markdown
---
videoPath: C:/Videos/my-video.mp4
category: Tutorial
tags:
  - OVC-tutorial
  - OVC-programming
generatedDate: 2026-03-21
videoSize: 245.3 MB
videoExtension: .mp4
---

#OVC-tutorial #OVC-programming

# My Video Title

## Description
A tutorial covering...

## Category
Tutorial

## Important Events
- **00:00**: Introduction
- **02:30**: Main topic begins

## Metadata
- **File**: my-video.mp4
- **Size**: 245.3 MB
- **Last Modified**: 21/3/2026
- **Generated**: 21/3/2026, 11:00:00
```

## FFmpeg

FFmpeg is downloaded automatically the first time the plugin loads. It is stored in the plugin directory and never requires manual installation. You can check for updates or reinstall it from the **Settings → FFmpeg** section.

## Configuration Reference

| Setting | Description | Default |
|---------|-------------|---------|
| Video folder path | Absolute path to the folder with your videos | — |
| Note folder | Path inside the vault for generated notes | — |
| OpenRouter API Key | Your OpenRouter key for AI access | — |
| AI Model | Model used for video analysis | Google Gemini 3 Flash |
| Frames to extract | How many frames per video are sent to the AI | 5 |
| Tag prefix | Prefix added to all generated tags | `OVC-` |

## Author

Made by **Wondermochi**.
