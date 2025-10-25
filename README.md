# Alumni Christmas Raffle Landing Page

This is a static landing page for The Junior &amp; Senior School Alumni Association’s First Annual Alumni Christmas Raffle. The content is generated from a CSV file so it’s easy to keep the prize list up to date.

## Updating the prize list

1. Edit `resources/raffle_prizes.csv` and update or add rows. The header should include the following columns:
   - `Item` (required)
   - `Type`, `Quantity`, `Provider`, `Value` (optional but recommended)
   - `Provider Path` (optional — folder name inside `assets/providers/` with logo/links for the provider)
   - `Assets Path` (optional — folder name inside `assets/images/` containing gallery images)
2. (Optional) Add provider assets in `assets/providers/<Provider Path>`:
   - `links.json` — object with keys `web`, `facebook`, `instagram`, `tel`; each renders a Font Awesome icon next to the provider (telephone numbers create `tel:` links automatically).
   - `logo.(png|jpg|jpeg|svg|webp)` — save the provider logo with this basename; the deployment workflow generates an `index.json` manifest that points to the correct file extension automatically.
3. (Optional) Add carousel images in `assets/images/<Assets Path>/`. Any filename and browser-friendly format works—the deployment workflow generates an `index.json` manifest automatically so non-technical contributors can drag-and-drop images.
4. Sparkle particles on the page can be disabled by setting `ENABLE_SPARKLES` to `false` in `script.js`.
5. No build step is required. Commit the changes and push to GitHub; GitHub Pages will serve the updated site automatically.

## Local preview

Open `index.html` in your browser to preview the page locally. If you’re running a local web server, make sure the `resources/` and `images/` folders remain in the same relative locations.

## GitHub Pages workflow

The workflow defined in `.github/workflows/deploy.yml` builds and publishes the site to GitHub Pages. During the build it runs `scripts/generate-image-manifests.js`, which scans every directory under `assets/images/` and `assets/providers/`, writing `index.json` files that describe gallery images and provider logo filenames. This lets non-technical contributors add or remove assets simply by dragging files into the relevant folders—no manual manifest editing required. To test locally, run `node scripts/generate-image-manifests.js` before opening the site.
