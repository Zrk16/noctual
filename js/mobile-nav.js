(function () {
  if (window.innerWidth > 768) return;

  const page = window.location.pathname.split('/').pop() || 'index.html';
  const isAI = ['roast.html', 'hype.html', 'that-thing.html'].includes(page);

  const nav = document.createElement('nav');
  nav.className = 'mobile-nav';
  nav.setAttribute('aria-label', 'Main navigation');

  const links = [
    {
      href: 'index.html',
      label: 'Home',
      active: page === 'index.html' || page === '',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    },
    {
      href: 'planner.html',
      label: 'Planner',
      active: page === 'planner.html',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    },
    {
      href: 'finance.html',
      label: 'Finance',
      active: page === 'finance.html',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    },
    {
      href: 'habits.html',
      label: 'Habits',
      active: page === 'habits.html',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    },
  ];

  links.forEach(({ href, label, active, icon }) => {
    const a = document.createElement('a');
    a.href = href;
    a.className = 'mobile-nav__item' + (active ? ' mobile-nav__item--active' : '');
    a.innerHTML = icon + `<span>${label}</span>`;
    nav.appendChild(a);
  });

  // AI tab with popup
  const aiActive = isAI;
  const aiTab = document.createElement('button');
  aiTab.className = 'mobile-nav__item mobile-nav__item--ai' + (aiActive ? ' mobile-nav__item--active' : '');
  aiTab.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>AI</span>`;
  nav.appendChild(aiTab);

  // AI popup sheet
  const sheet = document.createElement('div');
  sheet.className = 'mobile-ai-sheet';
  sheet.innerHTML = `
    <a href="roast.html" class="mobile-ai-sheet__item${page === 'roast.html' ? ' active' : ''}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div>
        <div class="mobile-ai-sheet__name">Roast Me</div>
        <div class="mobile-ai-sheet__desc">get called out for your week</div>
      </div>
    </a>
    <a href="hype.html" class="mobile-ai-sheet__item${page === 'hype.html' ? ' active' : ''}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      <div>
        <div class="mobile-ai-sheet__name">Hype</div>
        <div class="mobile-ai-sheet__desc">get hyped up for what you're doing</div>
      </div>
    </a>
    <a href="that-thing.html" class="mobile-ai-sheet__item${page === 'that-thing.html' ? ' active' : ''}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <div>
        <div class="mobile-ai-sheet__name">That Thing</div>
        <div class="mobile-ai-sheet__desc">find something you half-remember</div>
      </div>
    </a>
  `;
  document.body.appendChild(sheet);

  let sheetOpen = false;
  aiTab.addEventListener('click', () => {
    sheetOpen = !sheetOpen;
    sheet.classList.toggle('is-open', sheetOpen);
  });

  document.addEventListener('click', (e) => {
    if (sheetOpen && !sheet.contains(e.target) && e.target !== aiTab) {
      sheetOpen = false;
      sheet.classList.remove('is-open');
    }
  });

  document.body.appendChild(nav);
})();
