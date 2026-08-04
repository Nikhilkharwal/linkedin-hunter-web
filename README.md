# LinkedIn Hunter — Web App

Extract hiring managers and recruiters' emails from LinkedIn job links — fully automatic, with real-time progress.

**Live Demo:** https://nikhilkharwal.github.io/linkedin-hunter-web/

## How It Works

1. Paste a LinkedIn job URL
2. Backend uses headless Chrome (Puppeteer) to scrape LinkedIn
3. Extracts company → scrapes company people page → visits each profile
4. Limits to **12 relevant contacts** (faster extraction)
5. Filters for recruiting roles only (Hiring Manager, TA, Recruiter, etc.)
6. Verifies email domains via MX lookup (verified = blue)
7. Real-time **progress bar** shows status and ETA
8. Results appear in web app — copy emails or export CSV

## Deploy Backend (Free)

### Render.com

1. Create a free account at [render.com](https://render.com)
2. Click **New + → Web Service**
3. Connect your GitHub repo (the `backend/` folder)
4. Build Command: `npm install`
5. Start Command: `node index.js`
6. Click **Create Web Service**

Backend URL: `https://<your-service>.onrender.com`

### Railway.app

```bash
npm install -g railway-cli
cd backend
railway init
railway up
```

## Deploy Frontend (Free)

### GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
# Then Settings → Pages → Source: main branch, / (root)
```

### Vercel / Netlify

Drag and drop the folder onto [vercel.com/drop](https://vercel.com/drop) or [netlify.com/drop](https://netlify.com/drop)

> **Don't forget:** Update `BACKEND_URL` in `app.js` to your deployed backend URL.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/extract` | Start extraction (returns `taskId`) |
| `GET` | `/api/progress/:taskId` | Poll for progress (SSE-style) |
| `POST` | `/api/results/:token` | Send results to subscribed email |

## Target Roles

Filters for contacts matching:
- Hiring Manager
- Talent Acquisition (all variants)
- Manager Recruitment / TA Manager
- Recruiter / Sourcer
- Workforce Staffing Manager (WFS)
- Head of Talent / Recruiting
- + 15+ more recruiting roles

See `backend/config.js` to customize.