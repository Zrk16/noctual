/* Obsidian vault integration via File System Access API */
const Obsidian = (() => {
  let dirHandle = null;

  const isSupported = () => 'showDirectoryPicker' in window;

  const connect = async () => {
    if (!isSupported()) {
      alert('File System Access API not supported in this browser. Use Chrome or Edge.');
      return false;
    }
    try {
      dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      localStorage.setItem('nocual_obsidian_connected', '1');
      return true;
    } catch {
      return false;
    }
  };

  const isConnected = () => !!dirHandle;

  const getFileHandle = async (path, create = false) => {
    if (!dirHandle) return null;
    const parts = path.split('/').filter(Boolean);
    let current = dirHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i], { create });
    }
    return current.getFileHandle(parts[parts.length - 1], { create });
  };

  const readFile = async (path) => {
    try {
      const handle = await getFileHandle(path);
      if (!handle) return null;
      const file = await handle.getFile();
      return file.text();
    } catch { return null; }
  };

  const writeFile = async (path, content) => {
    try {
      const handle = await getFileHandle(path, true);
      if (!handle) return false;
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch { return false; }
  };

  const todayPath = () => {
    const d = new Date().toISOString().split('T')[0];
    return `${d}.md`;
  };

  const syncToVault = async () => {
    if (!isConnected()) return;
    const ctx = Store.getContext();
    const date = ctx.date;

    let content = `# ${date}\n\n`;

    const schedule = Store.schedule.getDay(date);
    if (schedule.length) {
      content += `## Schedule\n`;
      schedule.forEach(b => { content += `- ${b.time} — ${b.text}\n`; });
      content += '\n';
    }

    const todos = Store.todos.getAll().filter(t => !t.done);
    if (todos.length) {
      content += `## Todos\n`;
      todos.forEach(t => { content += `- [ ] ${t.text}\n`; });
      content += '\n';
    }

    await writeFile(todayPath(), content);
  };

  const searchVault = async (query) => {
    if (!isConnected()) return [];
    const results = [];
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind !== 'file' || !name.endsWith('.md')) continue;
        const file = await handle.getFile();
        const text = await file.text();
        if (text.toLowerCase().includes(query.toLowerCase())) {
          results.push({ file: name, excerpt: text.slice(0, 200) });
        }
      }
    } catch {}
    return results.slice(0, 5);
  };

  return { connect, isConnected, isSupported, readFile, writeFile, syncToVault, searchVault };
})();
