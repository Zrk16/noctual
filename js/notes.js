const Notes = (() => {
  let currentId = null;
  let saveTimer = null;
  let linkTimer = null;
  let isPreviewing = false;
  let graphOpen = false;
  let simulation = null;

  /* ── Helpers ───────────────────────────────────────────────────────────── */
  const fmt = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getEl = (id) => document.getElementById(id);

  /* ── List rendering ────────────────────────────────────────────────────── */
  const renderList = (filter = '') => {
    const list = getEl('notes-list');
    const empty = getEl('notes-empty');
    if (!list) return;

    const notes = Store.notes.getAll();
    const query = filter.toLowerCase().trim();
    const filtered = query
      ? notes.filter(n => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query))
      : notes;

    list.innerHTML = '';

    if (filtered.length === 0) {
      empty.style.display = '';
      return;
    }
    empty.style.display = 'none';

    filtered.forEach(note => {
      const el = document.createElement('div');
      el.className = 'note-item' + (note.id === currentId ? ' note-item--active' : '');
      el.dataset.id = note.id;

      const preview = note.content.replace(/[#*`>\-]/g, '').trim().slice(0, 60);

      el.innerHTML = `
        <div class="note-item__title">${note.title || 'Untitled'}</div>
        ${preview ? `<div class="note-item__preview">${preview}</div>` : ''}
        <div class="note-item__date">${fmt(note.updatedAt || note.createdAt)}</div>
      `;
      el.addEventListener('click', () => openNote(note.id));
      list.appendChild(el);
    });
  };

  /* ── Open note ─────────────────────────────────────────────────────────── */
  const openNote = (id) => {
    const note = Store.notes.getAll().find(n => n.id === id);
    if (!note) return;

    currentId = id;

    const inner = getEl('editor-inner');
    const empty = getEl('editor-empty');
    const titleEl = getEl('note-title');
    const contentEl = getEl('note-content');
    const metaEl = getEl('editor-meta');
    const previewEl = getEl('notes-preview');
    const previewBtn = getEl('preview-toggle-btn');

    inner.style.display = '';
    empty.style.display = 'none';

    titleEl.value = note.title;
    contentEl.value = note.content;
    metaEl.textContent = fmt(note.updatedAt || note.createdAt);

    // reset preview state
    isPreviewing = false;
    contentEl.style.display = '';
    previewEl.style.display = 'none';
    previewBtn.textContent = 'Preview';

    renderConnections(id);
    renderList(getEl('notes-search')?.value ?? '');
  };

  /* ── Connections ───────────────────────────────────────────────────────── */
  const renderConnections = (id) => {
    const wrap = getEl('note-connections');
    const chips = getEl('connections-chips');
    if (!wrap || !chips) return;

    const links = Store.notes.getLinks(id);
    const notes = Store.notes.getAll();

    if (links.length === 0) {
      wrap.style.display = 'none';
      return;
    }

    wrap.style.display = '';
    chips.innerHTML = '';

    links.forEach(targetId => {
      const target = notes.find(n => n.id === targetId);
      if (!target) return;
      const chip = document.createElement('div');
      chip.className = 'connection-chip';
      chip.textContent = target.title || 'Untitled';
      chip.addEventListener('click', () => openNote(target.id));
      chips.appendChild(chip);
    });
  };

  /* ── Save note ─────────────────────────────────────────────────────────── */
  const saveNote = () => {
    if (!currentId) return;
    const title = getEl('note-title')?.value ?? '';
    const content = getEl('note-content')?.value ?? '';
    Store.notes.update(currentId, { title, content, updatedAt: Date.now() });
    renderList(getEl('notes-search')?.value ?? '');
  };

  /* ── Debounced save + auto-link ────────────────────────────────────────── */
  const onEdit = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNote, 600);

    if (linkTimer) clearTimeout(linkTimer);
    linkTimer = setTimeout(autoLink, 1500);
  };

  /* ── AI auto-linking ───────────────────────────────────────────────────── */
  const autoLink = async () => {
    const notes = Store.notes.getAll();
    if (notes.length < 2) return;

    const statusEl = getEl('link-status');
    const statusText = getEl('link-status-text');

    if (statusEl) statusEl.style.display = '';
    if (statusText) statusText.textContent = 'linking...';

    const notesForAI = notes.map(n => ({
      id: n.id,
      title: n.title || 'Untitled',
      content: n.content.slice(0, 400),
    }));

    const prompt = `You are a knowledge graph builder. Given these notes, find meaningful connections between them.

Notes:
${JSON.stringify(notesForAI, null, 2)}

Return ONLY a JSON array of connections. Each connection: { "from": "note_id", "to": "note_id" }.
Only include real thematic/conceptual connections — not every note to every note.
Max 3 connections per note. Return [] if no meaningful connections exist.

Respond with ONLY the JSON array. No explanation.`;

    try {
      const raw = await callNvidiaForNotes([{ role: 'user', content: prompt }], 600);
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return;

      const connections = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(connections)) return;

      Store.notes.setLinks(connections);
      if (currentId) renderConnections(currentId);
      if (graphOpen) renderGraph();

      if (statusText) statusText.textContent = 'linked';
      setTimeout(() => { if (statusEl) statusEl.style.display = 'none'; }, 1500);
    } catch {
      if (statusEl) statusEl.style.display = 'none';
    }
  };

  const callNvidiaForNotes = async (messages, maxTokens = 400) => {
    const res = await fetch(`${CONFIG.NVIDIA_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: CONFIG.NVIDIA_MODEL, max_tokens: maxTokens, messages }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
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
          if (token) full += token;
        } catch {}
      }
    }
    return full;
  };

  /* ── Preview toggle ────────────────────────────────────────────────────── */
  const togglePreview = () => {
    isPreviewing = !isPreviewing;
    const contentEl = getEl('note-content');
    const previewEl = getEl('notes-preview');
    const btn = getEl('preview-toggle-btn');

    if (isPreviewing) {
      const md = contentEl.value;
      previewEl.innerHTML = marked.parse(md);
      contentEl.style.display = 'none';
      previewEl.style.display = '';
      btn.textContent = 'Edit';
    } else {
      contentEl.style.display = '';
      previewEl.style.display = 'none';
      btn.textContent = 'Preview';
    }
  };

  /* ── Graph view ────────────────────────────────────────────────────────── */
  const openGraph = () => {
    graphOpen = true;
    const editorEl = document.querySelector('.notes-editor');
    const sidebarEl = document.querySelector('.notes-sidebar');
    const graphEl = getEl('notes-graph');
    if (!graphEl) return;

    editorEl.style.display = 'none';
    sidebarEl.style.display = 'none';
    graphEl.style.display = '';

    // make graph span full shell
    graphEl.style.gridColumn = '1 / -1';

    renderGraph();
  };

  const closeGraph = () => {
    graphOpen = false;
    const editorEl = document.querySelector('.notes-editor');
    const sidebarEl = document.querySelector('.notes-sidebar');
    const graphEl = getEl('notes-graph');
    if (!graphEl) return;

    editorEl.style.display = '';
    sidebarEl.style.display = '';
    graphEl.style.display = 'none';

    if (simulation) { simulation.stop(); simulation = null; }
  };

  const renderGraph = () => {
    const svg = d3.select('#graph-svg');
    svg.selectAll('*').remove();

    const notes = Store.notes.getAll();
    if (notes.length === 0) return;

    const el = document.getElementById('graph-svg');
    const W = el.clientWidth || 800;
    const H = el.clientHeight || 500;

    const allLinks = Store.notes.getAllLinks();

    const nodes = notes.map(n => ({ id: n.id, title: n.title || 'Untitled' }));
    const links = allLinks
      .filter(l => notes.find(n => n.id === l.from) && notes.find(n => n.id === l.to))
      .map(l => ({ source: l.from, target: l.to }));

    const g = svg.append('g');

    // zoom
    svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', (e) => {
      g.attr('transform', e.transform);
    }));

    // links
    const link = g.selectAll('.graph-link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'graph-link');

    // nodes
    const node = g.selectAll('.graph-node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => 'graph-node' + (d.id === currentId ? ' is-active' : ''))
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('click', (e, d) => { closeGraph(); openNote(d.id); });

    node.append('circle').attr('r', 8);

    node.append('text')
      .attr('x', 12)
      .attr('y', 4)
      .text(d => d.title.length > 18 ? d.title.slice(0, 18) + '…' : d.title);

    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(30))
      .on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });
  };

  /* ── Delete note ───────────────────────────────────────────────────────── */
  const deleteNote = () => {
    if (!currentId) return;
    Store.notes.delete(currentId);
    currentId = null;

    const inner = getEl('editor-inner');
    const empty = getEl('editor-empty');
    if (inner) inner.style.display = 'none';
    if (empty) empty.style.display = '';

    renderList();
  };

  /* ── Init ──────────────────────────────────────────────────────────────── */
  const init = () => {
    // sidebar date
    const dateEl = document.getElementById('sidebar-date');
    if (dateEl) {
      const d = new Date();
      dateEl.textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    getEl('new-note-btn')?.addEventListener('click', () => {
      const note = Store.notes.add('', '');
      renderList();
      openNote(note.id);
      setTimeout(() => getEl('note-title')?.focus(), 50);
      if (Store.notes.getAll().length >= 2) autoLink();
    });

    getEl('graph-toggle-btn')?.addEventListener('click', openGraph);
    getEl('graph-close-btn')?.addEventListener('click', closeGraph);

    getEl('notes-search')?.addEventListener('input', (e) => {
      renderList(e.target.value);
    });

    getEl('note-title')?.addEventListener('input', onEdit);
    getEl('note-content')?.addEventListener('input', onEdit);

    getEl('preview-toggle-btn')?.addEventListener('click', togglePreview);
    getEl('delete-note-btn')?.addEventListener('click', deleteNote);

    window.addEventListener('nocual:update', () => {
      renderList(getEl('notes-search')?.value ?? '');
      if (currentId) renderConnections(currentId);
    });

    renderList();
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => Notes.init());
