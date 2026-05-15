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
      return;
    }
    emptyEl.hidden = true;

    habits.forEach(habit => {
      const isDone   = Store.habits.isDoneToday(habit.id);
      const streak   = Store.habits.getStreak(habit.id);
      const itemEl   = buildHabitItem(habit, isDone, streak);
      listEl.appendChild(itemEl);
    });
  }

  function buildHabitItem(habit, isDone, streak) {
    const li = document.createElement('li');
    li.className = 'habit-item' + (isDone ? ' habit-item--done' : '');
    li.dataset.id = habit.id;

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
      Store.habits.toggleToday(habit.id);
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

    li.appendChild(checkBtn);
    li.appendChild(nameEl);
    li.appendChild(streakEl);
    li.appendChild(deleteBtn);

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
  renderHabits();

  const revealEl = document.querySelector('.reveal');
  if (revealEl) {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.disconnect(); }
    }, { threshold: 0.05 });
    obs.observe(revealEl);
  }

})();
