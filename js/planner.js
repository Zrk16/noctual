/**
 * planner.js — Nocual Planner page
 * Depends on: store.js, config.js
 */

(function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────────────

  const state = {
    viewYear: null,
    viewMonth: null,   // 0-indexed
    selectedDate: null // "YYYY-MM-DD"
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function toDateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function todayKey() {
    const d = new Date();
    return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function parseKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatSidebarDate(d) {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatTime(time24) {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ─── Sidebar date ─────────────────────────────────────────────────────────────

  function initSidebarDate() {
    const el = document.getElementById('sidebar-date');
    if (!el) return;
    el.textContent = formatSidebarDate(new Date());
  }

  // ─── Calendar ────────────────────────────────────────────────────────────────

  function renderCalendar() {
    const { viewYear, viewMonth, selectedDate } = state;
    const grid = document.getElementById('cal-grid');
    const monthYearEl = document.getElementById('cal-month-year');
    if (!grid || !monthYearEl) return;

    monthYearEl.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

    // First day of month (adjust so week starts Monday)
    const firstDay = new Date(viewYear, viewMonth, 1);
    // getDay(): 0=Sun,1=Mon...6=Sat. We want Mon=0, so shift:
    let startOffset = (firstDay.getDay() + 6) % 7;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    grid.innerHTML = '';

    const today = todayKey();

    for (let i = 0; i < 42; i++) {
      const btn = document.createElement('button');
      btn.className = 'cal__day';
      btn.type = 'button';

      let dayNum, dateKey, isOtherMonth = false;

      if (i < startOffset) {
        // Prev month overflow
        dayNum = daysInPrevMonth - startOffset + i + 1;
        const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
        const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
        dateKey = toDateKey(prevYear, prevMonth, dayNum);
        isOtherMonth = true;
      } else if (i >= startOffset + daysInMonth) {
        // Next month overflow
        dayNum = i - startOffset - daysInMonth + 1;
        const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        dateKey = toDateKey(nextYear, nextMonth, dayNum);
        isOtherMonth = true;
      } else {
        dayNum = i - startOffset + 1;
        dateKey = toDateKey(viewYear, viewMonth, dayNum);
      }

      btn.textContent = dayNum;
      btn.dataset.date = dateKey;

      if (isOtherMonth) btn.classList.add('cal__day--other-month');
      if (dateKey === today) btn.classList.add('cal__day--today');
      if (dateKey === selectedDate) btn.classList.add('cal__day--selected');

      // Check for events
      if (
        typeof Store !== 'undefined' &&
        Store.schedule &&
        Store.schedule.getDay
      ) {
        const blocks = Store.schedule.getDay(dateKey);
        if (blocks && blocks.length > 0) {
          btn.classList.add('cal__day--has-events');
        }
      }

      btn.addEventListener('click', () => selectDate(dateKey));
      grid.appendChild(btn);
    }
  }

  function selectDate(dateKey) {
    state.selectedDate = dateKey;
    renderCalendar();
    renderDayView();
  }

  // ─── Day view ─────────────────────────────────────────────────────────────────

  function renderDayView() {
    const { selectedDate } = state;
    if (!selectedDate) return;

    const d = parseKey(selectedDate);
    const dayNumEl = document.getElementById('day-num');
    const dayNameEl = document.getElementById('day-name');
    const dayFullDateEl = document.getElementById('day-full-date');

    if (dayNumEl) dayNumEl.textContent = d.getDate();
    if (dayNameEl) dayNameEl.textContent = DAY_NAMES[d.getDay()];
    if (dayFullDateEl) {
      dayFullDateEl.textContent = d.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
    }

    renderSchedule();
  }

  function renderSchedule() {
    const { selectedDate } = state;
    const list = document.getElementById('schedule-list');
    if (!list) return;

    let blocks = [];
    if (typeof Store !== 'undefined' && Store.schedule && Store.schedule.getDay) {
      blocks = Store.schedule.getDay(selectedDate) || [];
    }

    // Sort by time
    blocks = [...blocks].sort((a, b) => {
      if (a.time < b.time) return -1;
      if (a.time > b.time) return 1;
      return 0;
    });

    list.innerHTML = '';

    if (blocks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'schedule__empty';
      empty.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Nothing scheduled. Add a block above.</span>
      `;
      list.appendChild(empty);
      return;
    }

    blocks.forEach((block, index) => {
      const item = document.createElement('div');
      item.className = 'schedule__block';
      item.style.animationDelay = `${index * 40}ms`;

      item.innerHTML = `
        <div class="schedule__block-time">${formatTime(block.time)}</div>
        <div class="schedule__block-text">${escapeHtml(block.text)}</div>
        <button class="schedule__block-delete" aria-label="Delete block" data-id="${block.id}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;

      item.querySelector('.schedule__block-delete').addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (typeof Store !== 'undefined' && Store.schedule && Store.schedule.deleteBlock) {
          Store.schedule.deleteBlock(selectedDate, id);
        }
        renderSchedule();
        renderCalendar();
      });

      list.appendChild(item);
    });
  }

  // ─── Block form ───────────────────────────────────────────────────────────────

  function initBlockForm() {
    const form = document.getElementById('block-form');
    if (!form) return;

    // Default time to current hour
    const now = new Date();
    const timeInput = document.getElementById('block-time');
    if (timeInput) {
      timeInput.value = `${String(now.getHours()).padStart(2, '0')}:00`;
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const time = document.getElementById('block-time').value;
      const text = document.getElementById('block-text').value.trim();
      if (!time || !text) return;

      if (typeof Store !== 'undefined' && Store.schedule && Store.schedule.addBlock) {
        Store.schedule.addBlock(state.selectedDate, time, text);
      }

      document.getElementById('block-text').value = '';
      renderSchedule();
      renderCalendar();

      // Animate the new block
      const list = document.getElementById('schedule-list');
      if (list && list.lastElementChild) {
        list.lastElementChild.classList.add('schedule__block--new');
      }
    });
  }

  // ─── Todos ────────────────────────────────────────────────────────────────────

  function renderTodos() {
    const list = document.getElementById('todo-list');
    const countEl = document.getElementById('todo-count');
    if (!list) return;

    let todos = [];
    if (typeof Store !== 'undefined' && Store.todos && Store.todos.getAll) {
      todos = Store.todos.getAll() || [];
    }

    if (countEl) {
      const remaining = todos.filter(t => !t.done).length;
      countEl.textContent = remaining > 0 ? `${remaining} remaining` : 'all done';
      countEl.className = 'todo-section__count' + (remaining === 0 ? ' todo-section__count--done' : '');
    }

    list.innerHTML = '';

    if (todos.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'todo__empty';
      empty.textContent = 'No todos yet. Add one above.';
      list.appendChild(empty);
      return;
    }

    // Sort: undone first, then high priority within each group
    const sorted = [...todos].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return 0;
    });

    sorted.forEach((todo, index) => {
      const item = document.createElement('div');
      item.className = 'todo__item' + (todo.done ? ' todo__item--done' : '') + (todo.priority === 'high' ? ' todo__item--high' : '');
      item.style.animationDelay = `${index * 30}ms`;

      item.innerHTML = `
        <button class="todo__checkbox" aria-label="${todo.done ? 'Mark incomplete' : 'Mark complete'}" data-id="${todo.id}">
          ${todo.done ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </button>
        <span class="todo__text">${escapeHtml(todo.text)}</span>
        ${todo.priority === 'high' ? '<span class="todo__priority-badge">High</span>' : ''}
        <button class="todo__delete" aria-label="Delete todo" data-id="${todo.id}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;

      item.querySelector('.todo__checkbox').addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (typeof Store !== 'undefined' && Store.todos && Store.todos.toggle) {
          Store.todos.toggle(id);
        }
        renderTodos();
      });

      item.querySelector('.todo__delete').addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const el = e.currentTarget.closest('.todo__item');
        el.style.opacity = '0';
        el.style.transform = 'translateX(8px)';
        el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        setTimeout(() => {
          if (typeof Store !== 'undefined' && Store.todos && Store.todos.delete) {
            Store.todos.delete(id);
          }
          renderTodos();
        }, 200);
      });

      list.appendChild(item);
    });
  }

  function initTodoForm() {
    const form = document.getElementById('todo-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = document.getElementById('todo-input').value.trim();
      const priority = document.getElementById('todo-priority').value;
      if (!text) return;

      if (typeof Store !== 'undefined' && Store.todos && Store.todos.add) {
        Store.todos.add(text, priority);
      }

      document.getElementById('todo-input').value = '';
      document.getElementById('todo-priority').value = 'normal';
      renderTodos();
    });
  }

  // ─── Calendar navigation ──────────────────────────────────────────────────────

  function initCalNav() {
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      if (state.viewMonth === 0) {
        state.viewMonth = 11;
        state.viewYear--;
      } else {
        state.viewMonth--;
      }
      renderCalendar();
    });

    document.getElementById('cal-next')?.addEventListener('click', () => {
      if (state.viewMonth === 11) {
        state.viewMonth = 0;
        state.viewYear++;
      } else {
        state.viewMonth++;
      }
      renderCalendar();
    });
  }

  // ─── Reveal animation ─────────────────────────────────────────────────────────

  function initReveals() {
    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      document.querySelectorAll('.reveal').forEach(el => {
        el.classList.add('reveal--visible');
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  // ─── Store event listener ─────────────────────────────────────────────────────

  function initStoreListener() {
    window.addEventListener('nocual:update', () => {
      renderCalendar();
      renderSchedule();
      renderTodos();
    });
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    const now = new Date();
    state.viewYear = now.getFullYear();
    state.viewMonth = now.getMonth();
    state.selectedDate = todayKey();

    initSidebarDate();
    initCalNav();
    renderCalendar();
    renderDayView();
    initBlockForm();
    initTodoForm();
    renderTodos();
    initStoreListener();
    initReveals();
  }

  // Wait for DOM + deferred scripts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
