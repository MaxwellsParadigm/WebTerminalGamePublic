/* ============================================================
   Commands — All terminal command implementations
   ============================================================ */

window.Commands = (() => {
  let vfs = null;        // VirtualFS instance (local)
  let username = null;
  let isRemote = false;  // Are we accessing a remote VFS?
  let remoteCwd = '/';
  let remoteName = '';
  let remoteIp = '';
  let remoteUser = '';   // Username logged in on the remote machine
  let remoteThemeId = null;
  let remoteLastBackup = 0;
  let remoteBackupTimer = 30;
  let timerInterval = null;
  let bbsMode = false;
  let bbsHandler = null;
  let localThemeId = 'catppuccin'; // Tracks user's local theme

  function resolveRemotePath(target) {
    if (!target) return remoteCwd;
    if (target.startsWith('/')) return pathNormalize(target);
    return pathNormalize(remoteCwd + '/' + target);
  }

  function pathNormalize(p) {
    const parts = p.split('/').filter(Boolean);
    const stack = [];
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (stack.length > 0) stack.pop();
        continue;
      }
      stack.push(part);
    }
    return '/' + stack.join('/');
  }

  function init(vfsInstance, user) {
    vfs = vfsInstance;
    username = user;
    isRemote = false;
    remoteCwd = '/';
    localThemeId = Themes.currentId();
  }

  function saveUnlockedCommands() {
    vfs.saveState();
  }

  // --- Parse command string ---
  function parse(input) {
    const trimmed = input.trim();
    if (!trimmed) return { cmd: '', args: [], raw: '' };
    const parts = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).map(a => a.replace(/^"|"$/g, ''));
    return { cmd, args, raw: trimmed };
  }

  // --- Resolve remote path ---
  function resolveRemotePath(p) {
    if (!p || p === '.') return remoteCwd;
    if (p === '/') return '/';
    if (p === '..') {
      const parts = remoteCwd.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/') || '/';
    }
    if (p.startsWith('/')) return p;
    let base = remoteCwd === '/' ? '' : remoteCwd;
    const segments = (base + '/' + p).split('/').filter(Boolean);
    const resolved = [];
    for (const seg of segments) {
      if (seg === '..') resolved.pop();
      else if (seg !== '.') resolved.push(seg);
    }
    return '/' + resolved.join('/') || '/';
  }

  // --- Execute a command ---
  async function execute(input) {
    if (bbsMode) {
      return await handleBBSInput(input);
    }

    const { cmd, args, raw } = parse(input);
    if (!cmd) return;

    const alwaysAllowed = ['exit', 'debug', 'disconnect'];
    const activeUnlocked = vfs.unlockedCommands;

    if (!activeUnlocked.includes(cmd) && !alwaysAllowed.includes(cmd)) {
      Terminal.printError(`${cmd}: command not found or locked. Type 'help' for available commands.`);
      return;
    }

    switch (cmd) {
      case 'help': return cmdHelp(args);
      case 'clear': return Terminal.clear();
      case 'echo': return cmdEcho(args, raw);
      case 'ls': return await cmdLs(args);
      case 'tree': return await cmdTree(args);
      case 'cd': return await cmdCd(args);
      case 'read': return await cmdRead(args);
      case 'exec': return await cmdExec(args);
      case 'pwd': return cmdPwd();
      case 'mkdir': return cmdMkdir(args);
      case 'touch': return cmdTouch(args);
      case 'rm': return cmdRm(args);
      case 'whoami': return cmdWhoami();
      case 'hostname': return cmdHostname();
      case 'date': return Terminal.print(new Date().toLocaleString(), 'line-info');
      case 'uptime': return Terminal.print(`up ${Math.floor(performance.now() / 1000)}s`, 'line-dim');
      case 'uname': return Terminal.print('WebTermOS 1.0.0 x86_64', 'line-dim');
      case 'connect': return await cmdConnect(args);
      case 'disconnect': return await cmdDisconnect();
      case 'ssh': return await cmdConnect(args);
      case 'hosts': return await cmdHosts();
      case 'bbs': return await cmdBBS();
      case 'chat': return await cmdChatShortcut(args, raw);
      case 'who': return await cmdWho();
      case 'theme': return cmdTheme(args);
      case 'caret': return cmdCaret(args);
      case 'exit':
        if (isRemote) {
          Terminal.printInfo("Type 'disconnect' to leave the remote machine before exiting.");
          return;
        }
        return cmdLogout();
      case 'fetch': return cmdFetch();
      case 'man': return cmdMan(args);
      case 'sec': return await cmdSec(args);
      case 'rel': return await cmdRel(args);
      case 'debug': return await cmdDebug();
      default:
        Terminal.printError(`${cmd}: command not found. Type 'help' for available commands.`);
    }
  }

  // ══════════════════════════════════════════════════════════
  //  Command Implementations
  // ══════════════════════════════════════════════════════════

  function cmdHelp() {
    const helpText = [
      ['help', 'Show this help message'],
      ['clear', 'Clear the terminal screen'],
      ['echo <text>', 'Print text (supports > and >> redirection)'],
      ['ls [path]', 'List directory contents'],
      ['tree [path]', 'Show directory tree with box-drawing chars'],
      ['cd [path]', 'Change directory'],
      ['read <file>', 'Display file contents'],
      ['exec <file>', 'Execute a .mod file to unlock system features'],
      ['pwd', 'Print working directory'],
      ['mkdir <dir>', 'Create a directory'],
      ['touch <file>', 'Create an empty file'],
      ['whoami', 'Display current username'],
      ['hostname', 'Display machine hostname'],
      ['date', 'Display current date/time'],
      ['uname', 'Display system information'],
      ['fetch', 'Display system info with ASCII art'],
      //[''],
      ['connect <ip>', 'Connect to a remote machine'],
      ['disconnect', 'Disconnect from remote machine'],
      ['hosts', 'List known remote hosts'],
      //[''],
      ['bbs', 'Enter BBS chat mode'],
      ['chat <msg>', 'Send a quick chat message'],
      ['who', 'Show online users'],
      //[''],
      ['theme [name]', 'List or switch color themes'],
      ['caret [mode]', 'List or switch caret styles'],
      ['man <cmd>', 'Show manual for a command'],
      ['sec <file> <pw>', 'Secure a file with a password (*.vlt)'],
      ['rel <file> <pw>', 'Release a secured .vlt file'],
      ['rm <file>', 'Remove a file or empty directory'],
      [''],
      ['exit', 'Log out of the terminal'],
    ];

    Terminal.printBlank();
    Terminal.printHTML('<span class="c-purple c-bold">═══ WebTerm Command Reference ═══</span>', 'line-system');
    Terminal.printBlank();
    for (const [cmdUsage, desc] of helpText) {
      if (!cmdUsage) { Terminal.printBlank(); continue; }

      const baseCmd = cmdUsage.split(' ')[0];
      const alwaysAllowed = ['exit'];
      const activeUnlocked = vfs.unlockedCommands;

      if (!activeUnlocked.includes(baseCmd) && !alwaysAllowed.includes(baseCmd)) {
        if (baseCmd !== 'ssh') continue; // hide ssh alias if not allowed
      }

      const padded = cmdUsage.padEnd(18);
      Terminal.printHTML(`  <span class="c-green">${Terminal.escapeHTML(padded)}</span><span class="c-dim">${Terminal.escapeHTML(desc || '')}</span>`);
    }
    Terminal.printBlank();
  }

  async function cmdEcho(args, raw) {
    if (isRemote) {
        // Handle redirection on remote
        const gtIdx = args.indexOf('>');
        const ggtIdx = args.indexOf('>>');
        const redirIdx = gtIdx !== -1 ? gtIdx : ggtIdx;

        if (redirIdx !== -1) {
            const content = args.slice(0, redirIdx).join(' ');
            const targetFile = args[redirIdx + 1];
            if (!targetFile) return Terminal.printError('echo: missing destination file');
            const resolved = resolveRemotePath(targetFile);

            if (ggtIdx !== -1) {
                // Append
                const current = await Network.remoteRead(resolved);
                const newContent = (current.success ? current.content : '') + content + '\n';
                const res = await Network.remoteWrite(resolved, newContent);
                if (!res.success) Terminal.printError(res.error);
            } else {
                // Overwrite
                const res = await Network.remoteWrite(resolved, content + '\n');
                if (!res.success) Terminal.printError(res.error);
            }
            return;
        }
        Terminal.print(args.join(' '));
        return;
    }
    const result = vfs.echo(args);
    if (result.error) Terminal.printError(result.error);
    else if (result.output !== undefined) Terminal.print(result.output);
  }

  // ── Sorting helper ─────────────────────────────────────────

  function sortEntries(entries) {
    const dirs = entries.filter(e => e.isDir).sort((a, b) => a.name.localeCompare(b.name));
    const files = entries.filter(e => !e.isDir).sort((a, b) => a.name.localeCompare(b.name));
    return [...dirs, ...files];
  }

  // ── ls ─────────────────────────────────────────────────────

  async function cmdLs(args) {
    const nonFlags = args.filter(a => !a.startsWith('-'));
    const target = nonFlags[0] || '.';
    if (isRemote) {
      const resolved = resolveRemotePath(target);
      const res = await Network.remoteLs(resolved);
      if (!res.success) return Terminal.printError(res.error);
      if (res.children.length === 0) { Terminal.printDim('(empty directory)'); return; }
      const entries = [];
      for (const child of res.children) {
        const childPath = resolved === '/' ? `/${child}` : `${resolved}/${child}`;
        const stat = await Network.remoteStat(childPath);
        entries.push({ name: child, isDir: stat.success && stat.type === 'dir' });
      }
      for (const e of sortEntries(entries)) {
        if (e.isDir) Terminal.printHTML(`  <span class="c-blue c-bold">${Terminal.escapeHTML(e.name)}/</span>`);
        else Terminal.print(`  ${e.name}`);
      }
    } else {
      const result = vfs.ls(target);
      if (result.error) return Terminal.printError(result.error);
      if (result.children.length === 0) { Terminal.printDim('(empty directory)'); return; }
      const entries = [];
      for (const child of result.children) {
        const childPath = vfs.resolve(target === '.' ? child : `${target}/${child}`);
        const node = vfs.getNode(childPath);
        entries.push({ name: child, isDir: node && node.type === 'dir' });
      }
      for (const e of sortEntries(entries)) {
        if (e.isDir) Terminal.printHTML(`  <span class="c-blue c-bold">${Terminal.escapeHTML(e.name)}/</span>`);
        else Terminal.print(`  ${e.name}`);
      }
    }
  }

  // ── tree ───────────────────────────────────────────────────

  async function cmdTree(args) {
    const target = args[0] || '.';
    if (isRemote) {
      const resolved = resolveRemotePath(target);
      Terminal.printHTML(`<span class="c-blue c-bold">${Terminal.escapeHTML(resolved)}</span>`);
      await treeRemote(resolved, '');
    } else {
      const resolved = vfs.resolve(target);
      const node = vfs.getNode(resolved);
      if (!node) return Terminal.printError(`tree: '${target}': No such file or directory`);
      if (node.type !== 'dir') { Terminal.print(target); return; }
      Terminal.printHTML(`<span class="c-blue c-bold">${Terminal.escapeHTML(resolved)}</span>`);
      treeLocal(resolved, '');
    }
  }

  function treeLocal(dirPath, prefix) {
    const node = vfs.getNode(dirPath);
    if (!node || node.type !== 'dir') return;
    const entries = [];
    for (const child of (node.children || [])) {
      const childPath = dirPath === '/' ? `/${child}` : `${dirPath}/${child}`;
      const childNode = vfs.getNode(childPath);
      entries.push({ name: child, isDir: childNode && childNode.type === 'dir' });
    }
    const sorted = sortEntries(entries);
    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const isLast = i === sorted.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = isLast ? '    ' : '│   ';
      if (entry.isDir) {
        Terminal.printHTML(`<span class="c-dim">${Terminal.escapeHTML(prefix)}${connector}</span><span class="c-blue c-bold">${Terminal.escapeHTML(entry.name)}/</span>`);
        const subPath = dirPath === '/' ? `/${entry.name}` : `${dirPath}/${entry.name}`;
        treeLocal(subPath, prefix + nextPrefix);
      } else {
        Terminal.printHTML(`<span class="c-dim">${Terminal.escapeHTML(prefix)}${connector}</span>${Terminal.escapeHTML(entry.name)}`);
      }
    }
  }

  async function treeRemote(dirPath, prefix) {
    const res = await Network.remoteLs(dirPath);
    if (!res.success) return;
    const entries = [];
    for (const child of (res.children || [])) {
      const childPath = dirPath === '/' ? `/${child}` : `${dirPath}/${child}`;
      const stat = await Network.remoteStat(childPath);
      entries.push({ name: child, isDir: stat.success && stat.type === 'dir' });
    }
    const sorted = sortEntries(entries);
    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const isLast = i === sorted.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = isLast ? '    ' : '│   ';
      if (entry.isDir) {
        Terminal.printHTML(`<span class="c-dim">${Terminal.escapeHTML(prefix)}${connector}</span><span class="c-blue c-bold">${Terminal.escapeHTML(entry.name)}/</span>`);
        const subPath = dirPath === '/' ? `/${entry.name}` : `${dirPath}/${entry.name}`;
        await treeRemote(subPath, prefix + nextPrefix);
      } else {
        Terminal.printHTML(`<span class="c-dim">${Terminal.escapeHTML(prefix)}${connector}</span>${Terminal.escapeHTML(entry.name)}`);
      }
    }
  }

  // ── cd / cat / pwd / mkdir / touch ─────────────────────────

  async function cmdCd(args) {
    const target = args[0] || undefined;
    if (isRemote) {
      const resolved = resolveRemotePath(target);
      const res = await Network.remoteStat(resolved);
      if (!res.success) return Terminal.printError(res.error);
      if (res.type !== 'dir') return Terminal.printError(`cd: ${target}: Not a directory`);
      remoteCwd = resolved;
      updatePrompt();
    } else {
      const result = vfs.cd(target);
      if (result.error) Terminal.printError(result.error);
      else updatePrompt();
    }
  }

  async function cmdRead(args) {
    if (!args[0]) return Terminal.printError('read: missing operand');
    const target = args[0];
    if (isRemote) {
      const resolved = resolveRemotePath(target);
      const res = await Network.remoteRead(resolved);
      if (!res.success) return Terminal.printError(res.error.replace('cat:', 'read:'));
      Terminal.printLines(res.content.split('\n'));
    } else {
      const result = vfs.cat(target);
      if (result.error) return Terminal.printError(result.error.replace('cat:', 'read:'));
      Terminal.printLines(result.content.split('\n'));
    }
  }

  async function cmdExec(args) {
    if (isRemote) return Terminal.printError('exec: permission denied on remote machine');
    if (!args[0]) return Terminal.printError('exec: missing operand (usage: exec <file.mod>)');

    const target = args[0];
    if (!target.endsWith('.mod')) return Terminal.printError('exec: invalid file format. Only .mod files can be executed.');

    const result = vfs.cat(target);
    if (result.error) return Terminal.printError(result.error.replace('cat:', 'exec:'));

    const content = result.content;
    const match = content.match(/::MOD_UNLOCK::([a-z]+)::/);

    if (!match) {
      Terminal.printError('exec: file is corrupted or incompatible module instructions');
      return;
    }

    const newCmd = match[1];

    if (newCmd === 'cd' && !vfs.unlockedCommands.includes('read')) {
      Terminal.printError('incompatable modification');
      return;
    }

    if (vfs.unlockedCommands.includes(newCmd)) {
      Terminal.printWarn(`Modification already applied. Command '${newCmd}' is already unlocked.`);
      return;
    }

    Terminal.printSystem('Applying modification...');
    await Terminal.printProgress('Decryption', 600, 20);
    await Terminal.delay(200);

    vfs.unlockedCommands.push(newCmd);
    saveUnlockedCommands();

    Terminal.printBlank();
    Terminal.printSuccess(`[++] Firmware update complete. Command '${newCmd}' unlocked.`);
    Terminal.printBlank();
  }

  function cmdWhoami() {
    Terminal.print(isRemote ? remoteUser : username);
  }

  function cmdHostname() {
    Terminal.print(isRemote ? remoteName : 'webterm-vStation-9000');
  }

  function cmdPwd() {
    Terminal.print(isRemote ? remoteCwd : vfs.pwd(), 'line-info');
  }

  async function cmdMkdir(args) {
    if (!args[0]) return Terminal.printError('mkdir: missing operand');
    if (isRemote) {
      const res = await Network.remoteMkdir(resolveRemotePath(args[0]));
      if (!res.success) Terminal.printError(res.error);
    } else {
      const result = vfs.mkdir(args[0]);
      if (result.error) Terminal.printError(result.error);
    }
  }

  async function cmdTouch(args) {
    if (!args[0]) return Terminal.printError('touch: missing operand');
    if (isRemote) {
      const res = await Network.remoteTouch(resolveRemotePath(args[0]));
      if (!res.success) Terminal.printError(res.error);
    } else {
      const result = vfs.touch(args[0]);
      if (result.error) Terminal.printError(result.error);
    }
  }

  async function cmdRm(args) {
    if (!args[0]) return Terminal.printError('rm: missing operand');
    if (isRemote) {
      const res = await Network.remoteRm(resolveRemotePath(args[0]));
      if (!res.success) Terminal.printError(res.error);
    } else {
      const result = vfs.rm(args[0]);
      if (result.error) Terminal.printError(result.error);
      else updatePrompt();
    }
  }

  // ── connect / disconnect ───────────────────────────────────

  /**
   * Prompt the user for a single line of input, temporarily taking over the
   * onCommand callback and restoring the previous one when done.
   */
  function promptLine(promptStr, labelText) {
    return new Promise(resolve => {
      if (labelText) Terminal.printDim(labelText);
      Terminal.setPrompt(promptStr);
      Terminal.enableInput();
      // Save the CURRENT handler (the app's main loop) so we can restore it
      const saved = Terminal.getCurrentCommandCallback();
      function handler(input) {
        Terminal.onCommand(saved); // Restore the original handler immediately
        Terminal.disableInput();
        resolve(input.trim());
      }
      Terminal.onCommand(handler);
    });
  }

  async function cmdConnect(args) {
    if (isRemote) {
      Terminal.printWarn('Already connected to a remote machine. Disconnect first.');
      return;
    }
    if (!args[0]) {
      Terminal.printError('connect: usage: connect <ip>');
      Terminal.printDim('Hint: type "hosts" to see known machines.');
      return;
    }
    const ip = args[0];
    Terminal.printSystem(`Connecting to ${ip}...`);
    Terminal.disableInput();

    await Terminal.delay(400);
    await Terminal.printProgress('Establishing connection', 800, 25);

    const res = await Network.remoteConnect(ip);
    if (!res.success) {
      Terminal.printError(res.error);
      Terminal.enableInput();
      return;
    }

    isRemote = true;
    remoteIp = ip;
    remoteName = res.name;
    remoteIp = ip;
    remoteCwd = '/';
    remoteUser = '';
    remoteThemeId = res.theme;
    
    if (res.lastBackup) {
      startTimer(res.lastBackup);
    }

    if (res.theme) Themes.apply(res.theme);

    // Auto-switch theme
    if (remoteThemeId && Themes.get(remoteThemeId)) {
      Themes.apply(remoteThemeId);
      Terminal.setCaret(Themes.get(remoteThemeId).caret || 'block');
    }

    Terminal.printBlank();
    Terminal.printSuccess(`Connected to ${res.name} (${ip})`);
    if (res.motd) {
      Terminal.printBlank();
      Terminal.printLines(res.motd.split('\n'), 'line-system');
    }
    Terminal.printBlank();
    Terminal.setTitle(`WebTerm // ${res.name}`);
    Terminal.setStatus(`🔗 ${ip}`);

    // ── Remote user login flow ──
    const usersRes = await Network.remoteUsers();
    if (!usersRes.success) {
      Terminal.printError('Could not retrieve user list from remote machine.');
      await Network.remoteDisconnect();
      isRemote = false; remoteName = ''; remoteIp = ''; remoteCwd = '/'; remoteUser = '';
      Themes.apply(localThemeId);
      Terminal.enableInput();
      return;
    }

    const userList = usersRes.users;
    Terminal.printHTML('<span class="c-purple c-bold">═══ Remote Login ═══</span>');
    Terminal.printBlank();
    userList.forEach((u, i) => {
      const pwNote = u.hasPassword ? ' <span class="c-dim">(password required)</span>' : ' <span class="c-dim">(no password)</span>';
      Terminal.printHTML(`  <span class="c-green">[${i + 1}]</span> <span class="c-teal">${Terminal.escapeHTML(u.name)}</span>${pwNote}`);
    });
    Terminal.printBlank();

    let authSuccess = false;
    const MAX_TRIES = 3;
    for (let attempt = 0; attempt < MAX_TRIES && !authSuccess; attempt++) {
      // Prompt for user selection (promptLine saves/restores outer handler)
      const choiceRaw = await promptLine('login> ', 'Login as (number or username):');

      // Resolve user by index or name
      let chosenUser = null;
      const choiceNum = parseInt(choiceRaw, 10);
      if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= userList.length) {
        chosenUser = userList[choiceNum - 1];
      } else {
        chosenUser = userList.find(u => u.name === choiceRaw) || null;
      }

      if (!chosenUser) {
        Terminal.printError(`Unknown user '${choiceRaw}'. Try again.`);
        continue;
      }

      let password = null;
      if (chosenUser.hasPassword) {
        password = await promptLine('password> ', `Password for ${chosenUser.name}:`);
      }

      const authRes = await Network.remoteAuth(chosenUser.name, password);
      if (!authRes.success) {
        Terminal.printError(authRes.error);
        if (attempt < MAX_TRIES - 1) Terminal.printDim(`${MAX_TRIES - attempt - 1} attempt(s) remaining.`);
        continue;
      }

      remoteUser = chosenUser.name;
      authSuccess = true;
    }

    if (!authSuccess) {
      Terminal.printError('Authentication failed. Disconnecting.');
      await Network.remoteDisconnect();
      isRemote = false; remoteName = ''; remoteIp = ''; remoteCwd = '/'; remoteUser = '';
      Themes.apply(localThemeId);
      Terminal.setCaret(Themes.get(localThemeId).caret || 'block');
      Terminal.setTitle('WebTerm v1.0');
      Terminal.setStatus('');
      updatePrompt();
      Terminal.enableInput();
      return;
    }

    Terminal.printBlank();
    Terminal.printSuccess(`Logged in as ${remoteUser}.`);
    Terminal.printBlank();
    updatePrompt();
    Terminal.enableInput();
  }


  async function cmdDisconnect() {
    if (!isRemote) {
      Terminal.printError('disconnect: not connected to any remote machine');
      return;
    }
    await Network.remoteDisconnect();
    isRemote = false;
    remoteCwd = '/';
    remoteName = '';
    remoteIp = '';
    remoteUser = '';
    stopTimer();
    Themes.apply(localThemeId);
    Terminal.setStatus('');
    updatePrompt();
    Terminal.printInfo('Disconnected.');
  }

  // ── Timer Logic ──────────────────────────────────────────

  function startTimer(lastBackup) {
    remoteLastBackup = lastBackup;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimerUI, 1000);
    updateTimerUI();
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    Terminal.setTimer('');
  }

  async function updateTimerUI() {
    if (!isRemote) { stopTimer(); return; }
    
    const now = Date.now();
    const elapsedMs = now - remoteLastBackup;
    const remainingMs = (remoteBackupTimer * 60 * 1000) - elapsedMs;
    
    if (remainingMs <= 0) {
        // If expired, maybe sync with server to see if it actually restored
        const status = await Network.remoteStatus();
        if (status.success && status.lastBackup !== remoteLastBackup) {
            remoteLastBackup = status.lastBackup;
            return;
        }
        Terminal.setTimer('00:00', 'timer-low');
        return;
    }

    const totalSecs = Math.floor(remainingMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    const className = (mins < 5) ? 'timer-low' : '';
    Terminal.setTimer(timeStr, className);
  }

  async function cmdHosts() {
    const hosts = await Network.remoteHosts();
    if (!hosts || hosts.length === 0) { Terminal.printDim('No known hosts.'); return; }
    Terminal.printBlank();
    Terminal.printHTML('<span class="c-purple c-bold">═══ Known Hosts ═══</span>');
    Terminal.printBlank();
    for (const h of hosts) {
      Terminal.printHTML(`  <span class="c-green">${Terminal.escapeHTML(h.ip.padEnd(18))}</span><span class="c-dim">${Terminal.escapeHTML(h.name)}</span>`);
    }
    Terminal.printBlank();
    Terminal.printDim('Use: connect <ip> to connect.');
  }

  // ── BBS ────────────────────────────────────────────────────

  async function cmdBBS() {
    Terminal.printHTML('<span class="c-teal c-bold">╔══════════════════════════════════════════╗</span>', 'line-chat line-ascii');
    Terminal.printHTML('<span class="c-teal c-bold">║     ██████╗ ██████╗ ███████╗             ║</span>', 'line-chat line-ascii');
    Terminal.printHTML('<span class="c-teal c-bold">║     ██╔══██╗██╔══██╗██╔════╝             ║</span>', 'line-chat line-ascii');
    Terminal.printHTML('<span class="c-teal c-bold">║     ██████╔╝██████╔╝███████╗             ║</span>', 'line-chat line-ascii');
    Terminal.printHTML('<span class="c-teal c-bold">║     ██╔══██╗██╔══██╗╚════██║             ║</span>', 'line-chat line-ascii');
    Terminal.printHTML('<span class="c-teal c-bold">║     ██████╔╝██████╔╝███████║             ║</span>', 'line-chat line-ascii');
    Terminal.printHTML('<span class="c-teal c-bold">║     ╚═════╝ ╚═════╝ ╚══════╝             ║</span>', 'line-chat line-ascii');
    Terminal.printHTML('<span class="c-teal c-bold">║        Bulletin Board System             ║</span>', 'line-chat line-ascii');
    Terminal.printHTML('<span class="c-teal c-bold">╚══════════════════════════════════════════╝</span>', 'line-chat line-ascii');
    Terminal.printBlank();
    Terminal.printDim('Type messages to chat. Type /quit to leave BBS.');
    Terminal.printBlank();

    const history = await Network.bbsHistory();
    if (history.length > 0) {
      Terminal.printDim(`--- Last ${history.length} messages ---`);
      for (const msg of history) { printBBSMessage(msg); }
      Terminal.printDim('--- End of history ---');
      Terminal.printBlank();
    }

    bbsMode = true;
    Terminal.setPromptEchoEnabled(false);
    bbsHandler = (msg) => { printBBSMessage(msg); };
    Network.onBBSMessage(bbsHandler);
    Terminal.setPrompt(`[BBS] ${username}> `);
  }

  function printBBSMessage(msg) {
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    Terminal.printHTML(
      `<span class="c-dim">[${Terminal.escapeHTML(time)}]</span> <span class="c-teal c-bold">${Terminal.escapeHTML(msg.from)}</span>: ${Terminal.escapeHTML(msg.message)}`,
      'line-chat'
    );
  }

  async function handleBBSInput(input) {
    if (input.trim().toLowerCase() === '/quit') {
      bbsMode = false;
      Terminal.setPromptEchoEnabled(true);
      if (bbsHandler) { Network.offBBSMessage(bbsHandler); bbsHandler = null; }
      Terminal.printDim('Left BBS.');
      updatePrompt();
      return;
    }
    if (!input.trim()) return;
    const res = await Network.bbsSend(input.trim());
    if (res?.error) Terminal.printError(res.error);
  }

  async function cmdChatShortcut(args, raw) {
    const msg = raw.substring(raw.indexOf(' ') + 1);
    if (!msg || msg === 'chat') { Terminal.printError('chat: usage: chat <message>'); return; }
    const res = await Network.bbsSend(msg);
    if (res?.error) Terminal.printError(res.error);
    else Terminal.printSuccess('Message sent to BBS.');
  }

  async function cmdWho() {
    const users = await Network.who();
    Terminal.printBlank();
    Terminal.printHTML('<span class="c-purple c-bold">═══ Online Users ═══</span>');
    Terminal.printBlank();
    for (const u of users) {
      const marker = u === username ? ' (you)' : '';
      Terminal.printHTML(`  <span class="c-green">●</span> <span class="c-teal">${Terminal.escapeHTML(u)}</span><span class="c-dim">${marker}</span>`);
    }
    Terminal.printBlank();
  }

  // ── theme command ──────────────────────────────────────────

  function cmdTheme(args) {
    if (!args[0]) {
      // List themes
      const themes = Themes.list();
      const cur = Themes.currentId();
      Terminal.printBlank();
      Terminal.printHTML('<span class="c-purple c-bold">═══ Available Themes ═══</span>');
      Terminal.printBlank();
      for (const t of themes) {
        const active = t.id === cur ? ' ◄ active' : '';
        Terminal.printHTML(`  <span class="c-green">${Terminal.escapeHTML(t.id.padEnd(16))}</span><span class="c-dim">${Terminal.escapeHTML(t.name)}${active}</span>`);
      }
      Terminal.printBlank();
      Terminal.printDim('Usage: theme <name>');
      return;
    }
    const themeId = args[0].toLowerCase();
    const theme = Themes.get(themeId);
    if (!theme) {
      Terminal.printError(`theme: unknown theme '${args[0]}'. Type 'theme' to list.`);
      return;
    }
    Themes.apply(themeId);
    if (!isRemote) localThemeId = themeId;
    // Apply theme's default caret
    Terminal.setCaret(theme.caret || 'block');
    Terminal.printSuccess(`Theme switched to ${theme.name}.`);
  }

  // ── caret command ──────────────────────────────────────────

  function cmdCaret(args) {
    if (!args[0]) {
      const modes = Terminal.getCaretModes();
      const cur = Terminal.getCaret();
      Terminal.printBlank();
      Terminal.printHTML('<span class="c-purple c-bold">═══ Caret Styles ═══</span>');
      Terminal.printBlank();
      const descriptions = {
        block: 'Pulsing block █',
        underscore: 'Pulsing underscore _',
        ibeam: 'Thin I-beam │',
        matrix: 'Random cycling symbols',
      };
      for (const m of modes) {
        const active = m === cur ? ' ◄ active' : '';
        Terminal.printHTML(`  <span class="c-green">${Terminal.escapeHTML(m.padEnd(14))}</span><span class="c-dim">${descriptions[m] || m}${active}</span>`);
      }
      Terminal.printBlank();
      Terminal.printDim('Usage: caret <mode>');
      return;
    }
    const mode = args[0].toLowerCase();
    const ok = Terminal.setCaret(mode);
    if (!ok) {
      Terminal.printError(`caret: unknown mode '${args[0]}'. Type 'caret' to list.`);
    } else {
      Terminal.printSuccess(`Caret set to ${mode}.`);
    }
  }

  // ── fetch ──────────────────────────────────────────────────

  async function cmdFetch() {
    const theme = Themes.current();
    const logo = theme.logo || [];

    // Pad logo lines to consistent width
    const maxLogoWidth = Math.max(...logo.map(l => l.length), 0);
    const paddedLogo = logo.map(l => l.padEnd(maxLogoWidth));
    const emptyLogoLine = ' '.repeat(maxLogoWidth);

    let info;

    if (isRemote) {
      // ── Remote machine fetch ──────────────────────────────
      const fetchRes = await Network.remoteFetch();
      if (!fetchRes.success) {
        Terminal.printError('fetch: could not retrieve remote machine info.');
        return;
      }
      const ri = fetchRes.info;
      const hostLabel = `${Terminal.escapeHTML(remoteUser)}@${Terminal.escapeHTML(ri.name)}`;
      const separator = '─'.repeat(Math.min(hostLabel.replace(/<[^>]+>/g, '').length + 2, 30));
      info = [
        `<span class="c-green c-bold">${hostLabel}</span>`,
        `<span class="c-dim">${separator}</span>`,
        `<span class="c-purple">OS:</span>      <span class="c-dim">${Terminal.escapeHTML(ri.os || 'Unknown')}</span>`,
        `<span class="c-purple">Host:</span>    <span class="c-dim">${Terminal.escapeHTML(ri.host || 'Unknown')}</span>`,
        `<span class="c-purple">Kernel:</span>  <span class="c-dim">${Terminal.escapeHTML(ri.kernel || 'Unknown')}</span>`,
        `<span class="c-purple">Shell:</span>   <span class="c-dim">${Terminal.escapeHTML(ri.shell || 'Unknown')}</span>`,
        `<span class="c-purple">Resolution:</span><span class="c-dim">${Terminal.escapeHTML(ri.resolution || 'Unknown')}</span>`,
        `<span class="c-purple">DE:</span>      <span class="c-dim">${Terminal.escapeHTML(ri.de || 'None')}</span>`,
        `<span class="c-purple">Theme:</span>   <span class="c-dim">${Terminal.escapeHTML(ri.theme || 'default')}</span>`,
        `<span class="c-purple">Font:</span>    <span class="c-dim">${Terminal.escapeHTML(ri.font || 'Fixedsys')}</span>`,
        `<span class="c-purple">CPU:</span>     <span class="c-dim">${Terminal.escapeHTML(ri.cpu || 'Unknown')}</span>`,
        `<span class="c-purple">GPU:</span>     <span class="c-dim">${Terminal.escapeHTML(ri.gpu || 'None')}</span>`,
        `<span class="c-purple">Memory:</span>  <span class="c-dim">${Terminal.escapeHTML(ri.memory || 'Unknown')}</span>`,
        ``,
        ri.motd ? `<span class="c-teal">${Terminal.escapeHTML(ri.motd)}</span>` : ``,
        ``,
        `<span class="c-col0">██</span><span class="c-col1">██</span><span class="c-col2">██</span><span class="c-col3">██</span><span class="c-col4">██</span><span class="c-col5">██</span><span class="c-col6">██</span><span class="c-col7">██</span>`,
        `<span class="c-col8">██</span><span class="c-col9">██</span><span class="c-col10">██</span><span class="c-col11">██</span><span class="c-col12">██</span><span class="c-col13">██</span><span class="c-col14">██</span><span class="c-col15">██</span>`,
      ];
    } else {
      // ── Local machine fetch ───────────────────────────────
      const uptimeSec = Math.floor(performance.now() / 1000);
      const days = Math.floor(uptimeSec / 86400);
      const hours = Math.floor((uptimeSec % 86400) / 3600);
      const mins = Math.floor((uptimeSec % 3600) / 60);
      const secs = uptimeSec % 60;
      const uptimeStr = `${days > 0 ? days + 'd ' : ''}${hours > 0 ? hours + 'h ' : ''}${mins > 0 ? mins + 'm ' : ''}${secs}s`;

      const pkgCount = vfs.unlockedCommands.length;
      const res = `${window.screen.width}x${window.screen.height}`;
      const playerIP = window.playerIP || '255.0.0.1';

      info = [
        `<span class="c-green c-bold">${Terminal.escapeHTML(username)}@machine</span>`,
        `<span class="c-dim">${'─'.repeat(20)}</span>`,
        `<span class="c-purple">OS:</span>      <span class="c-dim">WebTermOS 1.0.0</span>`,
        `<span class="c-purple">Host:</span>    <span class="c-dim">WebTerm-vStation-9000</span>`,
        `<span class="c-purple">IP:</span>      <span class="c-dim">${playerIP}</span>`,
        `<span class="c-purple">Kernel:</span>  <span class="c-dim">Lain-OS 5.15.0-generic</span>`,
        `<span class="c-purple">Uptime:</span>  <span class="c-dim">${uptimeStr}</span>`,
        `<span class="c-purple">Packages:</span><span class="c-dim">${pkgCount} (installed)</span>`,
        `<span class="c-purple">Shell:</span>   <span class="c-dim">cybersh 2.4</span>`,
        `<span class="c-purple">Resolution:</span><span class="c-dim">${res}</span>`,
        `<span class="c-purple">DE:</span>      <span class="c-dim">None</span>`,
        `<span class="c-purple">Theme:</span>   <span class="c-dim">${Terminal.escapeHTML(theme.name)}</span>`,
        `<span class="c-purple">Font:</span>    <span class="c-dim">${Terminal.escapeHTML(theme.font?.family || 'Fixedsys')}</span>`,
        `<span class="c-purple">Caret:</span>   <span class="c-dim">${Terminal.getCaret()}</span>`,
        `<span class="c-purple">Terminal:</span><span class="c-dim">XTerm-Compatible-JS</span>`,
        `<span class="c-purple">CPU:</span>     <span class="c-dim">WebTerm vCPU @ 3.2GHz</span>`,
        `<span class="c-purple">GPU:</span>     <span class="c-dim">DOM-Canvas Virtual GPU</span>`,
        `<span class="c-purple">Memory:</span>  <span class="c-dim">32MB / 64MB</span>`,
        ``,
        `<span class="c-col0">██</span><span class="c-col1">██</span><span class="c-col2">██</span><span class="c-col3">██</span><span class="c-col4">██</span><span class="c-col5">██</span><span class="c-col6">██</span><span class="c-col7">██</span>`,
        `<span class="c-col8">██</span><span class="c-col9">██</span><span class="c-col10">██</span><span class="c-col11">██</span><span class="c-col12">██</span><span class="c-col13">██</span><span class="c-col14">██</span><span class="c-col15">██</span>`,
      ];
    }

    Terminal.printBlank();
    const lines = Math.max(paddedLogo.length, info.length);
    for (let i = 0; i < lines; i++) {
      const artLine = paddedLogo[i] || emptyLogoLine;
      const infoLine = info[i] || '';
      Terminal.printHTML(`<span class="c-purple ascii-art">${Terminal.escapeHTML(artLine)}</span>  ${infoLine}`, 'line-fetch');
    }
    Terminal.printBlank();
  }

  // ── man ────────────────────────────────────────────────────

  function cmdMan(args) {
    if (!args[0]) { Terminal.printError('man: what manual page do you want?'); return; }
    const manPages = {
      connect: 'connect <ip>\n\nEstablish a connection to a remote machine.\nOnce connected, commands like ls, cd, cat operate\non the remote file system. The remote machine\'s\ntheme is applied automatically.\n\nExamples:\n  connect 192.168.1.100\n  connect 10.0.0.42',
      bbs: 'bbs\n\nEnter the Bulletin Board System (BBS) chat.\nAll online users share the same chat room.\nType messages directly. Use /quit to exit.',
      echo: 'echo <text> [> file] [>> file]\n\nPrint text to the terminal.\nSupports output redirection:\n  echo Hello > newfile.txt   (write)\n  echo World >> newfile.txt  (append)',
      ls: 'ls [path]\n\nList directory contents.\nWorks on both local and remote file systems.',
      tree: 'tree [path]\n\nShow directory structure using box-drawing chars.\nDirectories sorted first, then files.\nWorks on both local and remote file systems.',
      cd: 'cd [path]\n\nChange the current working directory.\nSupports ~, .., and absolute paths.',
      cat: 'read <file>\n\nDisplay the contents of a file.',
      read: 'read <file>\n\nDisplay the contents of a file.',
      exec: 'exec <file.mod>\n\nExecute a modification file to unlock firmware capabilities.',
      theme: 'theme [name]\n\nWith no argument, lists all available themes.\nWith a name, switches to that theme.\nThemes define colors, font, caret, and logo.\nRemote machines auto-apply their corpo theme.',
      caret: 'caret [mode]\n\nWith no argument, lists all caret styles.\nWith a mode, switches the cursor style.\n\nModes:\n  block       Pulsing block █\n  underscore  Pulsing underscore _\n  ibeam       Thin I-beam │\n  matrix      Random cycling symbols',
      fetch: 'fetch\n\nDisplay system info alongside the current\ntheme\'s ASCII logo. Shows OS, host, shell,\nuptime, theme, font, caret, and color palette.',
      sec: 'sec <file> <password>\n\nSecures a file, renaming it to .vlt and preventing\nread and write operations until released.',
      rel: 'rel <file.vlt> <password>\n\nReleases a secured file, granting full access.'
    };
    const page = manPages[args[0].toLowerCase()];
    if (page) {
      Terminal.printBlank();
      Terminal.printHTML(`<span class="c-purple c-bold">MAN: ${Terminal.escapeHTML(args[0].toUpperCase())}</span>`);
      Terminal.printBlank();
      Terminal.printLines(page.split('\n'));
      Terminal.printBlank();
    } else {
      Terminal.printError(`man: no manual entry for '${args[0]}'`);
    }
  }

  // ── sec / rel ──────────────────────────────────────────────

  async function cmdSec(args) {
    if (args.length < 2) return Terminal.printError('sec: usage: sec <filename> <password>');
    const filename = args[0];
    const password = args[1];

    if (isRemote) {
      const resolved = resolveRemotePath(filename);
      const res = await Network.remoteSec(resolved, password);
      if (!res.success) return Terminal.printError(res.error);
      Terminal.printSuccess(`Secured ${filename} -> ${res.newName}`);
      updatePrompt();
    } else {
      const res = vfs.secFile(filename, password);
      if (res.error) return Terminal.printError(res.error);
      Terminal.printSuccess(`Secured ${filename} -> ${res.newName}`);
      updatePrompt();
    }
  }

  async function cmdRel(args) {
    if (args.length < 2) return Terminal.printError('rel: usage: rel <filename.vlt> <password>');
    const filename = args[0];
    const password = args[1];

    if (isRemote) {
      const resolved = resolveRemotePath(filename);
      const res = await Network.remoteRel(resolved, password);
      if (!res.success) return Terminal.printError(res.error);
      Terminal.printSuccess(`Released ${filename} -> original file`);
      updatePrompt();
    } else {
      const res = vfs.relFile(filename, password);
      if (res.error) return Terminal.printError(res.error);
      Terminal.printSuccess(`Released ${filename} -> original file`);
      updatePrompt();
    }
  }

  // ── logout ─────────────────────────────────────────────────

  function cmdLogout() {
    Terminal.printSystem('Logging out...');
    const driveJsonStr = localStorage.getItem(`webterm_drive_${username}`);
    if (driveJsonStr) {
      Terminal.printInfo('Preparing savefile... Download should start automatically.');
      Boot.downloadDrive(username, driveJsonStr);
    }
    Terminal.disableInput();
    setTimeout(() => { location.reload(); }, 1200);
  }

  // ── debug ──────────────────────────────────────────────────

  async function cmdDebug() {
    const allCommands = [
      'help', 'clear', 'echo', 'ls', 'tree', 'cd', 'read', 'exec', 'pwd',
      'mkdir', 'touch', 'rm', 'whoami', 'hostname', 'date', 'uptime',
      'uname', 'connect', 'disconnect', 'ssh', 'hosts', 'bbs', 'chat',
      'who', 'theme', 'caret', 'exit', 'fetch', 'man', 'sec', 'rel'
    ];

    let unlockedCount = 0;
    for (const c of allCommands) {
      if (!vfs.unlockedCommands.includes(c)) {
        vfs.unlockedCommands.push(c);
        unlockedCount++;
      }
    }

    Terminal.printSystem('System override in progress...');
    await Terminal.printProgress('Bypassing security protocols', 1000, 30);

    if (unlockedCount > 0) {
      saveUnlockedCommands();
      Terminal.printSuccess(`[++] Debug mode active. ${unlockedCount} new commands unlocked.`);
    } else {
      Terminal.printInfo('Debug mode active. All commands were already unlocked.');
    }
    Terminal.printBlank();
  }

  // ── Prompt Update ──────────────────────────────────────────

  function updatePrompt() {
    if (bbsMode) {
      Terminal.setPrompt(`[BBS] ${username}> `);
      return;
    }
    if (isRemote) {
      const rUser = remoteUser || '?';
      const symbol = (rUser === 'root') ? '#' : '$';
      Terminal.setPrompt(`${rUser}@${remoteName}:${remoteCwd}${symbol} `);
    } else {
      Terminal.setPrompt(vfs.getPrompt());
    }
  }

  // ── Autocomplete ───────────────────────────────────────────

  async function autocomplete(input) {
    if (bbsMode) return input; // No autocomplete in BBS

    const trimmed = input.trimStart();
    const leadingSpaces = input.length - trimmed.length;
    const { cmd, args } = parse(trimmed);

    // Are we autocompleting the first word (command)?
    const isCommandPos = args.length === 0 && !trimmed.endsWith(' ');

    function findCommonPrefix(words) {
      if (!words || !words.length) return '';
      let prefix = words[0];
      for (let i = 1; i < words.length; i++) {
        while (words[i].indexOf(prefix) !== 0) {
          prefix = prefix.substring(0, prefix.length - 1);
          if (!prefix) return '';
        }
      }
      return prefix;
    }

    if (isCommandPos) {
      const cmds = ['help', 'clear', 'echo', 'ls', 'tree', 'cd', 'read', 'exec', 'pwd', 'mkdir', 'touch',
        'whoami', 'hostname', 'date', 'uptime', 'uname', 'connect', 'disconnect', 'ssh',
        'hosts', 'bbs', 'chat', 'who', 'theme', 'caret', 'exit', 'fetch', 'man'];
      const matches = cmds.filter(c => c.startsWith(cmd || ''));
      if (matches.length === 1) return input.substring(0, leadingSpaces) + matches[0] + ' ';
      if (matches.length > 1) return input.substring(0, leadingSpaces) + findCommonPrefix(matches);
      return input;
    }

    // Autocompleting a file/path argument
    const lastWordIdx = input.lastIndexOf(' ') + 1;
    let searchPath = input.substring(lastWordIdx);

    // Strip quotes if any (basic support)
    const hasQuote = searchPath.startsWith('"');
    if (hasQuote) searchPath = searchPath.substring(1);

    let dirPath = '.';
    let targetFilter = searchPath;
    const lastSlash = searchPath.lastIndexOf('/');
    if (lastSlash >= 0) {
      dirPath = searchPath.substring(0, lastSlash) || '/';
      targetFilter = searchPath.substring(lastSlash + 1);
    }

    let entries = [];
    if (isRemote) {
      const resolved = resolveRemotePath(dirPath);
      const res = await Network.remoteLs(resolved);
      if (res.success && res.children) entries = res.children;
    } else {
      const result = vfs.ls(dirPath);
      if (!result.error && result.children) entries = result.children;
    }

    const matches = entries.filter(e => e.startsWith(targetFilter));

    if (matches.length === 1) {
      let isDir = false;
      const matchPath = dirPath === '/' ? '/' + matches[0] : (dirPath === '.' ? matches[0] : dirPath + '/' + matches[0]);

      if (isRemote) {
        const stat = await Network.remoteStat(resolveRemotePath(matchPath));
        if (stat.success && stat.type === 'dir') isDir = true;
      } else {
        const node = vfs.getNode(vfs.resolve(matchPath));
        if (node && node.type === 'dir') isDir = true;
      }

      const replaceStr = matches[0] + (isDir ? '/' : (hasQuote ? '" ' : ' '));
      const prefixPath = lastSlash >= 0 ? searchPath.substring(0, lastSlash + 1) : '';
      return input.substring(0, lastWordIdx) + (hasQuote ? '"' : '') + prefixPath + replaceStr;
    }

    if (matches.length > 1) {
      const prefixStr = findCommonPrefix(matches);
      const prefixPath = lastSlash >= 0 ? searchPath.substring(0, lastSlash + 1) : '';
      return input.substring(0, lastWordIdx) + (hasQuote ? '"' : '') + prefixPath + prefixStr;
    }

    return input;
  }

  return { init, execute, updatePrompt, parse, autocomplete };
})();
