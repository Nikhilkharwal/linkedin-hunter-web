# LinkedIn Hunter — Web App

Extract hiring managers and recruiters' emails from LinkedIn based on a company job link.

## Deploy for Free

### Option 1: GitHub Pages (Recommended)

1. Create a new GitHub repository (e.g., `linkedin-hunter`)
2. Upload these files to the `main` branch:
   - `index.html`
   - `style.css`
   - `app.js`
3. Go to **Settings → Pages** in your repo
4. Set source to **Deploy from a branch**, branch `main`, folder `/ (root)`
5. Save — your app will be live at `https://<username>.github.io/linkedin-hunter/`

### Option 2: Vercel

1. Install the [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
2. Run `vercel` in the project folder
3. Follow the prompts — Vercel auto-deploys on every push
4. Your app gets a live URL like `https://linkedin-hunter.vercel.app`

### Option 3: Netlify

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag and drop the project folder
3. Get a live URL instantly

## How to Use

1. Deploy the web app
2. Open it in your browser
3. Paste a LinkedIn job URL and click **Start Extraction**
4. Drag the **Get Bookmarklet** button to your bookmarks bar
5. Navigate to LinkedIn (job page, company people page, or a profile)
6. Click the bookmarklet — it extracts data and opens the web app with results
7. View results, copy emails, or export CSV

## Features

- Paste any LinkedIn job URL (view, search-results, collections)
- Bookmarklet extracts company name, profile URLs, and emails
- Results displayed in the web app
- Copy all emails to clipboard
- Export results as CSV
- 100% free hosting