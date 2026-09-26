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

