const startBtn = document.getElementById('startBtn');
const jobUrlInput = document.getElementById('jobUrl');
const statusEl = document.getElementById('status');
const progressCard = document.getElementById('progressCard');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsCard = document.getElementById('resultsCard');
const resultsList = document.getElementById('resultsList');
const resultCount = document.getElementById('resultCount');
const copyAllBtn = document.getElementById('copyAllBtn');
const clearResultsBtn = document.getElementById('clearResultsBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const bookmarkletBtn = document.getElementById('bookmarkletBtn');
const bookmarkletCode = document.getElementById('bookmarkletCode');

let collectedContacts = [];
let currentJobUrl = '';

startBtn.addEventListener('click', handleStart);
jobUrlInput.addEventListener('keydown', handleInputKeydown);
copyAllBtn.addEventListener('click', handleCopyAll);
clearResultsBtn.addEventListener('click', handleClearResults);
exportCsvBtn.addEventListener('click', handleExportCsv);
bookmarkletBtn.addEventListener('click', handleBookmarklet);

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = 'status ' + type;
  statusEl.classList.remove('hidden');
}

function hideStatus() {
  statusEl.classList.add('hidden');
}

function setProgress(percent, text) {
  progressCard.classList.remove('hidden');
  progressFill.style.width = percent + '%';
  progressText.textContent = text;
}

function hideProgress() {
  progressCard.classList.add('hidden');
  progressFill.style.width = '0%';
}

function showResults() {
  resultsCard.classList.remove('hidden');
  resultsList.innerHTML = '';
  resultCount.textContent = collectedContacts.length + ' contact(s) found';

  if (collectedContacts.length === 0) {
    resultsList.innerHTML = '<p style="font-size:13px;color:#666;">No contacts found.</p>';
    return;
  }

  collectedContacts.forEach((c) => {
    const item = document.createElement('div');
    item.className = 'result-item';

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = c.name || 'Unknown';

    const role = document.createElement('div');
    role.className = 'role';
    role.textContent = c.role || '';

    const email = document.createElement('div');
    email.className = c.email ? 'email' : 'no-email';
    email.textContent = c.email || 'No email found';

    item.appendChild(name);
    item.appendChild(role);
    item.appendChild(email);
    resultsList.appendChild(item);
  });
}

function handleInputKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleStart();
  }
}

function handleStart() {
  const url = jobUrlInput.value.trim();
  if (!url) {
    showStatus('Please enter a LinkedIn job URL', 'error');
    return;
  }

  if (!url.includes('linkedin.com/jobs')) {
    showStatus('Please enter a valid LinkedIn jobs URL', 'error');
    return;
  }

  hideStatus();
  resultsCard.classList.add('hidden');
  startBtn.disabled = true;
  startBtn.textContent = 'Extracting...';
  setProgress(0, 'Starting...');
  currentJobUrl = url;

  const companyName = extractCompanyNameFromUrl(url);

  if (companyName) {
    setProgress(30, 'Company found: ' + companyName);
    showStatus('Company identified: ' + companyName, 'info');
    generateBookmarklet(companyName);
    setProgress(60, 'Bookmarklet ready — go to LinkedIn and click it');
  } else {
    setProgress(20, 'Navigate to the job page first, then use the bookmarklet');
    showStatus('Paste the URL above, then use the bookmarklet on the LinkedIn page', 'info');
    generateBookmarklet(null);
  }

  startBtn.disabled = false;
  startBtn.textContent = 'Start Extraction';
  hideProgress();
}

function extractCompanyNameFromUrl(jobUrl) {
  try {
    const url = new URL(jobUrl);
    const parts = url.pathname.split('/').filter(Boolean);

    const companyIdx = parts.indexOf('company');
    if (companyIdx > 0) return parts[companyIdx + 1];

    const viewIdx = parts.indexOf('jobs');
    if (viewIdx > 0 && parts[viewIdx + 1] === 'view') return parts[viewIdx - 1];

    return null;
  } catch {
    return null;
  }
}

function generateBookmarklet(companyName) {
  const code = `javascript:(function(){
    var data = {url: window.location.href, title: document.title, company: '${companyName || ''}'};
    var companyEl = document.querySelector('.job-card-container__company-name, .company-name, a[href*="/company/"], .top-card__company-name');
    if (companyEl) data.company = companyEl.textContent.trim();
    var profiles = [];
    document.querySelectorAll('a[href*="/in/"]').forEach(function(a) {
      var href = a.href;
      if (href.includes('/in/') && !href.includes('/jobs') && !href.includes('/company')) {
        var m = href.match(/\\/in\\/[^\\/?#]+/);
        if (m) profiles.push('https://www.linkedin.com' + m[0]);
      }
    });
    data.profiles = profiles;
    var emailEls = document.querySelectorAll('a[href^="mailto:"]');
    var emails = [];
    emailEls.forEach(function(el) { emails.push(el.getAttribute('href').replace('mailto:','')); });
    data.emails = emails;
    var hash = encodeURIComponent(JSON.stringify(data));
    window.open('https://linkedin-hunter.vercel.app/#' + hash, '_blank');
  })();`;

  bookmarkletCode.classList.remove('hidden');
  bookmarkletCode.innerHTML = '<span class="label">Drag to bookmarks bar:</span><br>' + code;
}

