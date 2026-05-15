const Store = (() => {
  const KEYS = {
    todos: 'nocual_todos',
    schedule: 'nocual_schedule',
    finances: 'nocual_finances',
    habits: 'nocual_habits',
    habitLogs: 'nocual_habit_logs',
    roasts: 'nocual_roasts',
    chatHistory: 'nocual_chat_history',
    recurring: 'nocual_recurring',
  };

  const uid = () => Math.random().toString(36).slice(2, 9);

  const get = (key) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? []; }
    catch { return []; }
  };

  const set = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('nocual:update', { detail: { key } }));
  };

  /* ── Todos ─────────────────────────────────────────────────────────────── */
  const todos = {
    getAll: () => get(KEYS.todos),
    add: (text, priority = 'normal') => {
      const items = todos.getAll();
      const item = { id: uid(), text, priority, done: false, createdAt: Date.now() };
      set(KEYS.todos, [item, ...items]);
      return item;
    },
    toggle: (id) => {
      const items = todos.getAll().map(t => t.id === id ? { ...t, done: !t.done, doneAt: Date.now() } : t);
      set(KEYS.todos, items);
    },
    delete: (id) => set(KEYS.todos, todos.getAll().filter(t => t.id !== id)),
    update: (id, changes) => {
      set(KEYS.todos, todos.getAll().map(t => t.id === id ? { ...t, ...changes } : t));
    },
  };

  /* ── Schedule ──────────────────────────────────────────────────────────── */
  const schedule = {
    getDay: (date) => {
      const all = get(KEYS.schedule);
      return (all.find(d => d.date === date)?.blocks ?? []).sort((a, b) => a.time.localeCompare(b.time));
    },
    addBlock: (date, time, text) => {
      const all = get(KEYS.schedule);
      const existing = all.find(d => d.date === date);
      const block = { id: uid(), time, text };
      if (existing) {
        existing.blocks.push(block);
      } else {
        all.push({ date, blocks: [block] });
      }
      set(KEYS.schedule, all);
      return block;
    },
    deleteBlock: (date, blockId) => {
      const all = get(KEYS.schedule).map(d =>
        d.date === date ? { ...d, blocks: d.blocks.filter(b => b.id !== blockId) } : d
      );
      set(KEYS.schedule, all);
    },
    getDaysWithEvents: () => get(KEYS.schedule).map(d => d.date),
  };

  /* ── Finances ──────────────────────────────────────────────────────────── */
  const finances = {
    getAll: () => get(KEYS.finances),
    getAccounts: () => {
      const txs = finances.getAll();
      const accounts = { gcash: 0, card: 0, cash: 0 };
      txs.forEach(tx => {
        const sign = tx.type === 'in' ? 1 : -1;
        accounts[tx.account] = (accounts[tx.account] ?? 0) + sign * tx.amount;
      });
      return accounts;
    },
    getTotal: () => Object.values(finances.getAccounts()).reduce((a, b) => a + b, 0),
    addTransaction: (type, amount, description, account) => {
      const txs = finances.getAll();
      const tx = { id: uid(), type, amount: parseFloat(amount), description, account, createdAt: Date.now() };
      set(KEYS.finances, [tx, ...txs]);
      return tx;
    },
    deleteTransaction: (id) => set(KEYS.finances, finances.getAll().filter(t => t.id !== id)),
  };

  /* ── Recurring ─────────────────────────────────────────────────────────── */
  const recurring = {
    getAll: () => get(KEYS.recurring),
    add: (name, amount, frequency, account) => {
      const items = recurring.getAll();
      const item = { id: uid(), name, amount: parseFloat(amount), frequency, account, createdAt: Date.now() };
      set(KEYS.recurring, [...items, item]);
      return item;
    },
    delete: (id) => set(KEYS.recurring, recurring.getAll().filter(r => r.id !== id)),
  };

  /* ── Habits ────────────────────────────────────────────────────────────── */
  const habits = {
    getAll: () => get(KEYS.habits),
    add: (name) => {
      const items = habits.getAll();
      const item = { id: uid(), name, createdAt: Date.now() };
      set(KEYS.habits, [...items, item]);
      return item;
    },
    delete: (id) => {
      set(KEYS.habits, habits.getAll().filter(h => h.id !== id));
      const logs = get(KEYS.habitLogs).filter(l => l.habitId !== id);
      localStorage.setItem(KEYS.habitLogs, JSON.stringify(logs));
    },
    isDoneToday: (id) => {
      const today = new Date().toISOString().split('T')[0];
      return get(KEYS.habitLogs).some(l => l.habitId === id && l.date === today);
    },
    toggleToday: (id) => {
      const today = new Date().toISOString().split('T')[0];
      const logs = get(KEYS.habitLogs);
      const existing = logs.findIndex(l => l.habitId === id && l.date === today);
      if (existing >= 0) {
        logs.splice(existing, 1);
      } else {
        logs.push({ habitId: id, date: today });
      }
      localStorage.setItem(KEYS.habitLogs, JSON.stringify(logs));
      window.dispatchEvent(new CustomEvent('nocual:update', { detail: { key: KEYS.habitLogs } }));
    },
    getStreak: (id) => {
      const logs = get(KEYS.habitLogs).filter(l => l.habitId === id).map(l => l.date).sort().reverse();
      let streak = 0;
      let d = new Date();
      for (const log of logs) {
        const dateStr = d.toISOString().split('T')[0];
        if (log === dateStr) { streak++; d.setDate(d.getDate() - 1); }
        else break;
      }
      return streak;
    },
  };

  /* ── Roasts ────────────────────────────────────────────────────────────── */
  const roasts = {
    getAll: () => get(KEYS.roasts),
    add: (text, weekLabel) => {
      const items = roasts.getAll();
      const item = { id: uid(), text, weekLabel, createdAt: Date.now() };
      set(KEYS.roasts, [item, ...items]);
      return item;
    },
  };

  /* ── Chat ──────────────────────────────────────────────────────────────── */
  const chat = {
    getHistory: () => get(KEYS.chatHistory),
    addMessage: (role, content) => {
      const history = chat.getHistory();
      const msg = { role, content, timestamp: Date.now() };
      const trimmed = [...history, msg].slice(-50);
      set(KEYS.chatHistory, trimmed);
      return msg;
    },
    clear: () => set(KEYS.chatHistory, []),
  };

  /* ── Full context snapshot (for AI) ───────────────────────────────────── */
  const getContext = () => ({
    date: new Date().toISOString().split('T')[0],
    todos: todos.getAll().slice(0, 30),
    todaySchedule: schedule.getDay(new Date().toISOString().split('T')[0]),
    finances: {
      accounts: finances.getAccounts(),
      total: finances.getTotal(),
      recentTx: finances.getAll().slice(0, 10),
    },
    recurring: recurring.getAll(),
    habits: habits.getAll().map(h => ({
      ...h,
      doneToday: habits.isDoneToday(h.id),
      streak: habits.getStreak(h.id),
    })),
  });

  return { todos, schedule, finances, recurring, habits, roasts, chat, getContext };
})();
