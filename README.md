# Alumni Christmas Raffle Landing Page

This is a static landing page for The Junior &amp; Senior School Alumni Association’s First Annual Alumni Christmas Raffle. The content is generated from a CSV file so it’s easy to keep the prize list up to date.

## Updating the prize list

1. Edit `resources/raffle_prizes.csv` and update or add rows. The header should include the following columns:
   - `Id` (required) — a distinct positive integer used to identify each prize programmatically. This does not change the visual behaviour but is used to associate winners with prizes.
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

## Winners data

Winners are provided from a separate CSV at `resources/winners.csv`. The site reads winners from `resources/winners.csv` at startup and associates them with prizes by `Id`.

`winners.csv` should include the following columns (header names are case-insensitive):

- `Prize Id` — the numeric `Id` of the prize (matches the `Id` column in `resources/raffle_prizes.csv`).
- `Ticket number` — the winning ticket number. There may be multiple rows with the same `Prize Id` for multiple winners.

Behaviour:

- The prize card will be visually desaturated and slightly dimmed when winners exist.
- The prize title will display a strikethrough to indicate it has been claimed.
- Individual winning ticket badges will be displayed beside the prize title for each `Ticket number` row associated with that `Prize Id`.
- If the CSV contains a numeric `Quantity`, the site will decrement the available count by the number of recorded winners (clamped to a minimum of `0`) and show the updated availability on the card.

To mark winners, add rows to `winners.csv` with the appropriate `Prize Id` and `Ticket number`. The site loads `winners.csv` on startup and applies winners automatically.
