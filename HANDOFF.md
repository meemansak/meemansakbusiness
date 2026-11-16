# Website handoff

## Current state

- Branch and baseline: `main`, based on `b737c33` before the mobile layout update. The checkout matched GitHub at the start.
- Completed: Reworked the hero, biography and services. Replaced the film gallery with business profiles for Wedditors and Capture Camera, with their site links, Capture Camera Instagram, and personal social links. Removed the YouTube links, embeds and video modal.
- Completed: Applied a warm-white, espresso and tan palette to the site and sculpture. Kept the local DM Sans and Instrument Serif fonts and the current portrait. Replaced the blue scroll-drawn line with a light brown wave, expanded cursor-responsive button effects, added a warm spotlight to the business heading and retained the four-card scroll and flip interaction.
- Hero and motion: The uppercase MEEMANSAK title sits higher in the fullscreen hero in Instrument Serif italic. The photo starts at 22px blur and clears to a 6px floor as the hero scrolls away. Scrolling back reverses the effect. Removed cursor displacement, spring movement and rainbow reflections. Headings glow softly in white across their full text on hover. Buttons reveal a brown or white fill with a sliding sweep.
- Homepage copy and SEO: Updated the title, description and canonical URL. Clarified who the site helps and added examples of service pricing, AI-assisted replies, client intake, outreach and custom development to the visible copy.
- Cross-device workflow: `AGENTS.md` tells Codex to pull the latest clean `main` before editing, read this handoff, and update it along with the related changes. `README.md` gives the starting steps for either computer.
- Mobile layout: Aligned the hero title, description and actions on a shared left edge. Adjusted hero height and section spacing, increased mobile menu and form tap areas, stacked inquiry fields, and let service cards fit their content in one column at 460px and below.
- Verification: Chrome checks passed at 1440px, 650px, 430px, 390px, 375px and 320px, with reduced motion at 320px. Checked hero alignment and first-screen fit, service card clipping and flip, horizontal overflow, form spacing, menu tap areas and Escape focus. Visually checked the 390px hero.
- Deployment: GitHub Pages publishes the homepage from `main`. Search indexing and ranking changes have not been measured.
- Pending content: Session fees remain placeholders pending confirmed amounts.

## Decisions to carry forward

- Use references for inspiration and keep the site's design and copy original. The preferred palette is warm white and brown with light brown scroll waves. Keep pointer feedback to white heading glow and sliding button fills. The hero portrait stays blurred and clears only partially during scroll. Keep YouTube off the site.
- GitHub Pages publishes the root of main. The user wants each completed, checked website change deployed as part of the same task. Pull main when switching devices.
- The inquiry form opens an email draft to hello@meemansak.com.

## Next step

On another computer, pull the latest `main` on a clean checkout, open the repository in Codex, and read this handoff before making the next change. Update session fees when the user supplies them.
