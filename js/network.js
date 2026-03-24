/* ============================================================
   Network — Socket.IO client wrapper
   ============================================================ */

window.Network = (() => {
  let socket = null;

  function init() {
    let serverUrl = undefined;
    // If not running locally, target the local PC server
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== '') {
        serverUrl = localStorage.getItem('webterm_server_url') || 'http://localhost:3000';
    }
    socket = io(serverUrl);
    return socket;
  }

  function getSocket() {
    return socket;
  }

  // --- Auth ---
  function register(username, password) {
    return new Promise((resolve) => {
      socket.emit('register', { username, password }, resolve);
    });
  }

  function login(password, driveData) {
    return new Promise((resolve) => {
      socket.emit('login', { password, driveData }, resolve);
    });
  }

  function debugLogin() {
    return new Promise((resolve) => {
      socket.emit('debug:login', resolve);
    });
  }
  
  function saveDrive(username, password, vfsState, unlockedCommands, salt) {
    return new Promise((resolve) => {
      socket.emit('drive:save', { username, password, vfsState, unlockedCommands, salt }, resolve);
    });
  }

  // --- BBS ---
  function bbsSend(message) {
    return new Promise((resolve) => {
      socket.emit('bbs:send', message, resolve);
    });
  }

  function bbsHistory() {
    return new Promise((resolve) => {
      socket.emit('bbs:history', resolve);
    });
  }

  function onBBSMessage(cb) {
    socket.on('bbs:message', cb);
  }

  function offBBSMessage(cb) {
    socket.off('bbs:message', cb);
  }

  // --- Remote ---
  function remoteConnect(ip) {
    return new Promise((resolve) => {
      socket.emit('remote:connect', ip, resolve);
    });
  }

  function remoteDisconnect() {
    return new Promise((resolve) => {
      socket.emit('remote:disconnect', resolve);
    });
  }

  function remoteUsers() {
    return new Promise((resolve) => {
      socket.emit('remote:users', resolve);
    });
  }

  function remoteAuth(user, password) {
    return new Promise((resolve) => {
      socket.emit('remote:auth', { user, password }, resolve);
    });
  }

  function remoteFetch() {
    return new Promise((resolve) => {
      socket.emit('remote:fetch', resolve);
    });
  }

  function remoteLs(dirPath) {
    return new Promise((resolve) => {
      socket.emit('remote:ls', dirPath, resolve);
    });
  }

  function remoteRead(filePath) {
    return new Promise((resolve) => {
      socket.emit('remote:read', filePath, resolve);
    });
  }

  function remoteStat(itemPath) {
    return new Promise((resolve) => {
      socket.emit('remote:stat', itemPath, resolve);
    });
  }

  function remoteSec(filePath, password) {
    return new Promise((resolve) => {
      socket.emit('remote:sec', { filePath, password }, resolve);
    });
  }

  function remoteRel(filePath, password) {
    return new Promise((resolve) => {
      socket.emit('remote:rel', { filePath, password }, resolve);
    });
  }

  function remoteInfo() {
    return new Promise((resolve) => {
      socket.emit('remote:info', resolve);
    });
  }

  function remoteHosts() {
    return new Promise((resolve) => {
      socket.emit('remote:hosts', resolve);
    });
  }

  function remoteMkdir(dirPath) {
    return new Promise(resolve => {
      socket.emit('remote:mkdir', dirPath, resolve);
    });
  }

  function remoteTouch(filePath) {
    return new Promise(resolve => {
      socket.emit('remote:touch', filePath, resolve);
    });
  }

  function remoteRm(itemPath) {
    return new Promise(resolve => {
      socket.emit('remote:rm', itemPath, resolve);
    });
  }

  function remoteWrite(filePath, content) {
    return new Promise(resolve => {
      socket.emit('remote:write', { filePath, content }, resolve);
    });
  }

  function remoteStatus() {
    return new Promise(resolve => {
      socket.emit('remote:status', resolve);
    });
  }

  function who() {
    return new Promise((resolve) => {
      socket.emit('who', resolve);
    });
  }

  return {
    init, getSocket,
    register, login, debugLogin, saveDrive,
    bbsSend, bbsHistory, onBBSMessage, offBBSMessage,
    remoteConnect, remoteDisconnect,
    remoteUsers, remoteAuth, remoteFetch,
    remoteLs, remoteRead, remoteStat, remoteSec, remoteRel, remoteInfo, remoteHosts,
    remoteMkdir, remoteTouch, remoteRm, remoteWrite, remoteStatus,
    who
  };
})();
