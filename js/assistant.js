const Assistant = (() => {
  let isOpen = false;
  let isLoading = false;

  // ── Feature 3: Undo state ─────────────────────────────────────────────────
  let lastAction = null;
  let undoTimer = null;

  const REVERSIBLE_ACTIONS = new Set([
    'ADD_TODO', 'DELETE_TODO', 'COMPLETE_TODO',
    'ADD_TRANSACTION', 'ADD_HABIT', 'COMPLETE_HABIT',
  ]);

  const showUndoChip = () => {
    const existing = document.getElementById('undo-chip');
    if (existing) existing.remove();
    if (undoTimer) clearTimeout(undoTimer);

    const chip = document.createElement('div');
    chip.className = 'undo-chip';
    chip.id = 'undo-chip';
    chip.textContent = '↩ Undo';
    chip.addEventListener('click', () => {
      performUndo();
      chip.remove();
      if (undoTimer) clearTimeout(undoTimer);
    });
    document.body.appendChild(chip);

    undoTimer = setTimeout(() => {
      chip.remove();
      lastAction = null;
    }, 5000);
  };

  const performUndo = () => {
    if (!lastAction) return;
    const { type, payload, meta } = lastAction;
    try {
      switch (type) {
        case 'ADD_TODO':
          if (meta?.id) Store.todos.delete(meta.id);
          break;
        case 'DELETE_TODO':
          if (payload?.text) Store.todos.add(payload.text, payload.priority ?? 'normal');
          break;
        case 'COMPLETE_TODO':
          if (payload?.id) Store.todos.toggle(payload.id);
          break;
        case 'ADD_TRANSACTION':
          // no clean delete API — best effort: dispatch update event
          break;
        case 'ADD_HABIT':
          if (meta?.id) Store.habits.delete(meta.id);
          break;
        case 'COMPLETE_HABIT':
          if (payload?.id) Store.habits.toggleToday(payload.id);
          break;
      }
    } catch {}
    lastAction = null;
  };

  const parseAction = (text) => {
    const match = text.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/i);
    if (!match) return { message: text, action: null };
    try {
      const action = JSON.parse(match[1].trim());
      const message = text.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/i, '').trim();
      return { message, action };
    } catch {
      return { message: text, action: null };
    }
  };

  const executeAction = (action) => {
    if (!action) return;
    const { type, payload } = action;

    // Capture for undo before executing
    if (REVERSIBLE_ACTIONS.has(type)) {
      lastAction = { type, payload, meta: {} };
    }

    switch (type) {
      case 'ADD_TODO': {
        const todo = Store.todos.add(payload.text, payload.priority ?? 'normal');
        if (lastAction) lastAction.meta.id = todo?.id ?? null;
        break;
      }
      case 'DELETE_TODO':
        Store.todos.delete(payload.id);
        break;
      case 'COMPLETE_TODO':
        Store.todos.toggle(payload.id);
        break;
      case 'ADD_SCHEDULE_BLOCK':
        Store.schedule.addBlock(payload.date, payload.time, payload.text);
        break;
      case 'DELETE_SCHEDULE_BLOCK':
        Store.schedule.deleteBlock(payload.date, payload.id);
        break;
      case 'ADD_TRANSACTION':
        Store.finances.addTransaction(payload.type, payload.amount, payload.description, payload.account);
        break;
      case 'ADD_RECURRING':
        Store.recurring.add(payload.name, payload.amount, payload.frequency, payload.account);
        break;
      case 'ADD_HABIT': {
        const habit = Store.habits.add(payload.name);
        if (lastAction) lastAction.meta.id = habit?.id ?? null;
        break;
      }
      case 'COMPLETE_HABIT':
        Store.habits.toggleToday(payload.id);
        break;
      case 'NAVIGATE': {
        const pages = {
          home: 'index.html',
          planner: 'planner.html',
          finance: 'finance.html',
          roast: 'roast.html',
          hype: 'hype.html',
          'that-thing': 'that-thing.html',
          habits: 'habits.html',
        };
        const dest = pages[payload.page];
        if (dest) window.location.href = dest;
        break;
      }
    }

    if (REVERSIBLE_ACTIONS.has(type)) {
      showUndoChip();
    }
  };

  const callNvidiaStream = async (messages, maxTokens = 512, onToken) => {
    const res = await fetch(`${CONFIG.NVIDIA_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: CONFIG.NVIDIA_MODEL, max_tokens: maxTokens, messages }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message ?? `API error ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (json === '[DONE]') break;
        try {
          const token = JSON.parse(json).choices?.[0]?.delta?.content ?? '';
          if (token) { full += token; onToken(token); }
        } catch {}
      }
    }
    return full;
  };

  const callNvidia = async (messages, maxTokens = 512) => {
    let full = '';
    await callNvidiaStream(messages, maxTokens, (token) => { full += token; });
    return full;
  };

  /* ── UI helpers ────────────────────────────────────────────────────────── */
  const getEls = () => ({
    panel: document.getElementById('assistant'),
    input: document.getElementById('assistant-input'),
    sendBtn: document.getElementById('assistant-send'),
    expandBtn: document.getElementById('assistant-expand'),
    chat: document.getElementById('assistant-chat'),
    orb: document.querySelector('.assistant__orb'),
    mic: document.getElementById('assistant-mic'),
  });

  const appendMessage = (role, content) => {
    const { chat } = getEls();
    if (!chat) return;
    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg--${role}`;
    if (role === 'ai') {
      msg.innerHTML = `
        <div class="chat-msg__avatar"></div>
        <div class="chat-msg__bubble">${content.replace(/\n/g, '<br>')}</div>
      `;
    } else {
      msg.innerHTML = `<div class="chat-msg__bubble">${content.replace(/\n/g, '<br>')}</div>`;
    }
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
  };

  const toggle = () => {
    const { panel } = getEls();
    if (!panel) return;
    isOpen = !isOpen;
    panel.classList.toggle('is-open', isOpen);
    if (isOpen) loadHistory();
  };

  const loadHistory = () => {
    const { chat } = getEls();
    if (!chat) return;
    chat.innerHTML = '';
    const history = Store.chat.getHistory();
    if (history.length === 0) {
      appendMessage('ai', "what's good. ask me anything or tell me what to add.");
    } else {
      history.forEach(m => appendMessage(m.role === 'assistant' ? 'ai' : 'user', m.content));
    }
  };

  const send = async () => {
    if (isLoading) return;
    const { input, panel, chat, orb } = getEls();
    const text = input?.value.trim();
    if (!text) return;

    if (!isOpen) {
      isOpen = true;
      panel?.classList.add('is-open');
      loadHistory();
    }

    input.value = '';
    appendMessage('user', text);
    Store.chat.addMessage('user', text);

    isLoading = true;

    // Feature 1: Orb pulse while thinking
    if (orb) orb.classList.add('orb--thinking');

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg chat-msg--ai';
    msgEl.innerHTML = `<div class="chat-msg__avatar"></div><div class="chat-msg__bubble"></div>`;
    chat.appendChild(msgEl);
    const bubble = msgEl.querySelector('.chat-msg__bubble');
    chat.scrollTop = chat.scrollHeight;

    const context = Store.getContext();
    const history = Store.chat.getHistory().slice(-20);
    const messages = [
      { role: 'system', content: CONFIG.ASSISTANT_SYSTEM_PROMPT },
      ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content: `[Current data: ${JSON.stringify(context)}]\n\n${text}` },
    ];

    try {
      let raw = '';
      await callNvidiaStream(messages, 512, (token) => {
        raw += token;
        bubble.innerHTML = raw.replace(/\n/g, '<br>');
        chat.scrollTop = chat.scrollHeight;
      });
      const { message, action } = parseAction(raw);
      if (message !== raw) bubble.innerHTML = message.replace(/\n/g, '<br>');
      Store.chat.addMessage('assistant', message || raw);
      if (action) executeAction(action);
    } catch (err) {
      bubble.textContent = `something broke: ${err.message}`;
    } finally {
      isLoading = false;
      // Feature 1: Stop orb pulse
      if (orb) orb.classList.remove('orb--thinking');
    }
  };

  /* ── Feature 2: Voice input ────────────────────────────────────────────── */
  const initMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const micBtn = document.getElementById('assistant-mic');
    if (!micBtn) return;

    if (!SpeechRecognition) {
      micBtn.style.display = 'none';
      return;
    }

    let recognition = null;
    let isRecording = false;

    micBtn.addEventListener('click', () => {
      if (isRecording) {
        recognition?.stop();
        return;
      }

      recognition = new SpeechRecognition();
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('mic--active');
      };

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        const input = document.getElementById('assistant-input');
        if (input) {
          input.value = transcript;
          input.focus();
        }
      };

      recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('mic--active');
      };

      recognition.onerror = () => {
        isRecording = false;
        micBtn.classList.remove('mic--active');
      };

      recognition.start();
    });
  };

  /* ── Specialized AI calls ──────────────────────────────────────────────── */
  const generateRoast = async () => {
    const ctx = Store.getContext();
    const doneTodos = ctx.todos.filter(t => t.done).length;
    const totalTodos = ctx.todos.length;
    const totalSpent = ctx.finances.recentTx.filter(t => t.type === 'out').reduce((a, t) => a + t.amount, 0);
    const habitsDone = ctx.habits.filter(h => h.doneToday).length;
    const totalHabits = ctx.habits.length;

    const prompt = `Roast this person's past week based on their data:
- Todos: ${doneTodos}/${totalTodos} completed
- Money spent recently: ₱${totalSpent.toLocaleString()}
- Habits done today: ${habitsDone}/${totalHabits}

Give ONE short sharp roast. 2-3 sentences max. Funny but real. No intro, just the roast.`;

    try {
      return await callNvidia([{ role: 'user', content: prompt }], 200);
    } catch {
      return "couldn't roast you this time. you lucked out.";
    }
  };

  const generateHype = async (task) => {
    const prompt = `Hype this person up for: "${task}"

Give a short punchy hype. 2-3 sentences. Specific to what they're doing. Real energy, not generic motivation. No intro, just the hype.`;

    try {
      return await callNvidia([{ role: 'user', content: prompt }], 150);
    } catch {
      return "you got this. go.";
    }
  };

  const findThatThing = async (query) => {
    const ctx = Store.getContext();

    const prompt = `User is trying to remember something. Their query: "${query}"

Their data:
- Todos: ${JSON.stringify(ctx.todos.map(t => t.text))}
- Today's schedule: ${JSON.stringify(ctx.todaySchedule)}
- Recent transactions: ${JSON.stringify(ctx.finances.recentTx.map(t => t.description))}
- Habits: ${JSON.stringify(ctx.habits.map(h => h.name))}

Figure out what they're looking for. Reply with:
TYPE: [todo|schedule|finance|habit|unknown]
ANSWER: [what they were looking for, or best guess]
SOURCE: [where you found it]

Keep it brief.`;

    try {
      const text = await callNvidia([{ role: 'user', content: prompt }], 200);
      const typeMatch = text.match(/TYPE:\s*(\w+)/i);
      const answerMatch = text.match(/ANSWER:\s*(.+)/i);
      const sourceMatch = text.match(/SOURCE:\s*(.+)/i);
      return {
        type: typeMatch?.[1] ?? 'unknown',
        text: answerMatch?.[1] ?? text,
        source: sourceMatch?.[1] ?? '',
      };
    } catch {
      return { type: 'error', text: "search failed. try again.", source: '' };
    }
  };

  /* ── Init ──────────────────────────────────────────────────────────────── */
  const init = () => {
    const { input, sendBtn, expandBtn } = getEls();

    expandBtn?.addEventListener('click', toggle);

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });

    sendBtn?.addEventListener('click', send);

    const toggleBtn = document.getElementById('assistant-toggle');
    toggleBtn?.addEventListener('click', toggle);

    // Feature 2: Insert mic button before send button
    const micBtn = document.createElement('button');
    micBtn.type = 'button';
    micBtn.className = 'assistant__mic';
    micBtn.id = 'assistant-mic';
    micBtn.setAttribute('aria-label', 'Voice input');
    micBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>`;

    if (sendBtn) {
      sendBtn.parentNode.insertBefore(micBtn, sendBtn);
    }

    initMic();
  };

  return { init, toggle, send, generateRoast, generateHype, findThatThing };
})();

document.addEventListener('DOMContentLoaded', () => Assistant.init());
