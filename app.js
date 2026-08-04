const BACKEND_URL = 'http://localhost:3000'; 
const startBtn = document.getElementById('startBtn');
const jobUrlInput = document.getElementById('jobUrl');
const statusEl = document.getElementById('status');
const resultsCard = document.getElementById('resultsCard');
const resultsList = document.getElementById('resultsList');
const resultCount = document.getElementById('resultCount');
const copyEmailsBtn = document.getElementById('copyEmailsBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const sendResultsBtn = document.getElementById('sendResultsBtn');
const showVerifiedChk = document.getElementById('showVerified');
const enableSubscribeChk = document.getElementById('enableSubscribe');
const subscribeGroup = document.getElementById('subscribeGroup');
const subscribeEmail = document.getElementById('subscribeEmail');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressTime = document.getElementById('progressTime');

let filteredContacts = [];
let subscribeToken = null;
let taskId = null;
let startTime = null;
let pollInterval = null;

startBtn.addEventListener('click', handleStart);
copyEmailsBtn.addEventListener('click', handleCopyEmails);
exportCsvBtn.addEventListener('click', handleExportCsv);
sendResultsBtn.addEventListener('click', handleSendResults);
showVerifiedChk.addEventListener('change', handleFilterChange);
enableSubscribeChk.addEventListener('change', handleSubscribeToggle);

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = 'status ' + type;
  statusEl.classList.remove('hidden');
}

function hideStatus() {
  statusEl.classList.add('hidden');
}

function setProgress(percent, text, eta) {
  progressContainer.classList.remove('hidden');
  progressFill.style.width = percent + '%';
  progressText.textContent = text;
  if (eta !== undefined) {
    progressTime.textContent = eta + ' remaining';
  }
}

function hideProgress() {
  progressContainer.classList.add('hidden');
  progressFill.style.width = '0%';
  progressText.textContent = '';
  progressTime.textContent = '';
}

function handleSubscribeToggle() {
  if (enableSubscribeChk.checked) {
    subscribeGroup.classList.remove('hidden');
  } else {
    subscribeGroup.classList.add('hidden');
  }
}

function formatTime(seconds) {
  if (seconds < 60) return seconds + 's';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + 'm ' + s + 's';
}

async function handleStart() {
  const url = jobUrlInput.value.trim();
  if (!url) {
    showStatus('Please enter a LinkedIn job URL', 'error');
    return;
  }
  if (!url.includes('linkedin.com/jobs')) {
    showStatus('Please enter a valid LinkedIn jobs URL', 'error');
    return;
  }

  const subscribe = enableSubscribeChk.checked;
  const email = subscribe ? subscribeEmail.value.trim() : null;

  if (subscribe && (!email || !email.includes('@'))) {
    showStatus('Please enter a valid email for subscription', 'error');
    return;
  }

  hideStatus();
  resultsCard.classList.add('hidden');
  startBtn.disabled = true;
  startBtn.textContent = 'Starting extraction...';
  setProgress(0, 'Submitting request...', '');

  try {
    const resp = await fetch(BACKEND_URL + '/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobUrl: url, email }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      showStatus(data.error || 'Extraction failed', 'error');
      resetUi();
      return;
    }

    taskId = data.taskId;
    subscribeToken = data.token;
    startTime = Date.now();

    startPolling();

  } catch (err) {
    console.error('Fetch error:', err);
    showStatus(
      'Error: Could not connect to backend at ' + BACKEND_URL +
      '. Make sure the backend is running and accessible.',
      'error'
    );
    resetUi();
  }
}

function startPolling() {
  progressText.textContent = 'Queued...';
  progressTime.textContent = '';

  pollInterval = setInterval(async () => {
    try {
      const resp = await fetch(BACKEND_URL + '/api/progress/' + taskId);
      const task = await resp.json();

      if (task.status === 'complete') {
        clearInterval(pollInterval);
        handleComplete(task);
      } else if (task.status === 'error') {
        clearInterval(pollInterval);
        showStatus(task.error || 'Extraction failed', 'error');
        resetUi();
      } else {
        const elapsed = (Date.now() - startTime) / 1000;
        const eta = task.progress > 0 ? formatTime((elapsed / task.progress) * (100 - task.progress)) : 'Calculating...';
        setProgress(task.progress, task.message || 'Working...', eta);
      }
    } catch (err) {
      clearInterval(pollInterval);
      showStatus('Polling error: ' + err.message, 'error');
    }
  }, 2000);
}

