# Agent Handbook for games.cooper.tips

## Project Snapshot
- Static single-page web app inspired by neal.fun aesthetics.
- Frontend only: `index.html`, `style.css`, `script.js`. No build tooling.
- Hosted on GitHub Pages via `.github/workflows/deploy.yml`.

## Local Workflow
1. Use `npx serve .` or `python3 -m http.server 4173` from the repo root for local preview.
2. After changes, manually exercise each mini-game (Hot & Cold, Flash Reflex, Lights Down).
3. Inspect responsive behavior with browser devtools; layout supports narrow viewports.

## Deployment Notes
- Pushes to `main` trigger the GitHub Actions workflow (`Deploy static site`) that uploads the repo contents and deploys to Pages.
- If troubleshooting, check the Pages deployment summary in the workflow run.
- Manual fallback: enable GitHub Pages from the `main` branch root in repository settings.

## Agent Practices
- Keep files ASCII unless existing content requires otherwise.
- Use `apply_patch` for edits when practical; create new files with heredocs if needed.
- Maintain succinct, meaningful commit messages; commit after each logical change set.
- Reference files with `line` numbers in user summaries when highlighting changes.
- Respect existing user modifications and avoid reverting unrelated diffs.

## Useful References
- `README.md` contains user-facing instructions for local testing and deployment.
- `.github/workflows/deploy.yml` defines CI/CD behavior.
- `script.js` exposes the `games` array for adding or editing mini-games.
