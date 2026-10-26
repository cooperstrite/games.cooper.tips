# Website stats

A little scoreboard for games.cooper.tips.

**Updated:** October 26, 2026 at 07:07 PM EDT

**Visibility:** Project files only. This report is excluded from the published website.

## The big numbers

| Stat | Total |
| --- | ---: |
| Lines in our source files | **33,378** |
| Nonblank source lines | 31,322 |
| Source files written for this project | 159 |
| Image files | **165** |
| Total project files | **357** |
| Games | **28** |
| Games on the main list | 25 |
| Games in Coming Soon | 3 |
| Test files | 24 |
| Project size on disk | 130.8 MiB |
| Image collection size | 92.6 MiB |

At 50 lines per printed page, our source would fill **668 pages**.

## Where the lines live

| Area | Files | Lines |
| --- | ---: | ---: |
| Development tools | 4 | 415 |
| Tests | 24 | 3,149 |
| Website and games | 131 | 29,814 |

| Language | Files | Lines |
| --- | ---: | ---: |
| JavaScript | 145 | 25,620 |
| CSS | 10 | 6,011 |
| HTML | 2 | 1,544 |
| Python | 2 | 203 |

## Image collection

| Format | Images |
| --- | ---: |
| WEBP | 50 |
| PNG | 43 |
| SVG | 42 |
| JPG | 29 |
| AVIF | 1 |

## Biggest source files

| File | Lines |
| --- | ---: |
| `script.js` | 6,816 |
| `style.css` | 4,946 |
| `submerged.html` | 1,456 |
| `neon-drift.js` | 838 |
| `aurora-archery.js` | 425 |

## All file types

| Type | Files |
| --- | ---: |
| `.js` | 122 |
| `.webp` | 50 |
| `.png` | 43 |
| `.svg` | 42 |
| `.jpg` | 29 |
| `.mjs` | 25 |
| `.json` | 17 |
| `.css` | 10 |
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
