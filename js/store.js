const Store = (() => {
  const cache = {
    todos: [], scheduleBlocks: [], transactions: [], recurring: [],
    habits: [], habitLogs: [], roasts: [], chatHistory: [],
    notes: [], noteLinks: [],
  };
  let _userId = null;
  let _realtimeChannel = null;

  const uid = () => crypto.randomUUID();
  const today = () => new Date().toISOString().split('T')[0];
  const notify = () => window.dispatchEvent(new CustomEvent('nocual:update'));
  const _q = p => p.then(({ error }) => { if (error) console.error('[Store write]', error); }).catch(e => console.error('[Store write]', e));

  const norm = {
    todo:  r => ({ id: r.id, text: r.text, priority: r.priority, done: r.done, createdAt: r.created_at, doneAt: r.done_at }),
    block: r => ({ id: r.id, date: r.date, time: r.time, endTime: r.end_time ?? null, text: r.text }),
    tx:    r => ({ id: r.id, type: r.type, amount: r.amount, description: r.description, account: r.account, createdAt: r.created_at }),
    rec:   r => ({ id: r.id, name: r.name, amount: r.amount, frequency: r.frequency, account: r.account, createdAt: r.created_at }),
    habit: r => ({ id: r.id, name: r.name, createdAt: r.created_at }),
    log:   r => ({ habitId: r.habit_id, date: r.date }),
    roast: r => ({ id: r.id, text: r.text, weekLabel: r.week_label, createdAt: r.created_at }),
    chat:  r => ({ role: r.role, content: r.content, timestamp: r.timestamp }),
    note:  r => ({ id: r.id, title: r.title, content: r.content, createdAt: r.created_at, updatedAt: r.updated_at }),
    link:  r => ({ from: r.from_note_id, to: r.to_note_id }),
  };

  async function _refresh() {
    const queries = [
      ['todos',           DB.from('todos').select('*').order('created_at', { ascending: false })],
      ['scheduleBlocks',  DB.from('schedule_blocks').select('*')],
      ['transactions',    DB.from('transactions').select('*').order('created_at', { ascending: false })],
      ['recurring',       DB.from('recurring').select('*').order('created_at', { ascending: true })],
      ['habits',          DB.from('habits').select('*').order('created_at', { ascending: true })],
      ['habitLogs',       DB.from('habit_logs').select('*')],
      ['roasts',          DB.from('roasts').select('*').order('created_at', { ascending: false })],
      ['chatHistory',     DB.from('chat_history').select('*').order('timestamp', { ascending: true }).limit(50)],
      ['notes',           DB.from('notes').select('*').order('updated_at', { ascending: false })],
      ['noteLinks',       DB.from('note_links').select('*')],
    ];

    const results = await Promise.allSettled(queries.map(([, q]) => q));
    const normMap = {
      todos: norm.todo, scheduleBlocks: norm.block, transactions: norm.tx,
      recurring: norm.rec, habits: norm.habit, habitLogs: norm.log,
      roasts: norm.roast, chatHistory: norm.chat, notes: norm.note, noteLinks: norm.link,
    };

    queries.forEach(([key], i) => {
      const result = results[i];
      if (result.status === 'rejected') {
        console.error(`[Store] ${key} query threw:`, result.reason);
        return;
      }
      const { data, error } = result.value;
      if (error) {
        console.error(`[Store] ${key} query error:`, error);
        return;
      }
      cache[key] = (data ?? []).map(normMap[key]);
    });

    notify();
  }

  async function _init() {
    try {
      const { data: { session } } = await DB.auth.getSession();
      _userId = session?.user?.id ?? null;
      if (_userId) {
        await _refresh();
        _setupRealtime();
      }
      DB.auth.onAuthStateChange(async (_event, session) => {
        const newId = session?.user?.id ?? null;
        if (newId && newId !== _userId) {
          _userId = newId;
          await _refresh();
          _setupRealtime();
        } else if (!newId) {
          _userId = null;
        }
      });
    } catch (e) {
      console.error('[Store] init failed:', e);
    }
  }

  function _setupRealtime() {
    if (_realtimeChannel) return;
    _realtimeChannel = DB.channel('nocual')
      .on('postgres_changes', { event: '*', schema: 'public' }, _refresh)
      .subscribe();
  }

  _init();

  /* ── Todos ─────────────────────────────────────────────────────────────── */
  const todos = {
    getAll: () => cache.todos,
    add: (text, priority = 'normal') => {
      const item = { id: uid(), text, priority, done: false, createdAt: Date.now(), doneAt: null };
      cache.todos.unshift(item);
      notify();
      _q(DB.from('todos').insert({ id: item.id, text, priority, done: false, created_at: item.createdAt, user_id: _userId }));
      return item;
    },
    toggle: (id) => {
      const todo = cache.todos.find(t => t.id === id);
      if (!todo) return;
      const done = !todo.done;
      const doneAt = done ? Date.now() : null;
      Object.assign(todo, { done, doneAt });
      notify();
      _q(DB.from('todos').update({ done, done_at: doneAt }).eq('id', id));
    },
    delete: (id) => {
      cache.todos = cache.todos.filter(t => t.id !== id);
      notify();
      _q(DB.from('todos').delete().eq('id', id));
    },
    update: (id, changes) => {
      const todo = cache.todos.find(t => t.id === id);
      if (!todo) return;
      Object.assign(todo, changes);
      notify();
      const dbChanges = {};
      if ('text'     in changes) dbChanges.text     = changes.text;
      if ('priority' in changes) dbChanges.priority = changes.priority;
      if ('done'     in changes) dbChanges.done     = changes.done;
      if ('doneAt'   in changes) dbChanges.done_at  = changes.doneAt;
      _q(DB.from('todos').update(dbChanges).eq('id', id));
    },
  };

  /* ── Schedule ──────────────────────────────────────────────────────────── */
  const schedule = {
    getDay: (date) => cache.scheduleBlocks.filter(b => b.date === date).sort((a, b) => a.time.localeCompare(b.time)),
    addBlock: (date, time, endTime, text) => {
      const block = { id: uid(), date, time, endTime: endTime || null, text };
      cache.scheduleBlocks.push(block);
      notify();
      _q(DB.from('schedule_blocks').insert({ id: block.id, date, time, end_time: endTime || null, text, user_id: _userId }));
      return block;
    },
    deleteBlock: (date, blockId) => {
      cache.scheduleBlocks = cache.scheduleBlocks.filter(b => b.id !== blockId);
      notify();
      _q(DB.from('schedule_blocks').delete().eq('id', blockId));
    },
    getDaysWithEvents: () => [...new Set(cache.scheduleBlocks.map(b => b.date))],
  };

  /* ── Finances ──────────────────────────────────────────────────────────── */
  const finances = {
    getAll: () => cache.transactions,
    getAccounts: () => {
      const accounts = { gcash: 0, card: 0, cash: 0 };
      cache.transactions.forEach(tx => {
        accounts[tx.account] = (accounts[tx.account] ?? 0) + (tx.type === 'in' ? 1 : -1) * tx.amount;
      });
      return accounts;
    },
    getTotal: () => Object.values(finances.getAccounts()).reduce((a, b) => a + b, 0),
    addTransaction: (type, amount, description, account) => {
      const tx = { id: uid(), type, amount: parseFloat(amount), description, account, createdAt: Date.now() };
      cache.transactions.unshift(tx);
      notify();
      _q(DB.from('transactions').insert({ id: tx.id, type, amount: tx.amount, description, account, created_at: tx.createdAt, user_id: _userId }));
      return tx;
    },
    deleteTransaction: (id) => {
      cache.transactions = cache.transactions.filter(t => t.id !== id);
      notify();
      _q(DB.from('transactions').delete().eq('id', id));
    },
  };

  /* ── Recurring ─────────────────────────────────────────────────────────── */
  const recurring = {
    getAll: () => cache.recurring,
    add: (name, amount, frequency, account) => {
      const item = { id: uid(), name, amount: parseFloat(amount), frequency, account, createdAt: Date.now() };
      cache.recurring.push(item);
      notify();
      _q(DB.from('recurring').insert({ id: item.id, name, amount: item.amount, frequency, account, created_at: item.createdAt, user_id: _userId }));
      return item;
    },
    delete: (id) => {
      cache.recurring = cache.recurring.filter(r => r.id !== id);
      notify();
      _q(DB.from('recurring').delete().eq('id', id));
    },
  };

  /* ── Habits ────────────────────────────────────────────────────────────── */
  const habits = {
    getAll: () => cache.habits,
    add: (name) => {
      const item = { id: uid(), name, createdAt: Date.now() };
      cache.habits.push(item);
      notify();
      _q(DB.from('habits').insert({ id: item.id, name, created_at: item.createdAt, user_id: _userId }));
      return item;
    },
    delete: (id) => {
      cache.habits    = cache.habits.filter(h => h.id !== id);
      cache.habitLogs = cache.habitLogs.filter(l => l.habitId !== id);
      notify();
      _q(DB.from('habits').delete().eq('id', id));
    },
    isDoneToday: (id) => {
      const todayStr = today();
      return cache.habitLogs.some(l => l.habitId === id && l.date === todayStr);
    },
    toggleToday: (id) => {
      const todayStr = today();
      const idx = cache.habitLogs.findIndex(l => l.habitId === id && l.date === todayStr);
      if (idx >= 0) {
        cache.habitLogs.splice(idx, 1);
        _q(DB.from('habit_logs').delete().eq('habit_id', id).eq('date', todayStr));
      } else {
        cache.habitLogs.push({ habitId: id, date: todayStr });
        _q(DB.from('habit_logs').insert({ id: uid(), habit_id: id, date: todayStr, user_id: _userId }));
      }
      notify();
    },
    getStreak: (id) => {
      const logs = cache.habitLogs.filter(l => l.habitId === id).map(l => l.date).sort().reverse();
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
    getAll: () => cache.roasts,
    add: (text, weekLabel) => {
      const item = { id: uid(), text, weekLabel, createdAt: Date.now() };
      cache.roasts.unshift(item);
      notify();
      _q(DB.from('roasts').insert({ id: item.id, text, week_label: weekLabel, created_at: item.createdAt, user_id: _userId }));
      return item;
    },
  };

  /* ── Chat ──────────────────────────────────────────────────────────────── */
  const chat = {
    getHistory: () => cache.chatHistory,
    addMessage: (role, content) => {
      const msg = { role, content, timestamp: Date.now() };
      cache.chatHistory = [...cache.chatHistory, msg].slice(-50);
      notify();
      _q(DB.from('chat_history').insert({ id: uid(), role, content, timestamp: msg.timestamp, user_id: _userId }));
      return msg;
    },
    clear: () => {
      cache.chatHistory = [];
      notify();
      if (_userId) _q(DB.from('chat_history').delete().eq('user_id', _userId));
    },
  };

  /* ── Notes ────────────────────────────────────────────────────────────── */
  const notes = {
    getAll: () => cache.notes,
    add: (title, content) => {
      const item = { id: uid(), title, content, createdAt: Date.now(), updatedAt: Date.now() };
      cache.notes.unshift(item);
      notify();
      _q(DB.from('notes').insert({ id: item.id, title, content, created_at: item.createdAt, updated_at: item.updatedAt, user_id: _userId }));
      return item;
    },
    update: (id, changes) => {
      const note = cache.notes.find(n => n.id === id);
      if (!note) return;
      Object.assign(note, changes);
      notify();
      const dbChanges = { updated_at: Date.now() };
      if ('title'   in changes) dbChanges.title   = changes.title;
      if ('content' in changes) dbChanges.content  = changes.content;
      _q(DB.from('notes').update(dbChanges).eq('id', id));
    },
    delete: (id) => {
      cache.notes     = cache.notes.filter(n => n.id !== id);
      cache.noteLinks = cache.noteLinks.filter(l => l.from !== id && l.to !== id);
      notify();
      _q(DB.from('notes').delete().eq('id', id));
      _q(DB.from('note_links').delete().or(`from_note_id.eq.${id},to_note_id.eq.${id}`));
    },
    getLinks: (id) => {
      return cache.noteLinks
        .filter(l => l.from === id || l.to === id)
        .map(l => l.from === id ? l.to : l.from);
    },
    getAllLinks: () => cache.noteLinks,
    setLinks: async (connections) => {
      if (!_userId) return;
      // replace all links in DB and cache
      cache.noteLinks = connections.map(c => ({ from: c.from, to: c.to }));
      notify();
      await DB.from('note_links').delete().eq('user_id', _userId);
      if (connections.length > 0) {
        const rows = connections.map(c => ({ id: uid(), from_note_id: c.from, to_note_id: c.to, user_id: _userId }));
        _q(DB.from('note_links').insert(rows));
      }
    },
  };

  /* ── Full context snapshot (for AI) ───────────────────────────────────── */
  const getContext = () => ({
    date: today(),
    todos: todos.getAll().slice(0, 30),
    todaySchedule: schedule.getDay(today()),
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

  return { todos, schedule, finances, recurring, habits, roasts, chat, notes, getContext };
})();
