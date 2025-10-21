# Landing Page Update Plan

## Overview

Extend the raffle landing page so each prize can pull optional assets from provider-specific folders defined in a new `Path` column. Assets may include provider logos, external link metadata (`links.json`), and multi-image galleries. All additions must be resilient to missing files.

## Key Changes

1. **Data Loading**
   - Update CSV parser to capture the new `Path` column.
   - For each prize with a path, attempt to load:
     - `assets/<path>/links.json`
     - `assets/<path>/logo.*` (png/jpg/jpeg/svg)
     - `assets/<path>/images/*`
   - Handle 404s gracefully—missing assets should simply skip rendering.

2. **External Links UI**
   - Add Font Awesome to the page (prefer CDN).
   - When `links.json` is present, render icons next to the “Provided by” label for `web`, `facebook`, and `instagram`. Icons should open links in new tabs and only appear for supplied keys.

3. **Provider Logo**
   - Display the provider logo, when available, beneath the value field inside the prize content column. Ensure images scale sensibly and include alt text tied to the provider.

4. **Image Carousel**
   - Introduce a manual carousel on each card when images exist.
   - Place the carousel to the right of the textual content on desktop, stacked above on mobile.
   - Include overlayed left/right arrow controls and (if straightforward) a bottom overlay of page dots indicating the active slide.
   - (low priority) Ensure keyboard accessibility for carousel controls.

5. **Styling & Layout**
   - Refactor card structure to accommodate two-column layout (content + carousel) without breaking existing responsive behaviour.
   - Add styling for new icons, logo block, carousel controls, and dot indicators while keeping the minimal dark green theme.

6. **Documentation**
   - Update `README.md` with instructions for supplying the `Path` value, preparing asset folders, acceptable file types, and carousel behaviour.

## Validation

- Test locally via static server to confirm CSV, logos, links, and carousels load when assets are present.
- Verify cards render correctly when some or all optional assets are absent.
