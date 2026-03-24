/* ============================================================
   VFS — Client-side Virtual File System
   ============================================================ */

window.VFS = (() => {
  // Default file system for a new user
  function createDefaultFS(username) {
    return {
      '/': { type: 'dir', children: ['read_me.text', 'execute_me_first.mod', 'execute_me_second.mod', 'real_deal'] },
      '/read_me.text': { type: 'file', content: `Welcome to the test terminal.\nYou can "read" text files.\nTry executing the mod files with the "exec" command to unlock new capabilities.` },
      '/execute_me_first.mod': { type: 'file', content: `::MOD_UNLOCK::read::` },
      '/execute_me_second.mod': { type: 'file', content: `::MOD_UNLOCK::cd::` },
      '/real_deal': { type: 'dir', children: ['well_done.text', 'infinite_possibilities.mod'] },
      '/real_deal/well_done.text': { type: 'file', content: `You did it! The remote target IP is 192.168.1.100. Good luck.` },
      '/real_deal/infinite_possibilities.mod': { type: 'file', content: `::MOD_UNLOCK::connect::` }
    };
  }

  class VirtualFS {
    constructor(username, initialState = null, unlockedCommands = null) {
      this.username = username;
      this.cwd = '/';
      this.homeDir = '/';
      this.fs = initialState || createDefaultFS(username);
      this.unlockedCommands = unlockedCommands || ['help', 'ls', 'exec'];
    }

    // Trigger auto-save to server
    saveState() {
      window.dispatchEvent(new CustomEvent('vfs:save_req', {
        detail: { 
          vfsState: this.fs,
          unlockedCommands: this.unlockedCommands
        }
      }));
    }

    // Normalize a path (resolve `.`, `..`, and `~`)
    resolve(inputPath) {
      if (!inputPath) return this.cwd;
      let p = inputPath;
      if (p === '~' || p.startsWith('~/')) {
        p = this.homeDir + p.slice(1);
      }
      if (!p.startsWith('/')) {
        p = this.cwd + '/' + p;
      }
      // Resolve . and ..
      const parts = p.split('/').filter(Boolean);
      const resolved = [];
      for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') { resolved.pop(); continue; }
        resolved.push(part);
      }
      return '/' + resolved.join('/') || '/';
    }

    getNode(path) {
      const resolved = this.resolve(path);
      return this.fs[resolved] || null;
    }

    ls(dirPath) {
      const resolved = this.resolve(dirPath || '.');
      const node = this.fs[resolved];
      if (!node) return { error: `ls: cannot access '${dirPath || '.'}': No such file or directory` };
      if (node.type !== 'dir') return { error: `ls: '${dirPath}': Not a directory` };
      
      // Filter out children that don't actually exist in the FS (prevents ghost files)
      const validChildren = (node.children || []).filter(name => {
        const childPath = resolved === '/' ? `/${name}` : `${resolved}/${name}`;
        return this.fs[childPath];
      });
      
      return { children: validChildren };
    }

    cd(dirPath) {
      if (!dirPath) {
        this.cwd = this.homeDir;
        return { success: true };
      }
      const resolved = this.resolve(dirPath);
      const node = this.fs[resolved];
      if (!node) return { error: `cd: ${dirPath}: No such file or directory` };
      if (node.type !== 'dir') return { error: `cd: ${dirPath}: Not a directory` };
      this.cwd = resolved;
      return { success: true };
    }

    cat(filePath) {
      const resolved = this.resolve(filePath);
      const node = this.fs[resolved];
      if (!node) return { error: `cat: ${filePath}: No such file or directory` };
      if (node.type !== 'file') return { error: `cat: ${filePath}: Is a directory` };
      if (node.isSecured) return { error: `cat: ${filePath}: Permission denied (Secured file)` };
      return { content: node.content };
    }

    mkdir(dirPath) {
      if (!dirPath) return { error: 'mkdir: missing operand' };
      const resolved = this.resolve(dirPath);
      if (this.fs[resolved]) return { error: `mkdir: cannot create directory '${dirPath}': File exists` };
      // Get parent
      const parts = resolved.split('/').filter(Boolean);
      const dirName = parts.pop();
      const parentPath = '/' + parts.join('/') || '/';
      const parentNode = this.fs[parentPath];
      if (!parentNode || parentNode.type !== 'dir') return { error: `mkdir: cannot create directory '${dirPath}': No such parent directory` };
      if (parentNode.children.includes(dirName)) return { error: `mkdir: cannot create directory '${dirPath}': File exists` };
      parentNode.children.push(dirName);
      this.fs[resolved] = { type: 'dir', children: [] };
      this.saveState();
      return { success: true };
    }

    touch(filePath, content = '') {
      if (!filePath) return { error: 'touch: missing operand' };
      const resolved = this.resolve(filePath);
      if (this.fs[resolved]) {
        // File already exists, just "touch" it (no-op for now)
        return { success: true };
      }
      const parts = resolved.split('/').filter(Boolean);
      const fileName = parts.pop();
      const parentPath = '/' + parts.join('/') || '/';
      const parentNode = this.fs[parentPath];
      if (!parentNode || parentNode.type !== 'dir') return { error: `touch: cannot touch '${filePath}': No such parent directory` };
      if (parentNode.children.includes(fileName)) {
        // Entry already in children list, but if it doesn't exist in FS, we'll "re-create" it below
      } else {
        parentNode.children.push(fileName);
      }
      this.fs[resolved] = { type: 'file', content };
      this.saveState();
      return { success: true };
    }

    rm(filePath) {
      if (!filePath) return { error: 'rm: missing operand' };
      const resolved = this.resolve(filePath);
      const node = this.fs[resolved];
      
      if (node && node.type === 'dir' && node.children && node.children.length > 0) {
        return { error: `rm: cannot remove '${filePath}': Directory not empty` };
      }

      const parts = resolved.split('/').filter(Boolean);
      const entryName = parts.pop();
      const parentPath = '/' + parts.join('/') || '/';
      const parentNode = this.fs[parentPath];

      if (parentNode && parentNode.children) {
        parentNode.children = parentNode.children.filter(c => c !== entryName);
      }

      if (!node) {
        this.saveState();
        return { error: `rm: cannot remove '${filePath}': No such file or directory` };
      }

      delete this.fs[resolved];
      this.saveState();
      return { success: true };
    }

    echo(args) {
      // Handle echo with >> or > redirection
      const joinedArgs = args.join(' ');
      const appendMatch = joinedArgs.match(/^(.*?)\s*>>\s*(.+)$/);
      const writeMatch = joinedArgs.match(/^(.*?)\s*>\s*(.+)$/);

      if (appendMatch) {
        const text = appendMatch[1].trim();
        const filePath = appendMatch[2].trim();
        const resolved = this.resolve(filePath);
        const node = this.fs[resolved];
        if (node && node.type === 'file') {
          if (node.isSecured) return { error: `echo: ${filePath}: Permission denied (Secured file)` };
          node.content += '\n' + text;
          this.saveState();
          return { success: true };
        } else if (!node) {
          // Create file
          const result = this.touch(filePath, text);
          return result.error ? result : { success: true };
        }
        return { error: `echo: ${filePath}: Is a directory` };
      }

      if (writeMatch) {
        const text = writeMatch[1].trim();
        const filePath = writeMatch[2].trim();
        const resolved = this.resolve(filePath);
        const node = this.fs[resolved];
        if (node && node.type === 'file') {
          if (node.isSecured) return { error: `echo: ${filePath}: Permission denied (Secured file)` };
          node.content = text;
          this.saveState();
          return { success: true };
        } else if (!node) {
          const result = this.touch(filePath, text);
          return result.error ? result : { success: true };
        }
        return { error: `echo: ${filePath}: Is a directory` };
      }

      return { output: joinedArgs };
    }

    pwd() {
      return this.cwd;
    }

    secFile(filePath, password) {
      if (!filePath || !password) return { error: 'sec: usage: sec <filename> <password>' };
      const resolved = this.resolve(filePath);
      const node = this.fs[resolved];
      if (!node) return { error: `sec: ${filePath}: No such file` };
      if (node.type !== 'file') return { error: `sec: ${filePath}: Is a directory` };
      if (node.isSecured) return { error: `sec: ${filePath} is already secured` };

      const parts = resolved.split('/').filter(Boolean);
      const fileName = parts.pop();
      const parentPath = '/' + parts.join('/') || '/';
      const parentNode = this.fs[parentPath];

      const newName = fileName + '.vlt';
      const newPath = resolved + '.vlt';

      const idx = parentNode.children.indexOf(fileName);
      if (idx > -1) parentNode.children[idx] = newName;

      this.fs[newPath] = node;
      delete this.fs[resolved];

      node.isSecured = true;
      node.password = password;
      this.saveState();
      return { success: true, newName };
    }

    relFile(filePath, password) {
      if (!filePath || !password) return { error: 'rel: usage: rel <filename.vlt> <password>' };
      const resolved = this.resolve(filePath);
      const node = this.fs[resolved];
      if (!node) return { error: `rel: ${filePath}: No such file` };
      if (node.type !== 'file') return { error: `rel: ${filePath}: Is a directory` };
      if (!node.isSecured) return { error: `rel: ${filePath} is not secured` };
      if (node.password !== password) return { error: `rel: incorrect password` };

      const parts = resolved.split('/').filter(Boolean);
      let fileName = parts.pop();
      const parentPath = '/' + parts.join('/') || '/';
      const parentNode = this.fs[parentPath];

      let newName = fileName.replace(/\.vlt$/, '');
      if (newName === fileName) newName += '_unlocked';
      const newPath = (parentPath === '/' ? '/' : parentPath + '/') + newName;

      const idx = parentNode.children.indexOf(fileName);
      if (idx > -1) parentNode.children[idx] = newName;

      this.fs[newPath] = node;
      delete this.fs[resolved];

      node.isSecured = false;
      delete node.password;
      this.saveState();
      return { success: true, newName: newName };
    }

    // Render current prompt string
    getPrompt() {
      let displayPath = this.cwd;
      if (displayPath.startsWith(this.homeDir)) {
        displayPath = '~' + displayPath.slice(this.homeDir.length);
      }
      return `${this.username}@webterm:${displayPath}$ `;
    }
  }

  return { VirtualFS };
})();
