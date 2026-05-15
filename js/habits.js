/* habits.js — Nocual Habits page */

(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const listEl      = document.getElementById('habit-list');
  const emptyEl     = document.getElementById('habits-empty');
  const progressEl  = document.getElementById('habits-progress');
  const formEl      = document.getElementById('add-habit-form');
  const inputEl     = document.getElementById('habit-input');
  const sidebarDate = document.getElementById('sidebar-date');

  // ── Sidebar date ──────────────────────────────────────────────────────────
  function setSidebarDate() {
    if (!sidebarDate) return;
    const now = new Date();
    sidebarDate.textContent = now.toLocaleDateString('en-US', {
      weekday: 'short',
      month:   'short',
      day:     'numeric',
    });
  }

  // ── Feature 9: Skeleton loaders ───────────────────────────────────────────
  function showSkeletons() {
    listEl.innerHTML = Array(3).fill('<li class="habit-skeleton"></li>').join('');
  }

  // ── Feature 4: Heatmap ────────────────────────────────────────────────────
  function renderHeatmap() {
    const heatmapEl = document.getElementById('habit-heatmap');
    if (!heatmapEl) return;

    const logs = JSON.parse(localStorage.getItem('nocual_habit_logs') || '{}');
    const today = new Date();
    heatmapEl.innerHTML = '';

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = (logs[key] || []).length;

      const sq = document.createElement('div');
      sq.className = 'habit-heatmap__square';
      sq.title = `${key}: ${count} habit${count !== 1 ? 's' : ''} done`;

      if (count === 0) {
        sq.style.background = 'var(--surface-2)';
      } else if (count <= 2) {
        sq.style.background = 'rgba(200,144,58,0.3)';
      } else if (count <= 4) {
        sq.style.background = 'rgba(200,144,58,0.6)';
      } else {
        sq.style.background = 'var(--ai-accent)';
      }

      heatmapEl.appendChild(sq);
    }
  }

  // ── Feature 6: Confetti ───────────────────────────────────────────────────
  function launchConfetti() {
    const colors = ['#C8903A', '#F2F0EB', '#e05252', '#4CAF50', '#2196F3'];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-delay: ${Math.random() * 0.3}s;
        animation-duration: ${0.8 + Math.random() * 0.4}s;
      `;
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }
    try {
      navigator.vibrate && navigator.vibrate([50, 30, 50, 30, 100]);
    } catch {}
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function renderHabits() {
    const habits = Store.habits.getAll();
    listEl.innerHTML = '';

    const doneCount  = habits.filter(h => Store.habits.isDoneToday(h.id)).length;
    const totalCount = habits.length;

    // Header progress
    progressEl.textContent = `${doneCount} / ${totalCount} done today`;

    // Empty state
    if (totalCount === 0) {
      emptyEl.hidden = false;
      renderHeatmap();
      return;
    }
    emptyEl.hidden = true;

    habits.forEach(habit => {
      const isDone   = Store.habits.isDoneToday(habit.id);
      const streak   = Store.habits.getStreak(habit.id);
      const itemEl   = buildHabitItem(habit, isDone, streak);
      listEl.appendChild(itemEl);
    });

    renderHeatmap();
  }

  function buildHabitItem(habit, isDone, streak) {
    const li = document.createElement('li');
    li.className = 'habit-item' + (isDone ? ' habit-item--done' : '');
    li.dataset.id = habit.id;

    // ── Feature 5: Swipe-to-delete wrapper ───────────────────────────────
    const deleteBg = document.createElement('div');
    deleteBg.className = 'habit-item__delete-bg';
    deleteBg.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
      </svg>`;

    const content = document.createElement('div');
    content.className = 'habit-item__content';

    // Checkbox button
    const checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = 'habit-item__check';
    checkBtn.setAttribute('aria-label', isDone ? 'Mark incomplete' : 'Mark complete');
    checkBtn.setAttribute('aria-pressed', String(isDone));

    if (isDone) {
      checkBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>`;
    }

    checkBtn.addEventListener('click', () => {
      // Feature 7: Haptic on check
      try {
        navigator.vibrate && navigator.vibrate([10, 30, 10]);
      } catch {}

      Store.habits.toggleToday(habit.id);

      // Feature 6: Check all done after toggle
      const habits = Store.habits.getAll();
      if (habits.length > 0) {
        const allDone = habits.every(h => Store.habits.isDoneToday(h.id));
        if (allDone) launchConfetti();
      }

      renderHabits();
    });

    // Name
    const nameEl = document.createElement('span');
    nameEl.className = 'habit-item__name';
    nameEl.textContent = habit.name;

    // Streak badge
    const streakEl = document.createElement('span');
    streakEl.className = 'habit-item__streak';
    streakEl.textContent = streak > 0 ? `🔥 ${streak} days` : '';
    streakEl.setAttribute('aria-label', streak > 0 ? `${streak} day streak` : '');

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'habit-item__delete';
    deleteBtn.setAttribute('aria-label', `Delete ${habit.name}`);
    deleteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>`;

    deleteBtn.addEventListener('click', () => {
      const item = listEl.querySelector(`[data-id="${habit.id}"]`);
      if (item) {
        item.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
        item.style.opacity    = '0';
        item.style.transform  = 'translateX(8px)';
        setTimeout(() => {
          Store.habits.delete(habit.id);
          renderHabits();
        }, 180);
      } else {
        Store.habits.delete(habit.id);
        renderHabits();
      }
    });

    content.appendChild(checkBtn);
    content.appendChild(nameEl);
    content.appendChild(streakEl);
    content.appendChild(deleteBtn);

    li.appendChild(deleteBg);
    li.appendChild(content);

    // ── Feature 5: Touch swipe-to-delete ─────────────────────────────────
    let touchStartX = 0;
    let currentX = 0;
    let isSwiping = false;

    content.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      isSwiping = false;
      content.style.transition = 'none';
    }, { passive: true });

    content.addEventListener('touchmove', (e) => {
      const dx = e.touches[0].clientX - touchStartX;
      if (dx >= 0) return; // only swipe left
      isSwiping = true;
      currentX = Math.max(dx, -80);
      content.style.transform = `translateX(${currentX}px)`;
    }, { passive: true });

    content.addEventListener('touchend', () => {
      content.style.transition = 'transform 180ms ease';
      if (isSwiping && currentX <= -60) {
        content.style.transform = 'translateX(-80px)';
        setTimeout(() => {
          Store.habits.delete(habit.id);
          renderHabits();
        }, 150);
      } else {
        content.style.transform = 'translateX(0)';
      }
      currentX = 0;
      isSwiping = false;
    });

    return li;
  }

  // ── Add habit form ─────────────────────────────────────────────────────────
  formEl.addEventListener('submit', e => {
    e.preventDefault();
    const name = inputEl.value.trim();
    if (!name) return;
    Store.habits.add(name);
    inputEl.value = '';
    renderHabits();
    inputEl.focus();
  });

  // ── Cross-page store updates ───────────────────────────────────────────────
  window.addEventListener('nocual:update', () => {
    renderHabits();
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  setSidebarDate();

  // Feature 9: Show skeletons first, then real render after 250ms
  showSkeletons();
  setTimeout(() => {
    renderHabits();
  }, 250);

  const revealEl = document.querySelector('.reveal');
  if (revealEl) {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.disconnect(); }
    }, { threshold: 0.05 });
    obs.observe(revealEl);
  }

})();
