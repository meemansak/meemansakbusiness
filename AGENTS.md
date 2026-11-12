# Meemansak Bharti website

## Working across devices

- Before working on the website, read `HANDOFF.md`, run `git status --short --branch` and `git log -5 --oneline`, and check the recorded branch and progress against the checkout. If they differ, use the Git history and files to establish the current state. Preserve existing local work.
- Update `HANDOFF.md` before replying to each website work prompt, including when work is partial or blocked. Record the branch or baseline commit, completed work, work in progress, verification performed, blockers or unverified items, and one concrete next step. Replace stale status and keep decisions that still affect future work.
- Keep the handoff update with the related changes when committing them. Before switching devices, push the relevant branch and pull that same branch on the other device. Follow the user's commit and push instructions.

## Design and behavior

- Use the existing typography and palette as the baseline for incremental edits. The site uses local DM Sans and Instrument Serif fonts, with warm whites, espresso and tan defined in `site.css`. Use a clearly visible animated reflective hover only on main h1 and h2 headings, localized to the cursor with softly fading edges. Buttons, boxes and interactive elements should have subtle movement-driven spring motion. Use a small transparent cursor ripple that fades when movement stops. Use light brown flowing waves for the scroll-drawn lines. Use references as inspiration for original work.
- Preserve responsive layouts, keyboard access, and the existing reduced-motion behavior when changing navigation, cards or animations.
- Edit page copy, business links and the inquiry address in `index.html`. Keep the inquiry form's email-draft workflow unless the user requests a different flow. Set session fees in `site.js` when the user confirms the amounts. Keep the current portrait until a replacement is provided. Keep YouTube videos and links off the site.

## Build, check and deploy

- This is a static site with no build step or package-managed test suite. Keep asset and module paths relative to the site so they work under the GitHub Pages project path.
- Preview over HTTP from the repository root with `python -m http.server 8000` if Python is available, then open `http://localhost:8000/`. For JavaScript syntax checks in PowerShell, use `Get-Content -Raw -LiteralPath site.js | node --input-type=module --check` and repeat for any changed first-party scripts.
- For behavior or layout changes, verify the affected flows in a browser at desktop and mobile widths. Check relevant keyboard and reduced-motion behavior. Record checks actually run in `HANDOFF.md`.
- GitHub Pages publishes the root of `main` at https://meemansak.github.io/meemansakbusiness/. After checking completed website changes, commit them together with the handoff update, push to `main`, and verify that the updated site is live before replying. Follow any deployment instruction the user gives for the current change.
