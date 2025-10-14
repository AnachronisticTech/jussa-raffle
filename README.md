# Alumni Christmas Raffle Landing Page

This is a static landing page for The Junior &amp; Senior School Alumni Association’s First Annual Alumni Christmas Raffle. The content is generated from a CSV file so it’s easy to keep the prize list up to date.

## Updating the prize list

1. Edit `resources/raffle_prizes.csv` and update or add rows. The header should include the following columns:
   - `Item` (required)
   - `Type`, `Quantity`, `Provider`, `Value` (optional but recommended)
   - `Image` (optional — file name with extension, e.g. `spa-day.jpg`)
   - `Link` (optional — full URL for more information)
2. Save new prize images in the `images/` directory. Filenames must match the values used in the `Image` column.
3. No build step is required. Commit the changes and push to GitHub; GitHub Pages will serve the updated site automatically.

## Local preview

Open `index.html` in your browser to preview the page locally. If you’re running a local web server, make sure the `resources/` and `images/` folders remain in the same relative locations.
