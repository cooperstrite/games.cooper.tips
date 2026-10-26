# Website stats

A little scoreboard for games.cooper.tips.

**Updated:** October 26, 2026 at 05:22 PM EDT

**Visibility:** Project files only. This report is excluded from the published website.

## The big numbers

| Stat | Total |
| --- | ---: |
| Lines in our source files | **33,061** |
| Nonblank source lines | 30,952 |
| Source files written for this project | 148 |
| Image files | **156** |
| Total project files | **335** |
| Games | **28** |
| Games on the main list | 25 |
| Games in Coming Soon | 3 |
| Test files | 22 |
| Project size on disk | 121.0 MiB |
| Image collection size | 83.0 MiB |

At 50 lines per printed page, our source would fill **662 pages**.

## Where the lines live

| Area | Files | Lines |
| --- | ---: | ---: |
| Development tools | 4 | 415 |
| Tests | 22 | 2,967 |
| Website and games | 122 | 29,679 |

| Language | Files | Lines |
| --- | ---: | ---: |
| JavaScript | 135 | 25,144 |
| CSS | 9 | 6,171 |
| HTML | 2 | 1,543 |
| Python | 2 | 203 |

## Image collection

| Format | Images |
| --- | ---: |
| WEBP | 50 |
| SVG | 42 |
| PNG | 37 |
| JPG | 26 |
| AVIF | 1 |

## Biggest source files

| File | Lines |
| --- | ---: |
| `script.js` | 7,143 |
| `style.css` | 5,122 |
| `submerged.html` | 1,456 |
| `neon-drift.js` | 838 |
| `aurora-archery.js` | 425 |

## All file types

| Type | Files |
| --- | ---: |
| `.js` | 114 |
| `.webp` | 50 |
| `.svg` | 42 |
| `.png` | 37 |
| `.jpg` | 26 |
| `.mjs` | 23 |
| `.json` | 15 |
| `.css` | 9 |
| `.md` | 7 |
| `.mp4` | 4 |
| `.py` | 2 |
| `.html` | 2 |
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
