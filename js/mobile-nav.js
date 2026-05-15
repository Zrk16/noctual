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
    {
      href: 'roast.html',
      label: 'AI',
      active: isAI,
      ai: true,
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    },
  ];

  links.forEach(({ href, label, active, ai, icon }) => {
    const a = document.createElement('a');
    a.href = href;
    a.className = 'mobile-nav__item' +
      (ai ? ' mobile-nav__item--ai' : '') +
      (active ? ' mobile-nav__item--active' : '');
    a.innerHTML = icon + `<span>${label}</span>`;
    nav.appendChild(a);
  });

  document.body.appendChild(nav);
})();
