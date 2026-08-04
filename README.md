# LinkedIn Hunter — Web App

Extract hiring managers and recruiters' emails from LinkedIn job links — fully automatic.

## Features

- Paste a LinkedIn job URL → get filtered contacts (Hiring Manager, TA, Recruiter, etc.)
- Email verification via MX record check (verified emails shown in blue with ✓ badge)
- Optional subscription — enter your email to receive results by email
- CSV export and clipboard copy

## How It Works

1. Paste a LinkedIn job URL
2. The backend uses headless Chrome to scrape LinkedIn
3. Finds the company, scrapes employees from the company people page
4. Filters for recruiting roles only
5. Visits each profile to extract email (if visible)
6. Verifies email domains via MX lookup
7. Returns results to the web app

## Deploy Backend (Free)

### Render.com

1. Create a free account at [render.com](https://render.com)
2. Click **New + → Web Service**
3. Connect your GitHub repo (this folder's backend/)
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `node index.js`
6. Click **Create Web Service**

### Railway.app

```bash
npm install -g railway-cli
cd backend
railway init
railrail up
```

### Environment Variables (Backend)

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `SMTP_HOST` | SMTP server for subscription emails | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |

> **Tip:** For subscription emails, use Gmail with an [app-specific password](https://support.google.com/accounts/answer/185833).

## Deploy Frontend (Free)

### GitHub Pages

1. Create a GitHub repo
2. Upload `index.html`, `style.css`, `app.js`
3. Go to **Settings → Pages** → Source: `main` branch, `/ (root)`
4. Visit `https://<username>.github.io/<repo>/`

### Vercel / Netlify

Drag and drop the folder onto:
- [vercel.com/drop](https://vercel.com/drop)
- [app.netlify.com/drop](https://app.netlify.com/drop)

> **Don't forget:** Update `BACKEND_URL` in `app.js` to your deployed backend URL.

## Target Roles

Extracts contacts matching these roles:
- Hiring Manager
- Talent Acquisition (all variants)
- Manager Recruitment / TA Manager
- Recruiter / Sourcer
- Workforce Staffing Manager (WFS)
- Head of Talent / Recruiting
- + 15 more recruiting roles

See `backend/config.js` to customize.