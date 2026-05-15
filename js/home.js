// home.js — Nocual Home page logic

const NOC_MESSAGES = [
  "You've got a clean slate today. Don't overthink it — just start.",
  "Checked your numbers lately? Small habits compound quietly.",
  "One thing at a time. That's all it ever takes.",
  "Whatever's sitting in the back of your head — write it down, then forget it.",
  "Today's version of you is already better than last week's. Keep going.",
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatSidebarDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatGreetingDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatPeso(amount) {
  return "₱" + Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Sidebar date ──────────────────────────────────────────────────────────────
function renderSidebarDate() {
  const el = document.getElementById("sidebar-date");
  if (el) el.textContent = formatSidebarDate(new Date());
}

// ── Greeting ──────────────────────────────────────────────────────────────────
function renderGreeting() {
  const greetEl = document.getElementById("greeting-text");
  const dateEl = document.getElementById("greeting-date");
  if (greetEl) greetEl.textContent = `${getGreeting()}, Ziyaad.`;
  if (dateEl) dateEl.textContent = formatGreetingDate(new Date());
}

// ── Buddy message ─────────────────────────────────────────────────────────────
function renderBuddyMsg() {
  const el = document.getElementById("buddy-msg-text");
  if (!el) return;
  const idx = Math.floor(Math.random() * NOC_MESSAGES.length);
  el.textContent = NOC_MESSAGES[idx];
}

// ── Stat cards ────────────────────────────────────────────────────────────────
function safeGet(fn) {
  try { return fn(); } catch { return null; }
}

function renderStats() {
  const todayKey = getTodayKey();

  // Savings
  const savingsEl = document.getElementById("stat-savings-val");
  if (savingsEl) {
    const total = safeGet(() => Store.finances.getTotal());
    savingsEl.textContent = total !== null ? formatPeso(total) : "—";
  }

  // Open todos
  const todosEl = document.getElementById("stat-todos-val");
  if (todosEl) {
    const open = safeGet(() => Store.todos.getAll().filter(t => !t.done).length);
    todosEl.textContent = open !== null ? open : "—";
  }

  // Today's schedule blocks
  const schedEl = document.getElementById("stat-schedule-val");
  if (schedEl) {
    const blocks = safeGet(() => {
      const all = Store.schedule.getAll();
      return all.filter(b => b.date === todayKey).length;
    });
    schedEl.textContent = blocks !== null ? blocks : "—";
  }

  // Habits done today / total
  const habitsEl = document.getElementById("stat-habits-val");
  if (habitsEl) {
    const result = safeGet(() => {
      const all = Store.habits.getAll();
      const total = all.length;
      const done = all.filter(h => h.completedDates && h.completedDates.includes(todayKey)).length;
      return `${done} / ${total}`;
    });
    habitsEl.textContent = result !== null ? result : "—";
  }
}

// ── Schedule preview ──────────────────────────────────────────────────────────
function renderSchedulePreview() {
  const container = document.getElementById("schedule-preview");
  if (!container) return;

  const todayKey = getTodayKey();
  const blocks = safeGet(() =>
    Store.schedule.getAll()
      .filter(b => b.date === todayKey)
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
  );

  if (!blocks || blocks.length === 0) {
    container.innerHTML = `
      <div class="schedule-empty">
        <span>Nothing scheduled today.</span>
        <a href="planner.html">Add a block</a>
      </div>`;
    return;
  }

  container.innerHTML = blocks.map(b => `
    <div class="schedule-block">
      <div class="schedule-block__time">${b.startTime || ""}</div>
      <div class="schedule-block__body">
        <div class="schedule-block__title">${escHtml(b.title || "Untitled")}</div>
        ${b.duration ? `<div class="schedule-block__duration">${b.duration}</div>` : ""}
      </div>
    </div>
  `).join("");
}

// ── Todo preview ──────────────────────────────────────────────────────────────
function renderTodoPreview() {
  const list = document.getElementById("todo-preview");
  if (!list) return;

  const todos = safeGet(() =>
    Store.todos.getAll().filter(t => !t.done).slice(0, 3)
  );

  if (!todos || todos.length === 0) {
    list.innerHTML = `<li class="todo-empty">All clear — nothing open.</li>`;
    return;
  }

  list.innerHTML = todos.map(t => `
    <li class="todo-item">
      <div class="todo-item__dot"></div>
      <span class="todo-item__text">${escHtml(t.text || t.title || "Untitled")}</span>
    </li>
  `).join("");
}

// ── Util ──────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Stat card navigation ──────────────────────────────────────────────────────
function bindStatCardNav() {
  const map = {
    "stat-savings": "finance.html",
    "stat-todos": "planner.html",
    "stat-schedule": "planner.html",
    "stat-habits": "habits.html",
  };

  Object.entries(map).forEach(([id, href]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => { window.location.href = href; });
    el.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        window.location.href = href;
      }
    });
  });
}

// ── Reveal animation ──────────────────────────────────────────────────────────
function initReveals() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const els = document.querySelectorAll(".reveal");

  if (prefersReduced) {
    els.forEach(el => el.classList.add("reveal--visible"));
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add("reveal--visible");
          }, i * 80);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05 }
  );

  els.forEach(el => observer.observe(el));
}

// ── Init ──────────────────────────────────────────────────────────────────────
function renderAll() {
  renderSidebarDate();
  renderGreeting();
  renderBuddyMsg();
  renderStats();
  renderSchedulePreview();
  renderTodoPreview();
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  bindStatCardNav();
  initReveals();
});

// Re-render on Store update events
window.addEventListener("nocual:update", () => {
  renderStats();
  renderSchedulePreview();
  renderTodoPreview();
});
