# NOIR WORDS

A responsive TOEIC vocabulary practice app. Buildless HTML/CSS/JavaScript; all learning state is stored locally in the current browser.

## Use

Choose one or more DAYs, a question count, and English-to-Korean or Korean-to-English mode. Questions are sampled without replacement. The app provides immediate feedback, a result summary, wrong-answer review, searchable vocabulary, the latest 50 completed sessions, and resumable progress. Keyboard shortcuts: 1–4 to answer, Enter to continue.

## Data

`dist/words.json` contains 183 unique expressions from the 204 source records across DAY1–DAY6. Each entry retains its original values and DAY membership. DAY5 and DAY6 contain the same four words. Clear spelling and truncated-meaning errors are corrected for study; original extract files remain separate and unchanged.

## Development

Serve `dist/` with any static HTTP server. Run `node --test tests/*.test.mjs` from this directory for engine tests. No dependency install or build is needed. The font stylesheet uses Google Fonts with local sans-serif and serif fallbacks.

## Checks performed

- Six automated tests cover source coverage, DAY filtering, unique questions, choice validity, both question directions, score calculation, skipped questions, repeated submission, wrong-only review, and known typo fixes.
- Browser walkthrough: mixed answers in a four-question quiz produce 50%; two wrong items can be retried for 100% and removed from the wrong-answer list.
- History survives refresh; saved incomplete quiz resumes at the same question with preserved answers.
- Search matches a corrected expression and displays an appropriate empty state for an unknown term.
- DAY selection with no eligible words disables start; a four-word DAY caps requested question counts to four while preserving four valid choices per question.
- Keyboard 1–4 and Enter, modal exit, desktop, iPad portrait, and mobile layouts reviewed in browser.

History and mistakes are browser-local and do not synchronize between devices or between the original Sites address and GitHub Pages.

## GitHub Pages

The `.github/workflows/pages.yml` workflow tests the quiz engine and publishes only `dist/` when `main` changes. There is no build step or dependency installation. In repository Settings → Pages, choose **GitHub Actions** as the source.

All assets, JavaScript imports, and vocabulary requests use relative URLs, so the app works under `/<repository>/` without a base-path override. Navigation changes the displayed content without introducing nested URL routes; refreshes need no rewrite or `404.html` fallback.

The original Work/Sites project is preserved separately. Its `.openai/hosting.json` metadata is retained here for reference; the GitHub workflow does not use it. A public GitHub Pages deployment makes the app and bundled vocabulary publicly accessible; learning history stays in each visitor's browser.
