# Website stats

A little scoreboard for games.cooper.tips.

**Updated:** October 30, 2026 at 10:03 PM EDT

**Visibility:** Project files only. This report is excluded from the published website.

## The big numbers

| Stat | Total |
| --- | ---: |
| Lines in our source files | **43,528** |
| Nonblank source lines | 40,387 |
| Source files written for this project | 191 |
| Image files | **203** |
| Total project files | **436** |
| Games | **29** |
| Games on the main list | 25 |
| Games in Coming Soon | 4 |
| Test files | 27 |
| Project size on disk | 222.1 MiB |
| Image collection size | 141.2 MiB |

At 50 lines per printed page, our source would fill **871 pages**.

## Where the lines live

| Area | Files | Lines |
| --- | ---: | ---: |
| Development tools | 4 | 415 |
| Tests | 27 | 3,544 |
| Website and games | 160 | 39,569 |

| Language | Files | Lines |
| --- | ---: | ---: |
| JavaScript | 173 | 26,957 |
| HTML | 3 | 9,782 |
| CSS | 13 | 6,586 |
| Python | 2 | 203 |

## Image collection

| Format | Images |
| --- | ---: |
| PNG | 79 |
| WEBP | 50 |
| SVG | 43 |
| JPG | 30 |
| AVIF | 1 |

## Biggest source files

| File | Lines |
| --- | ---: |
| `masterpiece-standalone.html` | 8,220 |
| `script.js` | 6,292 |
| `style.css` | 4,733 |
| `submerged.html` | 1,457 |
| `neon-drift.js` | 838 |

## All file types

| Type | Files |
| --- | ---: |
| `.js` | 147 |
| `.png` | 79 |
| `.webp` | 50 |
| `.svg` | 43 |
| `.jpg` | 30 |
| `.mjs` | 28 |
| `.json` | 26 |
| `.css` | 13 |
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
