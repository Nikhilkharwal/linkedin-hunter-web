const express = require('express');
const dns = require('dns').promises;
const cors = require('cors');
const nodemailer = require('nodemailer');
const { TARGET_ROLES, matchesTargetRole } = require('./config');
const puppeteer = require('puppeteer');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const subscriptions = new Map();
const emailCache = new Map();
const tasks = new Map();

function normalizeJobUrl(jobUrl) {
  try {
    const url = new URL(jobUrl);
    if (url.pathname.includes('/search-results/') || url.pathname.includes('/collections/')) {
      const jobId = url.searchParams.get('currentJobId');
      if (jobId) {
        url.pathname = `/jobs/view/${jobId}/`;
        url.search = '';
        return url.toString();
      }
    }
    return jobUrl;
  } catch {
    return jobUrl;
  }
}

async function verifyEmailDomain(email) {
  if (!email) return { verified: false, reason: 'No email' };
  const cached = emailCache.get(email);
  if (cached !== undefined) return cached;

  const domain = email.split('@')[1];
  if (!domain) return { verified: false, reason: 'Invalid domain' };

  try {
    const mx = await dns.resolveMx(domain);
    const isValid = Array.isArray(mx) && mx.length > 0;
    const result = { verified: isValid, reason: isValid ? 'MX record found' : 'No MX record' };
    emailCache.set(email, result);
    setTimeout(() => emailCache.delete(email), 3600000);
    return result;
  } catch {
    const result = { verified: false, reason: 'Domain not found' };
    emailCache.set(email, result);
    setTimeout(() => emailCache.delete(email), 3600000);
    return result;
  }
}

let browser = null;

async function getBrowser() {
  if (browser) return browser;
  browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-all-instrumentation',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1400,900',
    ],
    defaultViewport: null,
  });
  return browser;
}

function updateTask(taskId, data) {
  const task = tasks.get(taskId);
  if (task) {
    tasks.set(taskId, { ...task, ...data });
  }
}

async function scrapeLinkedIn(jobUrl, taskId, subscriberEmail) {
  updateTask(taskId, { status: 'running', progress: 0, message: 'Launching browser...' });

  const normalizedUrl = normalizeJobUrl(jobUrl);
  updateTask(taskId, { progress: 5, message: 'Preparing LinkedIn job page...' });

  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  updateTask(taskId, { progress: 10, message: 'Opening LinkedIn job page...' });
  await page.goto(normalizedUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  let companyName = null;

  const companySelectors = [
    '.job-details-jobs-unified-top-card__company-name a',
    '.pv-top-card--line-level-left h3',
    '.top-card h2',
    'a[href*="/company/"]',
    '.job-card-container__company-name',
  ];

  for (const selector of companySelectors) {
    const el = await page.$(selector);
    if (el) {
      companyName = await page.evaluate((sel) => (document.querySelector(sel) || {}).textContent?.trim(), selector);
      if (companyName) break;
    }
  }

  if (!companyName) {
    companyName = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        if (link.href.includes('/company/')) {
          const parts = link.href.split('/');
          const idx = parts.indexOf('company');
          if (idx > -1 && parts[idx + 1]) return parts[idx + 1];
        }
      }
      return null;
    });
  }

  if (!companyName) {
    await page.close();
    updateTask(taskId, { status: 'error', error: 'Could not extract company name from the job page' });
    return;
  }

  const companySlug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const companyPeopleUrl = `https://www.linkedin.com/company/${companySlug}/people/`;

  updateTask(taskId, { progress: 20, message: `Opening company page: ${companyName}` });
  await page.goto(companyPeopleUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 3000));

  await page.evaluate(() => {
    const scrollButton = document.querySelector('button[data-view-name="people-search-result"] button');
    if (scrollButton) scrollButton.click();
  });

  updateTask(taskId, { progress: 30, message: 'Finding profile links...' });
  const profileUrls = await page.evaluate(() => {
    const urls = [];
    const links = document.querySelectorAll('a[href*="/in/"]');
    links.forEach((link) => {
      const href = link.href;
      if (href && href.includes('/in/') && !href.includes('/jobs') && !href.includes('/company')) {
        const match = href.match(/\/in\/[^\/?#]+/);
        if (match) urls.push('https://www.linkedin.com' + match[0]);
      }
    });
    return [...new Set(urls)].slice(0, 200);
  });

  const contacts = [];
  let profileCount = 0;
  const totalProfiles = profileUrls.length;

  for (const profileUrl of profileUrls) {
    try {
      profileCount++;
      updateTask(taskId, {
        progress: 30 + Math.floor((profileCount / totalProfiles) * 60),
        message: `Checking profile ${profileCount}/${totalProfiles}...`,
      });

      await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1500));

      const data = await page.evaluate(() => {
        const nameEl = document.querySelector('.text-heading-xlarge, h1, .pv-top-card--headline');
        const name = nameEl ? nameEl.textContent.trim() : null;

        // Robust role extraction - multiple strategies
        let title = null;
        
        // Strategy 1: Old selectors (legacy)
        const oldSelectors = [
          '.text-body-medium',
          '.pv-top-card--headline .text-body-small',
          '.pv-top-card--headline',
          '.pv-top-card h2',
          '.top-card-layout__headline',
          '.pv-top-card--headline',
          '[data-test-id="headline"]',
          '[data-test-id="profile-headline"]',
        ];
        
        for (const selector of oldSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            title = el.textContent.trim();
            break;
          }
        }

        // Strategy 2: Find headline by text pattern "Role at Company"
        if (!title) {
          const allText = document.body.innerText;
          const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.length < 200);
          
          // Look for "Role at Company" pattern
          const rolePattern = /\b.+\s+at\s+\w+.+/i;
          for (const line of lines) {
            if (rolePattern.test(line) && 
                /talent|recruit|hiring|manager|director|lead|head|vp|engineer|acquisition|staffing|hr|partner/i.test(line)) {
              title = line;
              break;
            }
          }
        }

        // Strategy 3: Find element containing "at " pattern near name
        if (!title) {
          const nameEl = document.querySelector('.text-heading-xlarge, h1, .pv-top-card--headline, h1[class*="headline"]');
          if (nameEl) {
            let sibling = nameEl.nextElementSibling;
            while (sibling) {
              const text = sibling.textContent?.trim();
              if (text && text.includes(' at ') && text.length < 200) {
                title = text;
                break;
              }
              sibling = sibling.nextElementSibling;
            }
          }
        }

        // Strategy 4: Broad search for role-like text
        if (!title) {
          const elements = document.querySelectorAll('p, h2, h3, span, div');
          for (const el of elements) {
            const text = el.textContent?.trim();
            if (text && text.includes(' at ') && text.length < 200 && 
                /talent|recruit|hiring|manager|director|lead|head|vp|engineer|acquisition|staffing|hr|partner/i.test(text)) {
              title = text.trim();
              break;
            }
          }
        }

        const emailEl = document.querySelector('a[href^="mailto:"]');
        const email = emailEl ? emailEl.getAttribute('href').replace('mailto:', '').trim() : null;

        return { name, title, email, profileUrl: window.location.href };
      });

      if (data.title && matchesTargetRole(data.title)) {
        contacts.push(data);
      } else if (!data.title && data.email) {
        contacts.push(data);
      }
    } catch (err) {
      console.error('Error scraping profile:', profileUrl, err.message);
    }
  }

  await page.close();

  updateTask(taskId, { progress: 90, message: `Verifying ${contacts.length} emails...` });
  const verified = await verifyEmails(contacts);

  let resultCount = verified.length;
  let verifiedCount = verified.filter((c) => c.emailVerified).length;

  let message = `Done! Found ${resultCount} contacts (${verifiedCount} verified).`;

  if (subscriberEmail) {
    message += ` Results will be emailed to ${subscriberEmail}.`;
  }

  updateTask(taskId, {
    status: 'complete',
    progress: 100,
    message,
    contacts: verified,
    count: resultCount,
    verifiedCount,
    subscribeToken: taskId,
  });
}

