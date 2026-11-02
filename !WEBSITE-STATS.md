# Website stats

A little scoreboard for games.cooper.tips.

**Updated:** November 02, 2026 at 05:41 PM EST

**Visibility:** Project files only. This report is excluded from the published website.

## The big numbers

| Stat | Total |
| --- | ---: |
| Lines in our source files | **36,929** |
| Nonblank source lines | 35,154 |
| Source files written for this project | 231 |
| Image files | **211** |
| Total project files | **486** |
| Games | **29** |
| Games on the main list | 26 |
| Games in Coming Soon | 3 |
| Test files | 33 |
| Project size on disk | 199.7 MiB |
| Image collection size | 160.8 MiB |

At 50 lines per printed page, our source would fill **739 pages**.

## Where the lines live

| Area | Files | Lines |
| --- | ---: | ---: |
| Development tools | 4 | 415 |
| Tests | 33 | 4,365 |
| Website and games | 194 | 32,149 |

| Language | Files | Lines |
| --- | ---: | ---: |
| JavaScript | 207 | 29,793 |
| CSS | 19 | 6,799 |
| Python | 2 | 203 |
| HTML | 3 | 134 |

## Image collection

| Format | Images |
| --- | ---: |
| PNG | 86 |
| WEBP | 50 |
| SVG | 43 |
| JPG | 31 |
| AVIF | 1 |

## Biggest source files

| File | Lines |
| --- | ---: |
| `script.js` | 5,280 |
| `style.css` | 4,441 |
| `neon-drift.js` | 838 |
| `theme.css` | 472 |
| `aurora-archery.js` | 425 |

## All file types

| Type | Files |
| --- | ---: |
| `.js` | 175 |
| `.png` | 86 |
| `.webp` | 50 |
| `.svg` | 43 |
| `.mjs` | 34 |
| `.jpg` | 31 |
| `.json` | 28 |
| `.css` | 19 |
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
