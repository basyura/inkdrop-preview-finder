# Repository Guidelines

## Project Structure & Module Organization

This repository is a small Inkdrop plugin targeting Inkdrop v6 and later. Core behavior lives in `lib/preview-finder.js`, which registers commands, tracks matches, and exposes the public `find()` API. UI styling is isolated in `styles/preview-finder.css`. Documentation and release notes live in `README.md` and `CHANGELOG.md`. Visual assets are stored under `images/`.

Keep new logic in `lib/` and limit `styles/` to presentation-only changes. If you add assets, place them in `images/` and reference them from the README or plugin UI as needed.

## Build, Test, and Development Commands

This package does not define npm scripts. Use the commands below directly:

- `npm install`: install local dependencies such as `inkdrop-model`.
- `npm pack`: create a tarball to verify the package can be bundled cleanly.
- `npx prettier --check lib/preview-finder.js styles/preview-finder.css`: check formatting before submitting changes.
- `npx prettier --write lib/preview-finder.js styles/preview-finder.css`: apply the repository formatting rules.

For local verification, load the plugin in Inkdrop and exercise `preview-finder:open`, `preview-finder:next`, and `preview-finder:prev` in the preview pane.

## Inkdrop API Notes

Check the Inkdrop API docs at `https://github.com/inkdropapp/api-docs/` before changing package APIs, editor hooks, or preview integrations. For migration work, refer to `https://github.com/inkdropapp/api-docs/blob/main/src/app/appendix/plugin-migration-from-v5-to-v6/page.mdx`.

Inkdrop v6 upgraded CodeMirror from v5 to v6. Review editor-facing code carefully when touching event handling or editor integration, and confirm any old v5 assumptions still apply.

## Coding Style & Naming Conventions

Follow the existing JavaScript style in `lib/preview-finder.js`: 2-space indentation, semicolons, double quotes, and a 100-character line width. Prettier is configured in `.prettierrc`; use it instead of hand-formatting.

Match established naming patterns:

- command names: `preview-finder:<action>`
- stylesheet classes: `.preview-finder-*`
- module entry point: `lib/preview-finder.js`

Prefer small methods on the `PreviewFinder` class over introducing extra files unless the plugin grows substantially.

## Testing Guidelines

There is no automated test suite yet. Validate changes manually in Inkdrop, especially note switching, IME input, Escape handling, and repeated search navigation. When fixing a bug, include reproducible steps in the PR so reviewers can verify behavior quickly.

## Commit & Pull Request Guidelines

Recent history uses short, imperative commit subjects such as `fix width`, `add api : find`, and `Prepare v0.8.0 release`. Keep commits focused and concise, preferably one change per commit.

Pull requests should include a brief summary, manual test steps, and screenshots or GIFs for any visible UI change. Link related issues when applicable and call out command or API changes that affect plugin users.
