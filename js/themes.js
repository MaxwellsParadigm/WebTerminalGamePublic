window.Themes = (() => {
    let activeThemeId = 'catppuccin';
    let loadedFonts = new Set(['JetBrains+Mono:wght@300;400;500;700']);

    // ── Semantic Mapping ───────────────────────────────────────
    // Maps roles to ANSI color indices (0-15)
    const SemanticMapping = {
        prompt: 'color10',  // Bright Green
        error: 'color9',    // Bright Red
        info: 'color12',   // Bright Blue
        warn: 'color11',   // Bright Yellow
        success: 'color10', // Bright Green
        system: 'color13', // Bright Magenta
        chat: 'color14',    // Bright Cyan
    };

    // ── Theme Definitions ──────────────────────────────────────

    const registry = {
        catppuccin: {
            id: 'catppuccin',
            name: 'Catppuccin Frappe',
            colors: {
                bg: '#303446',
                fg: '#c6d0f5',
                cursor: '#f2d5cf',
                color0: '#51576d', // Black
                color1: '#e78284', // Red
                color2: '#a6d189', // Green
                color3: '#e5c890', // Yellow
                color4: '#8caaee', // Blue
                color5: '#f4b8e4', // Magenta
                color6: '#81c8be', // Cyan
                color7: '#b5bfe2', // White
                color8: '#626880', // Bright Black
                color9: '#e78284', // Bright Red
                color10: '#a6d189', // Bright Green
                color11: '#e5c890', // Bright Yellow
                color12: '#8caaee', // Bright Blue
                color13: '#f4b8e4', // Bright Magenta
                color14: '#81c8be', // Bright Cyan
                color15: '#a5adce', // Bright White
            },
            font: { family: 'JetBrains Mono', googleImport: 'JetBrains+Mono:wght@300;400;500;700' },
            caret: 'block',
            logo: [
                '                    ██    ██                    ',
                '               █████        █████               ',
                '            ███                  ███            ',
                '          ███    ██████████████    ███          ',
                '        ███   ████            ████   ███        ',
                '      ███   ███    ██████████    ███   ███      ',
                '    ███    ██    ███        ███    ███   ███    ',
                '  ███    ██    ███    ████           ███   ███  ',
                ' ██    ██    ███    ██    ██          ███    ██ ',
                '   ████    ███     ██      ██       ███    ██   ',
                '   ██    ███       ██      ██     ███    ████   ',
                ' ██    ███          ██    ██    ███    ███   ██ ',
                '  ███    ██           ████    ███    ███   ███  ',
                '    ███   ███    ███        ███    ███   ███    ',
                '      ███   ███    ██████████    ███   ███      ',
                '        ███   ████            ████   ███        ',
                '          ███    ██████████████    ███          ',
                '            ███                  ███            ',
                '               █████        █████               ',
                '                    ██    ██                    ',
            ],
        },

        neocorp: {
            id: 'neocorp',
            name: 'NeoCorp Industrial',
            colors: {
                bg: '#1a1410',
                fg: '#e8d5b5',
                cursor: '#fe8019',
                color0: '#282828',
                color1: '#cc241d',
                color2: '#98971a',
                color3: '#d79921',
                color4: '#458588',
                color5: '#b16286',
                color6: '#689d6a',
                color7: '#a89984',
                color8: '#928374',
                color9: '#fb4934',
                color10: '#b8bb26',
                color11: '#fabd2f',
                color12: '#83a598',
                color13: '#d3869b',
                color14: '#8ec07c',
                color15: '#ebdbb2',
            },
            font: { family: 'Fira Code', googleImport: 'Fira+Code:wght@300;400;500;700' },
            caret: 'underscore',
            logo: [
                ' ███╗   ██╗███████╗ ██████╗ ',
                ' ████╗  ██║██╔════╝██╔═══██╗',
                ' ██╔██╗ ██║█████╗  ██║   ██║',
                ' ██║╚██╗██║██╔══╝  ██║   ██║',
                ' ██║ ╚████║███████╗╚██████╔╝',
                ' ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ',
                '   C  O  R  P                ',
                '                             ',
            ],
        },

        sigmalabs: {
            id: 'sigmalabs',
            name: 'Sigma Labs Research',
            colors: {
                bg: '#0d1117',
                fg: '#c5d1de',
                cursor: '#58a6ff',
                color0: '#484f58',
                color1: '#f85149',
                color2: '#3fb950',
                color3: '#d29922',
                color4: '#58a6ff',
                color5: '#bc8cff',
                color6: '#39d353',
                color7: '#b1bac4',
                color8: '#6e7681',
                color9: '#ff7b72',
                color10: '#56d364',
                color11: '#e3b341',
                color12: '#79c0ff',
                color13: '#d2a8ff',
                color14: '#56d4dd',
                color15: '#ffffff',
            },
            font: { family: 'IBM Plex Mono', googleImport: 'IBM+Plex+Mono:wght@300;400;500;700' },
            caret: 'ibeam',
            logo: [
                '  ███████╗██╗ ██████╗ ',
                '  ██╔════╝██║██╔════╝ ',
                '  ███████╗██║██║  ███╗',
                '  ╚════██║██║██║   ██║',
                '  ███████║██║╚██████╔╝',
                '  ╚══════╝╚═╝ ╚═════╝ ',
                '   L  A  B  S         ',
                '                      ',
            ],
        },

        helsec: {
            id: 'helsec',
            name: 'Helix Security',
            colors: {
                bg: '#7a251e',
                fg: '#d7c9a7',
                cursor: '#ffffff',
                color0: '#000000',
                color1: '#ff3f00',
                color2: '#00bb00',
                color3: '#e7b000',
                color4: '#0072ff',
                color5: '#bb00bb',
                color6: '#00bbbb',
                color7: '#bbbbbb',
                color8: '#555555',
                color9: '#bb0000',
                color10: '#00bb00',
                color11: '#e7b000',
                color12: '#0072ae',
                color13: '#ff55ff',
                color14: '#55ffff',
                color15: '#ffffff',
            },
            font: { family: 'IBM Plex Mono', googleImport: 'IBM+Plex+Mono:wght@300;400;500;700' },
            caret: 'ibeam',
            logo: [
                '                    ██    ██                    ',
                '               █████        █████               ',
                '            ███                  ███            ',
                '          ███    ██████████████    ███          ',
                '        ███   ████            ████   ███        ',
                '      ███   ███    ██████████    ███   ███      ',
                '    ███    ██    ███        ███    ███   ███    ',
                '  ███    ██    ███    ████           ███   ███  ',
                ' ██    ██    ███    ██    ██          ███    ██ ',
                '   ████    ███     ██      ██       ███    ██   ',
                '   ██    ███       ██      ██     ███    ████   ',
                ' ██    ███          ██    ██    ███    ███   ██ ',
                '  ███    ██           ████    ███    ███   ███  ',
                '    ███   ███    ███        ███    ███   ███    ',
                '      ███   ███    ██████████    ███   ███      ',
                '        ███   ████            ████   ███        ',
                '          ███    ██████████████    ███          ',
                '            ███                  ███            ',
                '               █████        █████               ',
                '                    ██    ██                    ',
            ],
        },
    };

    // ── Color Utilities ───────────────────────────────────────

    function hexToHSL(hex) {
        let r = parseInt(hex.slice(1, 3), 16) / 255;
        let g = parseInt(hex.slice(3, 5), 16) / 255;
        let b = parseInt(hex.slice(5, 7), 16) / 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; }
        else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    function hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    function adjustLightness(hex, amount) {
        const hsl = hexToHSL(hex);
        // If it's a light theme, we darken for mantle/surface/overlay
        // But for dark themes we usually lighten surface/overlay and darken mantle
        // Let's use a simpler logic: mangle is darker, surface/overlay are lighter (or vice versa if light)
        const isDark = hsl.l < 50;
        let newL = isDark ? hsl.l + amount : hsl.l - amount;
        return hslToHex(hsl.h, hsl.s, Math.max(0, Math.min(100, newL)));
    }

    // ── Apply Theme ────────────────────────────────────────────

    function apply(themeId) {
        const theme = registry[themeId];
        if (!theme) {
            console.warn(`Theme "${themeId}" not found, falling back to catppuccin.`);
            return apply('catppuccin');
        }

        const root = document.documentElement.style;

        // Apply core colors and ANSI colors
        root.setProperty('--bg-base', theme.colors.bg);
        root.setProperty('--text', theme.colors.fg);
        root.setProperty('--cursor-color', theme.colors.cursor);

        for (let i = 0; i < 16; i++) {
            root.setProperty(`--color${i}`, theme.colors[`color${i}`]);
        }

        // Algorithmically derive background shades
        const hsl = hexToHSL(theme.colors.bg);
        const isDark = hsl.l < 50;

        // Mantle is always deeper than base
        root.setProperty('--bg-mantle', hslToHex(hsl.h, hsl.s, Math.max(0, isDark ? hsl.l - 4 : hsl.l + 4)));
        // Surface and Overlay are "higher" (lighter in dark theme, darker in light theme)
        root.setProperty('--bg-surface', hslToHex(hsl.h, hsl.s, Math.max(0, isDark ? hsl.l + 4 : hsl.l - 4)));
        root.setProperty('--bg-overlay', hslToHex(hsl.h, hsl.s, Math.max(0, isDark ? hsl.l + 10 : hsl.l - 10)));

        // Algorithmically derive text shades
        root.setProperty('--text-dim', `rgba(${parseInt(theme.colors.fg.slice(1, 3), 16)}, ${parseInt(theme.colors.fg.slice(3, 5), 16)}, ${parseInt(theme.colors.fg.slice(5, 7), 16)}, 0.5)`);
        root.setProperty('--text-subtle', `rgba(${parseInt(theme.colors.fg.slice(1, 3), 16)}, ${parseInt(theme.colors.fg.slice(3, 5), 16)}, ${parseInt(theme.colors.fg.slice(5, 7), 16)}, 0.7)`);

        // Apply Semantic Mappings
        for (const [role, colorKey] of Object.entries(SemanticMapping)) {
            const hex = theme.colors[colorKey];
            root.setProperty(`--${role}-color`, hex);
        }

        // Recompute glow based on prompt color (which is color10)
        const promptHex = theme.colors[SemanticMapping.prompt];
        const r = parseInt(promptHex.slice(1, 3), 16);
        const g = parseInt(promptHex.slice(3, 5), 16);
        const b = parseInt(promptHex.slice(5, 7), 16);
        root.setProperty('--glow-prompt', `0 0 8px rgba(${r}, ${g}, ${b}, 0.3)`);

        // Apply font
        if (theme.font) {
            loadFont(theme.font.googleImport);
            root.setProperty('--font-mono', `'${theme.font.family}', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace`);
        }

        activeThemeId = themeId;
    }

    function loadFont(googleImport) {
        if (loadedFonts.has(googleImport)) return;
        loadedFonts.add(googleImport);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${googleImport}&display=swap`;
        document.head.appendChild(link);
    }

    function get(themeId) { return registry[themeId] || null; }
    function current() { return registry[activeThemeId]; }
    function currentId() { return activeThemeId; }
    function list() { return Object.values(registry).map(t => ({ id: t.id, name: t.name })); }
    function register(theme) { if (theme && theme.id) registry[theme.id] = theme; }

    return { apply, get, current, currentId, list, register, loadFont };
})();
