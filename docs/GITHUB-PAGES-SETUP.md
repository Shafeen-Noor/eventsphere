# GitHub Pages setup (fix 404)

The site files are on the **`gh-pages`** branch. GitHub Pages must be turned on once in repo settings.

## Steps

1. Open **https://github.com/Shafeen-Noor/eventsphere/settings/pages**
2. Under **Build and deployment → Source**, choose **Deploy from a branch**
3. **Branch:** `gh-pages` · **Folder:** `/ (root)`
4. Click **Save**
5. Wait ~1 minute, then open **https://shafeen-noor.github.io/eventsphere/**

## What's deployed

- `index.html` — materials hub
- `mvp.html`, `cac.html`, `ltv.html`
- `EventSphere-Timeless-Moments-Platform.pdf` (pitch deck)
- `readme.html`, `investor-onboarding.html`, `EventSphere-PRD.pdf`

## Auto-updates

Pushing changes to `docs/` on `master` runs `.github/workflows/pages.yml`, which syncs to `gh-pages`.
