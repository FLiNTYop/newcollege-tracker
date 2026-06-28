// dashboard.js — small client-side behaviors, no framework needed

const scanBtn = document.getElementById('scanBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModal = document.getElementById('closeModal');
const saveTopic = document.getElementById('saveTopic');
const topicInput = document.getElementById('topicInput');
const topicStatus = document.getElementById('topicStatus');

scanBtn?.addEventListener('click', async () => {
  scanBtn.textContent = 'Scanning…';
  scanBtn.disabled = true;
  try {
    await fetch('/api/scan-now', { method: 'POST' });
    location.reload();
  } catch (e) {
    scanBtn.textContent = 'Scan now';
    scanBtn.disabled = false;
    alert('Scan failed. Check server logs.');
  }
});

settingsBtn?.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeModal?.addEventListener('click', () => settingsModal.classList.add('hidden'));

saveTopic?.addEventListener('click', async () => {
  const topic = topicInput.value.trim();
  const res = await fetch('/api/settings/ntfy-topic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });
  const data = await res.json();
  topicStatus.textContent = data.ok ? 'Saved.' : (data.error || 'Failed to save.');
});

document.querySelectorAll('.btn-done').forEach(btn => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    const card = document.querySelector(`.task-card[data-id="${id}"]`);
    await fetch(`/api/tasks/${id}/complete`, { method: 'POST' });
    card.classList.add('fading');
    setTimeout(() => card.remove(), 300);
  });
});
