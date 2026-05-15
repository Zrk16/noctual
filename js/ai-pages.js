/* ─── ai-pages.js — shared logic for roast, hype, that-thing ─────────────── */

/* ── Sidebar date ──────────────────────────────────────────────────────────── */
const initSidebarDate = () => {
  const el = document.getElementById('sidebar-date');
  if (!el) return;
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'short' });
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  el.textContent = `${day}, ${date}`;
};

/* ── Reveal on scroll ──────────────────────────────────────────────────────── */
const initReveals = () => {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  reveals.forEach(el => observer.observe(el));
};

/* ── Week label helper ─────────────────────────────────────────────────────── */
const getCurrentWeekLabel = () => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)}–${fmt(sunday)}`;
};

/* ── Roast page ────────────────────────────────────────────────────────────── */
const initRoastPage = () => {
  const btn = document.getElementById('roast-btn');
  const outputSection = document.getElementById('roast-output');
  const outputWeek = document.getElementById('roast-output-week');
  const outputText = document.getElementById('roast-output-text');
  const archiveList = document.getElementById('roast-archive-list');
  const archiveEmpty = document.getElementById('roast-archive-empty');

  if (!btn) return;

  const renderArchive = () => {
    const roasts = Store.roasts.getAll();
    if (roasts.length === 0) {
      archiveEmpty.style.display = 'block';
      return;
    }
    archiveEmpty.style.display = 'none';

    // Remove old items but keep the empty state el
    archiveList.querySelectorAll('.roast-archive-item').forEach(el => el.remove());

    roasts.forEach(roast => {
      const item = document.createElement('div');
      item.className = 'roast-archive-item';
      item.innerHTML = `
        <div class="roast-archive-item__week">${roast.weekLabel ?? ''}</div>
        <div class="roast-archive-item__text">${roast.text}</div>
      `;
      archiveList.appendChild(item);
    });
  };

  // Initial archive render
  renderArchive();

  btn.addEventListener('click', async () => {
    if (btn.disabled) return;

    btn.disabled = true;
    btn.textContent = 'asking noc...';

    try {
      const roastText = await Assistant.generateRoast();
      const weekLabel = getCurrentWeekLabel();

      // Show output section
      outputWeek.textContent = weekLabel;
      outputText.textContent = roastText;
      outputSection.style.display = 'block';
      outputSection.classList.add('visible');

      // Smooth scroll to output
      outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Save to store
      Store.roasts.add(roastText, weekLabel);

      // Re-render archive
      renderArchive();
    } catch (err) {
      outputWeek.textContent = getCurrentWeekLabel();
      outputText.textContent = `couldn't roast you: ${err.message}`;
      outputSection.style.display = 'block';
      outputSection.classList.add('visible');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `Roast me<span class="roast-btn__hint">your week, unfiltered</span>`;
    }
  });
};

/* ── Hype page ─────────────────────────────────────────────────────────────── */
const initHypePage = () => {
  const btn = document.getElementById('hype-btn');
  const textarea = document.getElementById('hype-input');
  const outputSection = document.getElementById('hype-output');
  const outputText = document.getElementById('hype-output-text');

  if (!btn || !textarea) return;

  const doHype = async () => {
    const task = textarea.value.trim();
    if (!task) {
      textarea.focus();
      textarea.style.borderColor = 'var(--ai-border)';
      setTimeout(() => { textarea.style.borderColor = ''; }, 1200);
      return;
    }

    btn.disabled = true;
    btn.textContent = 'loading...';

    try {
      const hypeText = await Assistant.generateHype(task);

      outputText.textContent = hypeText;
      outputSection.style.display = 'block';

      // Trigger animation by forcing a reflow then adding class
      outputSection.classList.remove('visible');
      void outputSection.offsetWidth;
      outputSection.classList.add('visible');

      outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      outputText.textContent = `something broke: ${err.message}`;
      outputSection.style.display = 'block';
      outputSection.classList.add('visible');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Hype me up';
    }
  };

  btn.addEventListener('click', doHype);

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.metaKey) doHype();
  });
};

/* ── That Thing page ───────────────────────────────────────────────────────── */
const initThatThingPage = () => {
  const input = document.getElementById('that-thing-input');
  const btn = document.getElementById('that-thing-btn');
  const results = document.getElementById('that-thing-results');
  const resultType = document.getElementById('that-thing-result-type');
  const resultText = document.getElementById('that-thing-result-text');
  const resultSource = document.getElementById('that-thing-result-source');

  if (!btn || !input) return;

  const doSearch = async () => {
    const query = input.value.trim();
    if (!query) {
      input.focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = 'searching...';

    try {
      const result = await Assistant.findThatThing(query);

      resultType.textContent = result.type;
      resultText.textContent = result.text;
      resultSource.textContent = result.source ? `from ${result.source}` : '';

      results.style.display = 'block';

      // Animate in
      const card = document.getElementById('that-thing-result-card');
      card.classList.remove('visible');
      void card.offsetWidth;
      card.classList.add('visible');

      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      resultType.textContent = 'error';
      resultText.textContent = `couldn't search: ${err.message}`;
      resultSource.textContent = '';
      results.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Find it';
    }
  };

  btn.addEventListener('click', doSearch);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
};

/* ── Page detection & init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSidebarDate();
  initReveals();
  Assistant.init();

  const page = document.body.dataset.page;

  if (page === 'roast') initRoastPage();
  if (page === 'hype') initHypePage();
  if (page === 'that-thing') initThatThingPage();
});
