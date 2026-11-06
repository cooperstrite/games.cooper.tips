# Website stats

A little scoreboard for games.cooper.tips.

**Updated:** November 06, 2026 at 05:17 PM EST

**Visibility:** Project files only. This report is excluded from the published website.

## The big numbers

| Stat | Total |
| --- | ---: |
| Lines in our source files | **40,302** |
| Nonblank source lines | 38,561 |
| Source files written for this project | 268 |
| Image files | **214** |
| Total project files | **528** |
| Games | **30** |
| Games on the main list | 27 |
| Games in Coming Soon | 3 |
| Test files | 39 |
| Project size on disk | 206.8 MiB |
| Image collection size | 167.6 MiB |

At 50 lines per printed page, our source would fill **807 pages**.

## Where the lines live

| Area | Files | Lines |
| --- | ---: | ---: |
| Development tools | 4 | 415 |
| Tests | 39 | 5,159 |
| Website and games | 225 | 34,728 |

| Language | Files | Lines |
| --- | ---: | ---: |
| JavaScript | 240 | 32,977 |
| CSS | 23 | 6,984 |
| Python | 2 | 203 |
| HTML | 3 | 138 |

## Image collection

| Format | Images |
| --- | ---: |
| PNG | 89 |
| WEBP | 50 |
| SVG | 43 |
| JPG | 31 |
| AVIF | 1 |

## Biggest source files

| File | Lines |
| --- | ---: |
| `script.js` | 4,608 |
| `style.css` | 4,031 |
| `neon-drift.js` | 838 |
| `theme.css` | 470 |
| `aurora-archery.js` | 425 |

## All file types

| Type | Files |
| --- | ---: |
| `.js` | 202 |
| `.png` | 89 |
| `.webp` | 50 |
| `.svg` | 43 |
| `.mjs` | 40 |
| `.jpg` | 31 |
| `.json` | 30 |
| `.css` | 23 |
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