function handleComplete(task) {
  hideProgress();
  filteredContacts = task.contacts || [];
  subscribeToken = task.subscribeToken || subscribeToken;

  if (filteredContacts.length === 0) {
    showStatus('No contacts found matching the target roles', 'info');
  } else {
    const verifiedCount = filteredContacts.filter((c) => c.emailVerified).length;
    showStatus(
      'Done! Found ' + filteredContacts.length + ' contacts (' +
        verifiedCount + ' with verified emails)',
      'success'
    );
    renderResults(filteredContacts);
    if (subscribeToken) {
      sendResultsBtn.classList.remove('hidden');
    }
  }

  startBtn.disabled = false;
  startBtn.textContent = 'Start Extraction';
}

function resetUi() {
  startBtn.disabled = false;
  startBtn.textContent = 'Start Extraction';
  hideProgress();
}

function handleFilterChange() {
  renderResults(filteredContacts);
}

async function handleSendResults() {
  if (!subscribeToken) return;

  sendResultsBtn.disabled = true;
  sendResultsBtn.textContent = 'Sending...';

  try {
    const resp = await fetch(BACKEND_URL + '/api/results/' + subscribeToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: filteredContacts }),
    });

    const data = await resp.json();
    if (resp.ok) {
      showStatus('Results emailed to you!', 'success');
    } else {
      showStatus('Failed to send: ' + data.error, 'error');
    }
  } catch (err) {
    showStatus('Error sending results: ' + err.message, 'error');
  } finally {
    sendResultsBtn.disabled = false;
    sendResultsBtn.textContent = 'Send Results to My Email';
  }
}

function handleCopyEmails() {
  const emails = filteredContacts.filter((c) => c.email).map((c) => c.email);
  if (emails.length === 0) {
    showStatus('No emails to copy', 'info');
    return;
  }
  navigator.clipboard.writeText(emails.join('\n')).then(() => {
    showStatus('Copied ' + emails.length + ' email(s) to clipboard', 'success');
  });
}

function handleExportCsv() {
  if (filteredContacts.length === 0) {
    showStatus('No data to export', 'info');
    return;
  }

  const headers = ['Name', 'Title', 'Profile URL', 'Email', 'Verified'];
  const rows = filteredContacts.map((c) => [
    c.name || '',
    c.title || '',
    c.profileUrl || '',
    c.email || '',
    c.emailVerified ? 'Yes' : 'No',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'linkedin-recruiters.csv';
  a.click();
  URL.revokeObjectURL(url);

  showStatus('CSV exported!', 'success');
}

function renderResults(contacts) {
  resultsCard.classList.remove('hidden');
  resultsList.innerHTML = '';
  resultCount.textContent = contacts.length + ' contact(s) found';

  const showVerifiedOnly = showVerifiedChk.checked;
  const displayContacts = showVerifiedOnly
    ? contacts.filter((c) => c.emailVerified)
    : contacts;

  if (displayContacts.length === 0) {
    resultsList.innerHTML =
      '<p style="font-size:13px;color:#666;">No contacts match the current filters.</p>';
    return;
  }

  displayContacts.forEach((c) => {
    const item = document.createElement('div');
    item.className = 'result-item';

    const nameRow = document.createElement('div');
    nameRow.className = 'name';
    nameRow.textContent = c.name || 'Unknown';
    if (c.emailVerified) {
      const badge = document.createElement('span');
      badge.className = 'verified-badge';
      badge.textContent = '✓ Verified';
      nameRow.appendChild(badge);
    }
    item.appendChild(nameRow);

    if (c.title) {
      const title = document.createElement('div');
      title.className = 'role';
      title.textContent = c.title;
      item.appendChild(title);
    }

    if (c.profileUrl) {
      const profileUrl = document.createElement('div');
      profileUrl.className = 'profile-url';
      profileUrl.textContent = c.profileUrl;
      item.appendChild(profileUrl);
    }

    const email = document.createElement('div');
    if (c.email) {
      email.className = 'email ' + (c.emailVerified ? 'verified' : '');
      email.textContent = c.email;
    } else {
      email.className = 'no-email';
      email.textContent = 'No email found';
    }
    item.appendChild(email);

    resultsList.appendChild(item);
  });
}