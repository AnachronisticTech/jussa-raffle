# Alumni Christmas Raffle Landing Page

This is a static landing page for The Junior &amp; Senior School Alumni Association’s First Annual Alumni Christmas Raffle. The content is generated from a CSV file so it’s easy to keep the prize list up to date.

## Updating the prize list

1. Edit `resources/raffle_prizes.csv` and update or add rows. The header should include the following columns:
   - `Item` (required)
   - `Type`, `Quantity`, `Provider`, `Value` (optional but recommended)
   - `Image` (optional — file name with extension, e.g. `spa-day.jpg`)
   - `Path` (optional — folder name inside `assets/` that contains extra media for the prize)
   - `Link` (optional — full URL for more information)
2. Save new prize images in the `images/` directory if you are using the single `Image` column fallback. Filenames must match the values in the CSV.
3. (Optional) Create an asset bundle for a prize by adding a folder at `assets/<Path>` containing any of:
   - `links.json` — object with keys `web`, `facebook`, `instagram`; each renders a Font Awesome icon next to the provider.
   - `logo.(png|jpg|jpeg|svg|webp)` — a provider logo shown beneath the value.
   - `images/` — a collection of gallery images for the prize. Any filename and browser-friendly format works.  
     - If your hosting platform does not expose directory listings (e.g. GitHub Pages), add an `index.json` file inside that `images/` folder listing the image filenames so the carousel can load them.
   - Keep all prize asset folders inside the top-level `assets/` directory so the site can resolve paths correctly.
4. No build step is required. Commit the changes and push to GitHub; GitHub Pages will serve the updated site automatically.

## Local preview

Open `index.html` in your browser to preview the page locally. If you’re running a local web server, make sure the `resources/` and `images/` folders remain in the same relative locations.
