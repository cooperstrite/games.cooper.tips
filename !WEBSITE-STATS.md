# Website stats

A little scoreboard for games.cooper.tips.

**Updated:** November 01, 2026 at 01:58 PM EST

**Visibility:** Project files only. This report is excluded from the published website.

## The big numbers

| Stat | Total |
| --- | ---: |
| Lines in our source files | **36,661** |
| Nonblank source lines | 34,698 |
| Source files written for this project | 208 |
| Image files | **206** |
| Total project files | **457** |
| Games | **29** |
| Games on the main list | 26 |
| Games in Coming Soon | 3 |
| Test files | 30 |
| Project size on disk | 192.1 MiB |
| Image collection size | 153.5 MiB |

At 50 lines per printed page, our source would fill **734 pages**.

## Where the lines live

| Area | Files | Lines |
| --- | ---: | ---: |
| Development tools | 4 | 415 |
| Tests | 30 | 3,859 |
| Website and games | 174 | 32,387 |

| Language | Files | Lines |
| --- | ---: | ---: |
| JavaScript | 188 | 28,211 |
| CSS | 15 | 6,671 |
| HTML | 3 | 1,576 |
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
| `script.js` | 5,865 |
| `style.css` | 4,589 |
| `submerged.html` | 1,457 |
| `neon-drift.js` | 838 |
| `theme.css` | 473 |

## All file types

| Type | Files |
| --- | ---: |
| `.js` | 159 |
| `.png` | 82 |
| `.webp` | 50 |
| `.svg` | 42 |
| `.jpg` | 31 |
| `.mjs` | 31 |
| `.json` | 27 |
| `.css` | 15 |
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
