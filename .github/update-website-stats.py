#!/usr/bin/env python3
"""Refresh the private project scoreboard. Run from any working directory."""

from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
import math
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "!WEBSITE-STATS.md"
SKIP = {".git", ".playwright-cli", "output", "node_modules", "__pycache__"}
CODE = {".js": "JavaScript", ".mjs": "JavaScript", ".css": "CSS",
        ".html": "HTML", ".py": "Python", ".sh": "Shell"}
IMAGES = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg", ".ico"}


def size(byte_count):
    for unit in ("B", "KiB", "MiB", "GiB"):
        if byte_count < 1024 or unit == "GiB":
            return f"{byte_count:,.1f} {unit}"
        byte_count /= 1024


names = subprocess.check_output(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT
).decode().split("\0")
files = sorted({ROOT / name for name in names if name
                and not SKIP.intersection(Path(name).parts)
                and Path(name).name != ".DS_Store"
                and ROOT / name != REPORT and (ROOT / name).is_file()})
images = [path for path in files if path.suffix.lower() in IMAGES]
owned_code = [path for path in files if path.suffix.lower() in CODE
              and path.relative_to(ROOT).parts[0] != "vendor"]
line_counts = {path: len(path.read_text().splitlines()) for path in owned_code}
nonblank = sum(bool(line.strip()) for path in owned_code
               for line in path.read_text().splitlines())
languages = defaultdict(lambda: [0, 0])
areas = defaultdict(lambda: [0, 0])
for path, count in line_counts.items():
    languages[CODE[path.suffix.lower()]][0] += 1
    languages[CODE[path.suffix.lower()]][1] += count
    folder = path.relative_to(ROOT).parts[0]
    area = "Tests" if folder == "tests" else "Development tools" if folder in {".github", "scripts"} else "Website and games"
    areas[area][0] += 1
    areas[area][1] += count

script = (ROOT / "script.js").read_text()
game_section = script.split("const games = [", 1)[1].split("const appRoot", 1)[0]
games = re.findall(r'^    id: "([^"]+)",', game_section, re.MULTILINE)
locked_section = re.search(r"const LOCKED_GAME_IDS = new Set\(\[(.*?)\]\)", script, re.DOTALL)
locked = re.findall(r'"([^"]+)"', locked_section.group(1))
total_lines = sum(line_counts.values())
image_bytes = sum(path.stat().st_size for path in images)
stamp = datetime.now(ZoneInfo("America/New_York")).strftime("%B %d, %Y at %I:%M %p %Z")

rows = ["# Website stats", "", "A little scoreboard for games.cooper.tips.", "",
        f"**Updated:** {stamp}  ",
        "**Visibility:** Project files only. This report is excluded from the published website.", "",
        "## The big numbers", "", "| Stat | Total |", "| --- | ---: |",
        f"| Lines in our source files | **{total_lines:,}** |",
        f"| Nonblank source lines | {nonblank:,} |",
        f"| Source files written for this project | {len(owned_code):,} |",
        f"| Image files | **{len(images):,}** |",
        f"| Total project files | **{len(files):,}** |",
        f"| Games | **{len(games):,}** |",
        f"| Games on the main list | {len(set(games) - set(locked)):,} |",
        f"| Games in Coming Soon | {len(set(games) & set(locked)):,} |",
        f"| Test files | {sum(path.name.endswith('.test.mjs') for path in files):,} |",
        f"| Project size on disk | {size(sum(path.stat().st_size for path in files))} |",
        f"| Image collection size | {size(image_bytes)} |", "",
        f"At 50 lines per printed page, our source would fill **{math.ceil(total_lines / 50):,} pages**.", "",
        "## Where the lines live", "", "| Area | Files | Lines |", "| --- | ---: | ---: |"]
rows += [f"| {area} | {count:,} | {lines:,} |" for area, (count, lines) in sorted(areas.items())]
rows += ["", "| Language | Files | Lines |", "| --- | ---: | ---: |"]
rows += [f"| {language} | {count:,} | {lines:,} |" for language, (count, lines) in sorted(languages.items(), key=lambda item: -item[1][1])]
rows += ["", "## Image collection", "", "| Format | Images |", "| --- | ---: |"]
rows += [f"| {ext.lstrip('.').upper()} | {count:,} |" for ext, count in Counter(path.suffix.lower() for path in images).most_common()]
rows += ["", "## Biggest source files", "", "| File | Lines |", "| --- | ---: |"]
rows += [f"| `{path.relative_to(ROOT).as_posix()}` | {count:,} |" for path, count in sorted(line_counts.items(), key=lambda item: -item[1])[:5]]
rows += ["", "## All file types", "", "| Type | Files |", "| --- | ---: |"]
rows += [f"| `{ext or '(no extension)'}` | {count:,} |" for ext, count in Counter(path.suffix.lower() for path in files).most_common()]
rows += ["", "## Refresh the numbers", "", "Run this in the project's VS Code terminal:", "",
         "```sh", "python3 .github/update-website-stats.py", "```", "",
         "This is a snapshot, not a live counter. Run the command after adding or changing files.", "",
         "## What gets counted", "",
         "- Counts include saved files in the working tree, including uncommitted work.",
         "- Source lines include comments and blank lines. Nonblank lines still include comments; these are not counts of executable statements.",
         "- Source totals include game code, shared modules, tests, and development tools. Downloaded libraries in `vendor/` do not count as our code.",
         "- File totals and disk sizes include artwork, documentation, and vendor libraries. Images include raster files and SVGs.",
         "- Git history, ignored files, browser-test logs, review screenshots/videos in `output/`, dependencies in `node_modules/`, caches, and this report itself are excluded.",
         "- These are project-size stats, not visitor analytics. No visitor information is collected.",
         "- The Pages deployment removes this report, `.github/`, and `.vscode/` before uploading the website.", ""]
REPORT.write_text("\n".join(rows), encoding="utf-8")
print(f"Updated {REPORT.name}: {total_lines:,} source lines, {len(images):,} images, {len(files):,} files, {len(games):,} games.")
