# StillYours landing

Standalone static website for StillYours. It is **not** part of the production
mobile app repository.

Public URL:

https://bekirs01.github.io/stillyours-landing/

## Local preview

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

Relative asset paths are required so GitHub Pages can serve the site from
`/stillyours-landing/`.

## Config

Edit `config.js`:

- `APP_STORE_URL` — live App Store listing
- `GOOGLE_PLAY_URL` — live Play listing
- `GA4_MEASUREMENT_ID`

Store buttons read from this file. HTML also includes the same URLs so the
page still works if JavaScript is blocked.

## Tracking

The page can read campaign parameters from its own URL:

- `utm_source`
- `utm_medium`
- `utm_campaign`

Those values are not copied onto Apple or Google store URLs.

GA4 events (only if `GA4_MEASUREMENT_ID` is a real `G-` id):

- `app_store_click`
- `play_store_click`

## GitHub Pages

Static HTML/CSS/JS with relative paths. `.nojekyll` is included so GitHub Pages
does not process the site with Jekyll.

Do not publish from the production StillYours app repository.
