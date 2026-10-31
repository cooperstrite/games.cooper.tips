# Website stats

A little scoreboard for games.cooper.tips.

**Updated:** October 31, 2026 at 09:45 AM EDT

**Visibility:** Project files only. This report is excluded from the published website.

## The big numbers

| Stat | Total |
| --- | ---: |
| Lines in our source files | **36,567** |
| Nonblank source lines | 34,530 |
| Source files written for this project | 203 |
| Image files | **206** |
| Total project files | **452** |
| Games | **29** |
| Games on the main list | 26 |
| Games in Coming Soon | 3 |
| Test files | 29 |
| Project size on disk | 192.0 MiB |
| Image collection size | 153.5 MiB |

At 50 lines per printed page, our source would fill **732 pages**.

## Where the lines live

| Area | Files | Lines |
| --- | ---: | ---: |
| Development tools | 4 | 415 |
| Tests | 29 | 3,742 |
| Website and games | 170 | 32,410 |

| Language | Files | Lines |
| --- | ---: | ---: |
| JavaScript | 184 | 28,121 |
| CSS | 14 | 6,668 |
| HTML | 3 | 1,575 |
| Python | 2 | 203 |

## Image collection

| Format | Images |
| --- | ---: |
| PNG | 82 |
| WEBP | 50 |
| SVG | 42 |
| JPG | 31 |
| AVIF | 1 |

## Biggest source files

| File | Lines |
| --- | ---: |
| `script.js` | 6,275 |
| `style.css` | 4,724 |
| `submerged.html` | 1,457 |
| `neon-drift.js` | 838 |
| `theme.css` | 476 |

## All file types

| Type | Files |
| --- | ---: |
| `.js` | 156 |
| `.png` | 82 |
| `.webp` | 50 |
| `.svg` | 42 |
| `.jpg` | 31 |
| `.mjs` | 30 |
| `.json` | 27 |
| `.css` | 14 |
| `.md` | 7 |
| `.mp4` | 4 |
| `.html` | 3 |
| `.py` | 2 |
| `.yml` | 1 |
| `.bin` | 1 |
| `.avif` | 1 |
| `(no extension)` | 1 |

## Refresh the numbers

Run this in the project's VS Code terminal:

```sh
python3 .github/update-website-stats.py
```

This is a snapshot, not a live counter. Run the command after adding or changing files.

## What gets counted

- Counts include saved files in the working tree, including uncommitted work.
- Source lines include comments and blank lines. Nonblank lines still include comments; these are not counts of executable statements.
- Source totals include game code, shared modules, tests, and development tools. Downloaded libraries in `vendor/` do not count as our code.
- File totals and disk sizes include artwork, documentation, and vendor libraries. Images include raster files and SVGs.
- Git history, ignored files, browser-test logs, review screenshots/videos in `output/`, dependencies in `node_modules/`, caches, and this report itself are excluded.
- These are project-size stats, not visitor analytics. No visitor information is collected.
- The Pages deployment removes this report, `.github/`, and `.vscode/` before uploading the website.