function handleBookmarklet() {
  const code = `javascript:(function(){var data={url:window.location.href,title:document.title,company:''};var companyEl=document.querySelector('.job-card-container__company-name,.company-name,a[href*="/company/"],.top-card__company-name');if(companyEl)data.company=companyEl.textContent.trim();var profiles=[];document.querySelectorAll('a[href*="/in/"]').forEach(function(a){var href=a.href;if(href.includes('/in/')&&!href.includes('/jobs')&&!href.includes('/company')){var m=href.match(/\\/in\\/[^\\/?#]+/);if(m)profiles.push('https://www.linkedin.com'+m[0]);}});data.profiles=profiles;var emailEls=document.querySelectorAll('a[href^="mailto:"]');var emails=[];emailEls.forEach(function(el){emails.push(el.getAttribute('href').replace('mailto:''));});data.emails=emails;var hash=encodeURIComponent(JSON.stringify(data));window.open('https://linkedin-hunter.vercel.app/#'+hash,'_blank');})();`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => {
      showStatus('Bookmarklet code copied! Paste it as a new bookmark.', 'success');
    });
  } else {
    bookmarkletCode.classList.remove('hidden');
    bookmarkletCode.innerHTML = '<span class="label">Copy this code:</span><br><code>' + code + '</code>';
  }
}

function handleClearResults() {
  collectedContacts = [];
  resultsCard.classList.add('hidden');
  resultsList.innerHTML = '';
  resultCount.textContent = '';
  showStatus('Results cleared.', 'info');
}

function handleCopyAll() {
  const emails = collectedContacts.filter(c => c.email).map(c => c.email);
  if (emails.length === 0) {
    showStatus('No emails to copy', 'info');
    return;
  }
  navigator.clipboard.writeText(emails.join('\n')).then(() => {
    showStatus('Copied ' + emails.length + ' email(s) to clipboard', 'success');
  });
}

function handleExportCsv() {
  if (collectedContacts.length === 0) {
    showStatus('No data to export', 'info');
    return;
  }

  const headers = ['Name', 'Role', 'Email', 'Profile URL'];
  const rows = collectedContacts.map(c => [
    c.name || '',
    c.role || '',
    c.email || '',
    c.profileUrl || ''
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(v => '"' + v.replace(/"/g, '""') + '"').join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'linkedin-contacts.csv';
  a.click();
  URL.revokeObjectURL(url);

  showStatus('CSV exported!', 'success');
}

function loadFromHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  try {
    const data = JSON.parse(decodeURIComponent(hash));
    processExtractedData(data);
    window.location.hash = '';
  } catch (e) {
    console.error('Failed to parse hash data:', e);
  }
}

function addContact(contact) {
  const email = (contact.email || '').trim().toLowerCase();
  const hasDuplicate = collectedContacts.some((item) => {
    const itemEmail = (item.email || '').trim().toLowerCase();
    return email && itemEmail && email === itemEmail;
  });

  if (!hasDuplicate) {
    collectedContacts.push(contact);
  }
}

function processExtractedData(data) {
  hideStatus();

  if (data.company) {
    setProgress(30, 'Company: ' + data.company);
  }

  if (data.profiles && data.profiles.length > 0) {
    setProgress(60, 'Found ' + data.profiles.length + ' profile(s)');
  }

  if (data.emails && data.emails.length > 0) {
    setProgress(90, 'Found ' + data.emails.length + ' email(s)');
  }

  const nameEl = document.querySelector('.text-heading-xlarge, h1');
  const name = nameEl ? nameEl.textContent.trim() : '';

  const roleEl = document.querySelector('.text-body-medium, .pv-top-card--headline');
  const role = roleEl ? roleEl.textContent.trim() : '';

  if (data.emails && data.emails.length > 0) {
    data.emails.forEach(email => {
      addContact({
        name: name || 'Unknown',
        role: role || '',
        email: email,
        profileUrl: data.url || ''
      });
    });
  } else {
    addContact({
      name: name || 'Unknown',
      role: role || '',
      email: null,
      profileUrl: data.url || ''
    });
  }

  setProgress(100, 'Done!');
  showResults();
  showStatus('Data extracted successfully!', 'success');
}

window.addEventListener('load', loadFromHash);