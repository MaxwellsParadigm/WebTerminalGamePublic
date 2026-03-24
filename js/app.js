/* ============================================================
   App — Main application orchestrator
   ============================================================ */

(async () => {
  // Initialize theme system
  Themes.apply('catppuccin');
  Terminal.setCaret(Themes.get('catppuccin').caret || 'block');

  // Initialize network
  Network.init();

  // Run boot sequence + auth
  const username = await Boot.run();

  // Initialize local VFS with state loaded during Boot
  const vfs = new VFS.VirtualFS(username, window.vfsInitialState, window.unlockedCommands);

  // Hook up auto-save
  window.addEventListener('vfs:save_req', async (e) => {
    const state = e.detail.vfsState;
    const pwd = Boot.getSessionPassword();
    const driveJsonStr = localStorage.getItem(`webterm_drive_${username}`);
    if (driveJsonStr && pwd) {
      try {
        const driveData = JSON.parse(driveJsonStr);
        // Server encrypts the updated state using their salt
        const res = await Network.saveDrive(username, pwd, e.detail.vfsState, e.detail.unlockedCommands, driveData.salt);
        if (res && res.success) {
          localStorage.setItem(`webterm_drive_${username}`, JSON.stringify(res.driveData));
        }
      } catch (err) {
        Terminal.printError('Auto-save failed.');
      }
    }
  });

  // Initialize commands
  Commands.init(vfs, username);

  // Post-login message
  Terminal.printBlank();
  Terminal.printSystem('────────────────────────────────────────');
  Terminal.printHTML(`  <span class="c-purple">Session started for</span> <span class="c-green c-bold">${Terminal.escapeHTML(username)}</span>`);
  Terminal.printSystem('────────────────────────────────────────');
  Terminal.printBlank();
  Terminal.printDim('Type "help" for a list of available commands.');
  //Terminal.printDim('Type "hosts" to see available remote machines.');
  //Terminal.printDim('Type "bbs" to enter the Bulletin Board chat.');
  Terminal.printBlank();

  // Set prompt and title
  Commands.updatePrompt();
  Terminal.setTitle('WebTerm v1.0');
  Terminal.setStatus(`● ${username}`);

  // Main command loop
  Terminal.onCommand(async (input) => {
    Terminal.disableInput();
    try {
      await Commands.execute(input);
    } catch (err) {
      Terminal.printError(`Runtime error: ${err.message}`);
    }
    Terminal.enableInput();
    Terminal.focusInput();
  });

  Terminal.enableInput();
  Terminal.focusInput();
})();