async function verifyEmails(contacts) {
  const results = [];
  for (const c of contacts) {
    if (!c.email) {
      results.push({ ...c, emailVerified: false });
      continue;
    }
    const verification = await verifyEmailDomain(c.email);
    results.push({ ...c, emailVerified: verification.verified });
  }
  return results;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/extract', async (req, res) => {
  const { jobUrl, email: subscriberEmail } = req.body;

  if (!jobUrl || !jobUrl.includes('linkedin.com/jobs')) {
    return res.status(400).json({ error: 'Valid LinkedIn jobs URL required' });
  }

  let token = null;
  if (subscriberEmail && subscriberEmail.includes('@')) {
    token = Buffer.from(
      `${subscriberEmail}:${Date.now().toString().slice(-6)}:${jobUrl.slice(0, 20)}`
    ).toString('base64url');
    subscriptions.set(token, { email: subscriberEmail, jobUrl, createdAt: Date.now() });
  }

  const taskId = Buffer.from(`${Date.now()}:${Math.random()}`).toString('base64url').slice(0, 16);

  tasks.set(taskId, {
    status: 'pending',
    progress: 0,
    message: 'Starting extraction...',
  });

  res.json({ taskId, token });

  const startTime = Date.now();
  const task = tasks.get(taskId);
  if (task && task.status === 'pending') {
    try {
      await scrapeLinkedIn(jobUrl, taskId, subscriberEmail);
    } catch (err) {
      console.error('Extraction error:', err);
      updateTask(taskId, { status: 'error', error: err.message || 'Extraction failed' });
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Extraction completed in ${elapsed}s`);
  }
});

app.get('/api/progress/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

app.post('/api/results/:token', async (req, res) => {
  const { token } = req.params;
  const { contacts } = req.body;
  const sub = subscriptions.get(token);

  if (!sub) return res.status(404).json({ error: 'Invalid token' });

  const html = generateResultEmail(contacts, sub.jobUrl);

  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER || 'no-reply@linkedin-hunter.com',
      to: sub.email,
      subject: 'LinkedIn Hunter — Extraction Results',
      html,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function generateResultEmail(contacts, jobUrl) {
  const rows = contacts
    .map(
      (c) => `
    <tr>
      <td style="padding:6px;border:1px solid #ddd;">${c.name || ''}</td>
      <td style="padding:6px;border:1px solid #ddd;">${c.title || ''}</td>
      <td style="padding:6px;border:1px solid #ddd;"><a href="${c.profileUrl || ''}">Profile</a></td>
      <td style="padding:6px;border:1px solid #ddd;color:${c.emailVerified ? '#0a66c2' : '#333'};font-weight:${c.emailVerified ? '700' : 'normal'};">${c.email || ''}</td>
    </tr>`
    )
    .join('');

  const verifiedCount = contacts.filter((c) => c.emailVerified).length;

  return `
    <html><body style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>LinkedIn Hunter — Extraction Results</h2>
      <p>Job URL: ${jobUrl}</p>
      <p>Found ${contacts.length} contact(s) — ${verifiedCount} with verified emails</p>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background:#0a66c2;color:#fff;">
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Name</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Title</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Profile</th>
            <th style="padding:6px;border:1px solid #ddd;text-align:left;">Email (verified=blue)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>
  `;
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});