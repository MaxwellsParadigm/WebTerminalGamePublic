/* ============================================================
   Boot — "Machine boot" sequence + login/registration flow
   ============================================================ */

window.Boot = (() => {

  const LOGO = [
    '██╗    ██╗███████╗██████╗ ████████╗███████╗██████╗ ███╗   ███╗',
    '██║    ██║██╔════╝██╔══██╗╚══██╔══╝██╔════╝██╔══██╗████╗ ████║',
    '██║ █╗ ██║█████╗  ██████╔╝   ██║   █████╗  ██████╔╝██╔████╔██║',
    '██║███╗██║██╔══╝  ██╔══██╗   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║',
    '╚███╔███╔╝███████╗██████╔╝   ██║   ███████╗██║  ██║██║ ╚═╝ ██║',
    ' ╚══╝╚══╝ ╚══════╝╚═════╝    ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝',
  ];

  async function run() {
    Terminal.disableInput();
    Terminal.setTitle('WebTerm // BOOT');

    // Wipe old test users
    if (!localStorage.getItem('old_users_wiped')) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('webterm_drive_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('old_users_wiped', 'true');
    }

    // Initialize drop listeners
    setupDragAndDrop();

    return await promptDriveState();
  }

  let sessionPassword = '';

  async function runBiosBoot() {
    Terminal.printBlank();
    Terminal.printDim('WebTerm BIOS v1.0');
    Terminal.printDim('Copyright (c) 2026 WebTerm Corp.');
    Terminal.printBlank();
    await Terminal.delay(300);

    await Terminal.typeText('Checking memory... ', 'line-dim', 15);
    await Terminal.delay(150);
    Terminal.print('32768 KB OK', 'line-success');
    await Terminal.delay(200);

    const hwItems = [
      ['CPU', 'WebTerm vCPU @ 3.2 GHz'],
      ['Network', 'Socket.IO Adapter v4.x'],
      ['Display', 'DOM Renderer 960x∞'],
      ['Storage', 'VFS Module v1.0'],
      ['Crypto Module', 'ROT13 / Base64 (basic)'],
    ];

    for (const [label, val] of hwItems) {
      Terminal.printHTML(`  <span class="c-dim">${Terminal.escapeHTML(label.padEnd(18))}</span><span class="c-green">${Terminal.escapeHTML(val)}</span>`);
      await Terminal.delay(120);
    }

    Terminal.printBlank();
    await Terminal.printProgress('Loading kernel', 600, 30);
    await Terminal.delay(100);
    await Terminal.printProgress('Initializing network', 400, 30);
    await Terminal.delay(100);
    await Terminal.printProgress('Mounting file systems', 500, 30);
    Terminal.printBlank();

    Terminal.printSuccess('All systems nominal.');
    Terminal.printBlank();
    await Terminal.delay(400);

    for (const line of LOGO) {
      Terminal.print(line, 'line-ascii');
    }
    Terminal.printBlank();
    Terminal.printHTML('<span class="c-dim">  Multiplayer Terminal Puzzle Game — v1.0</span>');
    Terminal.printBlank();
    await Terminal.delay(300);
  }

  async function promptDriveState() {
    const overlay = document.getElementById('drive-overlay');
    const noDriveBtn = document.getElementById('btn-no-drive');

    Terminal.clear();
    overlay.classList.remove('hidden-overlay');

    return new Promise((resolve) => {
      // Handle "I DO NOT HAVE A DRIVE"
      const onNoDrive = async () => {
        overlay.classList.add('hidden-overlay');
        noDriveBtn.removeEventListener('click', onNoDrive);
        window.removeEventListener('vfs:drive_dropped', onDriveDropped);
        window.removeEventListener('keydown', onKeyDown);

        await registerFlow();

        overlay.classList.remove('hidden-overlay');
        Terminal.clear();
        return promptDriveState().then(resolve);
      };
      noDriveBtn.addEventListener('click', onNoDrive);

      // Handle 'q' for Debug Playground
      const onKeyDown = async (e) => {
        if (e.key.toLowerCase() === 'q') {
          overlay.classList.add('hidden-overlay');
          noDriveBtn.removeEventListener('click', onNoDrive);
          window.removeEventListener('vfs:drive_dropped', onDriveDropped);
          window.removeEventListener('keydown', onKeyDown);

          Terminal.clear();
          Terminal.printSystem('Initializing debugging playground...');
          await Terminal.delay(500);

          window.vfsInitialState = {
            '/': { type: 'dir', children: ['sys'] },
            '/sys': { type: 'dir', children: ['machine.info', 'users.info', 'permissions.info'] },
            '/sys/machine.info': { type: 'file', content: '' },
            '/sys/users.info': { type: 'file', content: 'debug_user:\n' },
            '/sys/permissions.info': { type: 'file', content: '' },
          };
          window.unlockedCommands = [
            'help', 'clear', 'echo', 'ls', 'tree', 'cd', 'read', 'exec', 'pwd', 
            'mkdir', 'touch', 'rm', 'whoami', 'hostname', 'date', 'uptime', 
            'uname', 'connect', 'disconnect', 'ssh', 'hosts', 'bbs', 'chat', 
            'who', 'theme', 'caret', 'exit', 'fetch', 'man', 'sec', 'rel'
          ];
          
          const res = await Network.debugLogin();
          window.playerIP = res.ip;
          resolve('debug_user');
        }
      };
      window.addEventListener('keydown', onKeyDown);

      // Handle File Drop
      const onDriveDropped = async (e) => {
        const { driveData } = e.detail;

        overlay.classList.add('hidden-overlay');
        noDriveBtn.removeEventListener('click', onNoDrive);
        window.removeEventListener('vfs:drive_dropped', onDriveDropped);
        window.removeEventListener('keydown', onKeyDown);

        Terminal.clear();
        await runBiosBoot();

        Terminal.printBlank();
        Terminal.printSuccess(`Drive detected. Initializing decryption...`);
        Terminal.printSystem('── Login ──');

        const password = await promptInput(`Enter decryption code: `, 'auth:pass> ');
        if (!password) {
          Terminal.printError('Cancelled.');
          await Terminal.delay(1000);
          return promptDriveState().then(resolve);
        }

        Terminal.disableInput();
        await Terminal.delay(300);

        const res = await Network.login(password, driveData);
        if (!res.success) {
          Terminal.printError(res.error);
          await Terminal.delay(1500);
          return promptDriveState().then(resolve);
        }
        const username = res.username;
        localStorage.setItem(`webterm_drive_${username}`, JSON.stringify(driveData));
        sessionPassword = password;
        window.vfsInitialState = res.vfsState;
        window.unlockedCommands = res.unlockedCommands;
        window.playerIP = res.ip;

        Terminal.printBlank();
        Terminal.printSuccess(`Welcome back, ${res.username}.`);
        await Terminal.delay(300);
        Terminal.enableInput();
        resolve(res.username);
      };
      window.addEventListener('vfs:drive_dropped', onDriveDropped);
    });
  }

  let dragDropSetup = false;
  function setupDragAndDrop() {
    if (dragDropSetup) return;
    dragDropSetup = true;
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

    document.body.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    }, false);
  }

  function handleFile(file) {
    if (!file.name.endsWith('.drv')) {
      Terminal.printError('Invalid file type. Please drop a valid .drv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const driveData = JSON.parse(e.target.result);
        if (!driveData.salt || !driveData.iv || !driveData.data) throw new Error('Invalid format');
        window.dispatchEvent(new CustomEvent('vfs:drive_dropped', { detail: { driveData } }));
      } catch (err) {
        Terminal.printError('Corrupted drive file: failed to parse.');
      }
    };
    reader.readAsText(file);
  }

  async function registerFlow() {
    Terminal.printBlank();
    Terminal.printSystem('── New Account ──');

    const username = await promptInput('Choose username: ', 'register:user> ');
    if (!username) { Terminal.printError('Cancelled.'); await Terminal.delay(1000); return null; }
    const password = await promptInput('Choose password: ', 'register:pass> ');
    if (!password) { Terminal.printError('Cancelled.'); await Terminal.delay(1000); return null; }

    Terminal.disableInput();
    await Terminal.delay(300);

    // Server loads initial VFS from data/initial_vfs.json and returns it
    const res = await Network.register(username, password);
    if (!res.success) {
      Terminal.printError(res.error);
      await Terminal.delay(1500);
      return null;
    }

    localStorage.setItem(`webterm_drive_${res.username}`, JSON.stringify(res.driveData));
    sessionPassword = password;
    window.vfsInitialState = res.vfsState;
    window.unlockedCommands = ['help', 'ls', 'exec'];
    window.playerIP = res.ip;

    downloadDrive(res.username, JSON.stringify(res.driveData));

    Terminal.printBlank();
    Terminal.printSuccess(`Account created. Drive downloaded! Please insert it (drag and drop) to boot up.`);
    await Terminal.delay(2000);
    return res.username;
  }

  function downloadDrive(username, driveJsonStr) {
    const blob = new Blob([driveJsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${username}_drive.drv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function promptInput(label, promptStr) {
    return new Promise((resolve) => {
      Terminal.printDim(label);
      Terminal.setPrompt(promptStr);
      Terminal.enableInput();
      Terminal.onCommand((input) => {
        Terminal.onCommand(null);
        resolve(input.trim());
      });
    });
  }

  function getSessionPassword() {
    return sessionPassword;
  }

  return { run, getSessionPassword, downloadDrive };
})();
