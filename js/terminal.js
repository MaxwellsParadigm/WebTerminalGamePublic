/* ============================================================
   Terminal — DOM-based terminal emulator core
   ============================================================ */
window.Terminal = (() => {
    const outputEl = document.getElementById('terminal-output');
    const inputEl = document.getElementById('terminal-input');
    const promptEl = document.getElementById('prompt');
    const cursorEl = document.getElementById('cursor-block');
    const visualBefore = document.getElementById('input-visual-before');
    const visualAfter = document.getElementById('input-visual-after');
    const headerTitle = document.getElementById('header-title');
    const headerStatus = document.getElementById('header-status');
    let commandHistory = [];
    let historyIndex = -1;
    let onCommandCallback = null;
    let inputEnabled = true;
    let currentPrompt = '> ';
    let promptEchoEnabled = true;
    // ── Caret System ──────────────────────────────────────────
    const CARET_CHARS = {
        block: '█',
        underscore: '_',
        ibeam: '│',
        matrix: '█',  // will be overwritten dynamically
    };
    const MATRIX_CHARS = '█▓▒░╬╠╣╦╩├┤┬┴┼▀▄■□▪▫●○◆◇★☆♦♣♠♥@#$%&?!<>{}[]~^';
    let currentCaret = 'block';
    let matrixInterval = null;
    function updateVisualInput() {
        if (!inputEl) return;
        const val = inputEl.value;
        const pos = inputEl.selectionStart !== null ? inputEl.selectionStart : val.length;
        
        if (visualBefore) visualBefore.textContent = val.substring(0, pos);
        
        const currentChar = val.substring(pos, pos + 1);
        if (visualAfter) visualAfter.textContent = val.substring(pos + 1);
        
        if (currentCaret !== 'matrix') {
            cursorEl.textContent = currentChar === '' ? '\u00A0' : currentChar;
        }
    }

    function setCaret(mode) {
        const valid = ['block', 'underscore', 'ibeam', 'matrix'];
        if (!valid.includes(mode)) return false;
        // Stop matrix animation if running
        if (matrixInterval) {
            clearInterval(matrixInterval);
            matrixInterval = null;
        }
        currentCaret = mode;
        // Remove all caret classes
        cursorEl.className = '';
        cursorEl.classList.add(`caret-${mode}`);
        if (mode === 'matrix') {
            // Start matrix animation
            cursorEl.textContent = '█';
            matrixInterval = setInterval(() => {
                cursorEl.textContent = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
            }, 60);
        }
        updateVisualInput();
        return true;
    }
    function getCaret() {
        return currentCaret;
    }
    function getCaretModes() {
        return ['block', 'underscore', 'ibeam', 'matrix'];
    }
    // Initialize default caret
    setCaret('block');
    // --- Output ---
    function print(text, className = '') {
        const line = document.createElement('div');
        line.className = `line ${className} line-animate`.trim();
        line.textContent = text;
        outputEl.appendChild(line);
        scrollToBottom();
    }
    function printHTML(html, className = '') {
        const line = document.createElement('div');
        line.className = `line ${className} line-animate`.trim();
        line.innerHTML = html;
        outputEl.appendChild(line);
        scrollToBottom();
    }
    function printLines(lines, className = '') {
        for (const l of lines) {
            print(l, className);
        }
    }
    function printError(text) { print(text, 'line-error'); }
    function printInfo(text) { print(text, 'line-info'); }
    function printWarn(text) { print(text, 'line-warn'); }
    function printSuccess(text) { print(text, 'line-success'); }
    function printSystem(text) { print(text, 'line-system'); }
    function printDim(text) { print(text, 'line-dim'); }
    function printPromptEcho(prompt, cmd) {
        const line = document.createElement('div');
        line.className = 'line line-prompt-echo';
        line.innerHTML = `<span class="prompt-part">${escapeHTML(prompt)}</span><span class="cmd-part">${escapeHTML(cmd)}</span>`;
        outputEl.appendChild(line);
        scrollToBottom();
    }
    function printBlank() {
        print('');
    }
    function clear() {
        outputEl.innerHTML = '';
    }
    function scrollToBottom() {
        requestAnimationFrame(() => {
            outputEl.scrollTop = outputEl.scrollHeight;
        });
    }
    // --- Prompt ---
    function setPrompt(promptStr) {
        currentPrompt = promptStr;
        promptEl.textContent = promptStr;
    }
    function getPrompt() {
        return currentPrompt;
    }
    // --- Header ---
    function setTitle(title) {
        headerTitle.textContent = title;
    }
    function setStatus(status) {
        headerStatus.textContent = status;
    }
    function setTimer(text, className = '') {
        const timerEl = document.getElementById('header-timer');
        if (!timerEl) return;
        timerEl.textContent = text;
        timerEl.className = className;
    }
    // --- Input ---
    function enableInput() {
        inputEnabled = true;
        inputEl.disabled = false;
        inputEl.focus();
        document.getElementById('terminal-input-line').classList.remove('hidden');
    }
    function disableInput() {
        inputEnabled = false;
        inputEl.disabled = true;
        document.getElementById('terminal-input-line').classList.add('hidden');
    }
    function focusInput() {
        inputEl.focus();
    }
    function onCommand(cb) {
        onCommandCallback = cb;
    }
    function getCurrentCommandCallback() {
        return onCommandCallback;
    }
    
    // --- Visual Input Events ---
    inputEl.addEventListener('input', updateVisualInput);
    inputEl.addEventListener('click', updateVisualInput);
    inputEl.addEventListener('keyup', updateVisualInput);
    document.addEventListener('selectionchange', () => {
        if (document.activeElement === inputEl) {
            updateVisualInput();
        }
    });
    // --- Typing Effect ---
    function typeText(text, className = '', speed = 20) {
        return new Promise((resolve) => {
            const line = document.createElement('div');
            line.className = `line ${className}`.trim();
            outputEl.appendChild(line);
            let i = 0;
            function tick() {
                if (i < text.length) {
                    line.textContent += text[i];
                    i++;
                    scrollToBottom();
                    setTimeout(tick, speed);
                } else {
                    resolve();
                }
            }
            tick();
        });
    }
    function delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    // --- Progress Bar ---
    function printProgress(label, duration = 1000, width = 30) {
        return new Promise((resolve) => {
            const line = document.createElement('div');
            line.className = 'line';
            outputEl.appendChild(line);
            let filled = 0;
            const step = duration / width;
            function tick() {
                filled++;
                const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
                const pct = Math.round((filled / width) * 100);
                line.innerHTML = `<span class="c-dim">${escapeHTML(label)}</span> <span class="progress-bar">[${bar}]</span> <span class="c-dim">${pct}%</span>`;
                scrollToBottom();
                if (filled < width) {
                    setTimeout(tick, step);
                } else {
                    resolve();
                }
            }
            tick();
        });
    }
    // --- Helpers ---
    function escapeHTML(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
    // --- Keyboard Handling ---
    inputEl.addEventListener('keydown', (e) => {
        if (!inputEnabled) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            const cmd = inputEl.value;
            inputEl.value = '';
            if (cmd.trim()) {
                commandHistory.push(cmd);
            }
            historyIndex = commandHistory.length;
            if (promptEchoEnabled) {
                printPromptEcho(currentPrompt, cmd);
            }
            if (onCommandCallback) {
                onCommandCallback(cmd);
            }
            updateVisualInput();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (window.Commands && window.Commands.autocomplete) {
                window.Commands.autocomplete(inputEl.value).then(newVal => {
                    if (newVal && newVal !== inputEl.value) {
                        inputEl.value = newVal;
                        updateVisualInput();
                    }
                }).catch(err => {
                    console.error('Autocomplete error:', err);
                });
            }
            return;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                inputEl.value = commandHistory[historyIndex] || '';
                updateVisualInput();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                inputEl.value = commandHistory[historyIndex] || '';
            } else {
                historyIndex = commandHistory.length;
                inputEl.value = '';
            }
            updateVisualInput();
        } else if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            clear();
        }
        
        setTimeout(updateVisualInput, 0); // ensure layout updates
    });
    // Focus input when clicking anywhere on terminal
    document.addEventListener('click', () => {
        if (inputEnabled) {
            // Only focus if they aren't selecting text
            if (window.getSelection().toString() === '') {
                inputEl.focus();
            }
        }
    });

    // Also focus on window focus (switching tabs/windows)
    window.addEventListener('focus', () => {
        if (inputEnabled) inputEl.focus();
    });
    function setPromptEchoEnabled(val) {
        promptEchoEnabled = val;
    }
    return {
        print, printHTML, printLines,
        printError, printInfo, printWarn, printSuccess, printSystem, printDim,
        printPromptEcho, printBlank, clear,
        setPrompt, getPrompt,
        setTitle, setStatus, setTimer,
        enableInput, disableInput, focusInput,
        onCommand, getCurrentCommandCallback, setPromptEchoEnabled,
        setCaret, getCaret, getCaretModes,
        typeText, delay, printProgress,
        escapeHTML, scrollToBottom
    };
})();