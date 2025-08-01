const { app, BrowserWindow, ipcMain, session, clipboard, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// ======================================================================
// KONFIGURASI & LOGGING AUTO-UPDATER
// ======================================================================
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
});
autoUpdater.on('update-available', (info) => {
  log.info('Update available.', info);
  if (state.mainWindow) {
    state.mainWindow.webContents.send('update_available');
  }
});
autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available.', info);
});
autoUpdater.on('error', (err) => {
  log.error('Error in auto-updater. ' + err);
});
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = `Downloaded ${progressObj.percent.toFixed(2)}% (${(progressObj.bytesPerSecond / 1000).toFixed(2)} KB/s)`;
  log.info(log_message);
});
autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded. Prompting user to restart.');
  const dialogOpts = {
    type: 'info',
    buttons: ['Restart Now', 'Later'],
    title: 'Application Update',
    message: `A new version (${info.version}) has been downloaded.`,
    detail: 'Restart the application to apply the updates.'
  };
  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall();
  });
});

// ======================================================================
// GLOBAL STATE & FUNGSI DASAR
// ======================================================================
const state = {
  mainWindow: null,
  whatsappWindows: new Map(),
};
let currentUserPublicIP = null;

function loadSessionMap() {
    try {
        const sessionMapPath = path.join(app.getPath('userData'), 'session-map.json');
        if (fs.existsSync(sessionMapPath)) {
            return JSON.parse(fs.readFileSync(sessionMapPath, 'utf-8'));
        }
    } catch (error) {
        console.error('Failed to load session map:', error);
    }
    return {};
}

function saveSessionMap(map) {
    try {
        const sessionMapPath = path.join(app.getPath('userData'), 'session-map.json');
        fs.writeFileSync(sessionMapPath, JSON.stringify(map, null, 2));
    } catch (error) {
        console.error('Failed to save session map:', error);
    }
}

// ======================================================================
// MANAJEMEN JENDELA (WINDOWS)
// ======================================================================

function createMainWindow() {
  state.mainWindow = new BrowserWindow({
    title: 'DEMIWARM',
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: !app.isPackaged,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    }
  });

  if (app.isPackaged) {
    state.mainWindow.setMenu(null);
  }
  
  state.mainWindow.loadFile('index.html');
  state.mainWindow.on('closed', () => (state.mainWindow = null));
  
  state.mainWindow.once('ready-to-show', () => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates();
    }
  });
}

function createAccessDeniedWindow() {
  const deniedWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  deniedWindow.loadFile('access-denied.html');
}

async function createWhatsAppWindow(name, partitionId) {
    const mainPos = state.mainWindow.getPosition();
    const offset = 30 * state.whatsappWindows.size;
    const cloneWindow = new BrowserWindow({
        title: `WhatsApp | Account ${name}`,
        width: 1200, height: 800, x: mainPos[0] + offset, y: mainPos[1] + offset,
        webPreferences: { partition: `persist:${partitionId}`, contextIsolation: true, sandbox: true }
    });
    cloneWindow.webContents.on('page-title-updated', (event) => event.preventDefault());
    cloneWindow.setMenu(null);
    cloneWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await cloneWindow.loadURL('https://web.whatsapp.com');
    const windowId = cloneWindow.id;
    cloneWindow.on('closed', () => {
        if (state.mainWindow && !state.mainWindow.isDestroyed()) {
            state.mainWindow.webContents.send('window-closed', windowId);
        }
        state.whatsappWindows.delete(windowId);
    });
    return cloneWindow;
}

// ======================================================================
// ALUR STARTUP APLIKASI
// ======================================================================

async function initializeApp() {
  log.info('App starting...');
  try {
    const { publicIpv4 } = await import('public-ip');
    currentUserPublicIP = await publicIpv4();
    log.info(`Current Public IP: ${currentUserPublicIP}`);

    const whitelistResponse = await fetch('https://whitelistips.vercel.app/ips');
    const whitelistData = await whitelistResponse.json();
    const allowedIps = whitelistData.ips;
    log.info('Whitelist IPs loaded.');

    if (allowedIps.includes(currentUserPublicIP)) {
      log.info('IP is in whitelist. Starting main application...');
      createMainWindow();
    } else {
      log.warn('IP NOT in whitelist. Showing access denied page.');
      createAccessDeniedWindow();
    }
  } catch (error) {
    log.error('Failed to verify IP address:', error);
    createAccessDeniedWindow();
  }
}

app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && !state.mainWindow) {
        initializeApp();
    }
});

// ======================================================================
// IPC HANDLERS (JEMBATAN KE RENDERER)
// ======================================================================

ipcMain.handle('get-current-ip', () => ({ currentIP: currentUserPublicIP }));
ipcMain.handle('close-app', () => app.quit());
ipcMain.handle('start-update-download', () => {
    autoUpdater.downloadUpdate();
});
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
ipcMain.handle('get-or-create-account', async (_, { name, number }) => {
    const sessionMap = loadSessionMap();
    let accountInfo = sessionMap[number];
    if (accountInfo) {
        let existingWindow = state.whatsappWindows.get(accountInfo.windowId);
        if (existingWindow && !existingWindow.window.isDestroyed()) {
            existingWindow.window.focus();
        } else {
            const win = await createWhatsAppWindow(name, accountInfo.partitionId);
            accountInfo.windowId = win.id;
            state.whatsappWindows.set(win.id, { window: win, name, number, isSending: false });
        }
        saveSessionMap(sessionMap);
        return { ...accountInfo, status: 'reopened' };
    } else {
        const partitionId = `whatsapp-session-${number}`;
        const win = await createWhatsAppWindow(name, partitionId);
        accountInfo = { name, number, partitionId, windowId: win.id };
        sessionMap[number] = accountInfo;
        saveSessionMap(sessionMap);
        state.whatsappWindows.set(win.id, { window: win, name, number, isSending: false });
        return { ...accountInfo, status: 'created' };
    }
});

ipcMain.handle('focus-window', (_, id) => {
  const winInfo = state.whatsappWindows.get(Number(id));
  if (winInfo && !winInfo.window.isDestroyed()) { 
      winInfo.window.focus(); 
      return true; 
  }
  return false;
});

ipcMain.handle('close-window', (_, id) => {
  const windowId = Number(id);
  const winInfo = state.whatsappWindows.get(windowId);
  if (winInfo) {
    const numberToClear = winInfo.number;
    if (numberToClear) {
        const sessionMap = loadSessionMap();
        if (sessionMap[numberToClear]) {
            delete sessionMap[numberToClear];
            saveSessionMap(sessionMap);
        }
    }
    if (!winInfo.window.isDestroyed()) winInfo.window.close();
    state.whatsappWindows.delete(windowId);
    return true;
  }
  return false;
});

ipcMain.handle('send-message', async (_, { senderWindowId, receiverNumber, message }) => {
    const senderWinInfo = state.whatsappWindows.get(Number(senderWindowId));
    if (!senderWinInfo) throw new Error('Sender window not found');
    if (senderWinInfo.isSending) throw new Error('Window is busy');
    try {
      senderWinInfo.isSending = true;
      const senderWin = senderWinInfo.window;
      if (senderWin.isDestroyed()) throw new Error('Sender window has been destroyed');
      const phone = receiverNumber.replace(/[^\d]/g, '');
      const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
      await senderWin.loadURL(url);
      await senderWin.webContents.executeJavaScript(`new Promise((resolve, reject) => { let attempt = 0; const interval = setInterval(() => { attempt++; const commonTexts = ['continue', 'ok', 'got it']; const actionButton = Array.from(document.querySelectorAll('button')).find(b => commonTexts.includes(b.textContent.trim().toLowerCase())); if (actionButton) actionButton.click(); const sendBtn = document.querySelector('button[aria-label="Send"], span[data-icon="send"], button[data-tab="11"]'); if (sendBtn && document.querySelector('#main')) { clearInterval(interval); resolve(true); } if (attempt > 60) { clearInterval(interval); reject(new Error('Send button or main panel not found after 30 seconds.')); } }, 500); });`);
      const result = await senderWin.webContents.executeJavaScript(`(() => { const sendBtn = document.querySelector('button[aria-label="Send"], span[data-icon="send"], button[data-tab="11"]'); if (sendBtn) { sendBtn.click(); return 'clicked'; } return 'not_found'; })();`);
      return { status: result === 'clicked' ? 'sent' : 'failed' };
    } catch (error) {
      console.error(`Error sending message from window ${senderWindowId}:`, error.message);
      throw error;
    } finally {
      if (senderWinInfo) senderWinInfo.isSending = false;
    }
});

ipcMain.handle('send-group-message', async (_, { senderWindowId, groupName, message }) => {
    const senderWinInfo = state.whatsappWindows.get(Number(senderWindowId));
    if (!senderWinInfo) throw new Error('Sender window not found');
    if (senderWinInfo.isSending) throw new Error('Window is busy');
    try {
        senderWinInfo.isSending = true;
        const senderWin = senderWinInfo.window;
        if (senderWin.isDestroyed()) throw new Error('Sender window has been destroyed');
        clipboard.writeText(groupName);
        const groupElementBoundsJSON = await senderWin.webContents.executeJavaScript(`new Promise(async (resolve, reject) => { const delay = ms => new Promise(res => setTimeout(res, ms)); const searchBox = document.querySelector('div[contenteditable="true"][data-tab="3"]'); if (!searchBox) return reject(new Error('Search box not found')); searchBox.focus(); document.execCommand('paste'); await delay(1000); let findAttempt = 0; const findInterval = setInterval(() => { findAttempt++; const listItems = Array.from(document.querySelectorAll('#pane-side div[role="listitem"]')); let foundItem = null; for (const item of listItems) { const titleSpan = item.querySelector('span[title]'); if (titleSpan && titleSpan.getAttribute('title').trim().toLowerCase() === '${groupName.replace(/'/g, "\\'").trim().toLowerCase()}') { foundItem = item; break; } } if (foundItem) { clearInterval(findInterval); const bounds = foundItem.getBoundingClientRect(); resolve(JSON.stringify(bounds)); } else if (findAttempt > 20) { clearInterval(findInterval); reject(new Error('Group "${groupName}" found, but failed to get its coordinates.')); } }, 500); });`);
        if (groupElementBoundsJSON) {
            const bounds = JSON.parse(groupElementBoundsJSON);
            const x = Math.round(bounds.left + bounds.width / 2);
            const y = Math.round(bounds.top + bounds.height / 2);
            senderWin.focus();
            await senderWin.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
            await new Promise(resolve => setTimeout(resolve, 100));
            await senderWin.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
        } else {
            throw new Error('Could not get group element coordinates.');
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
        clipboard.writeText(message);
        const result = await senderWin.webContents.executeJavaScript(`new Promise((resolve, reject) => { let attempt = 0; const messageBoxInterval = setInterval(() => { attempt++; const messageBox = document.querySelector('div[contenteditable="true"][data-tab="10"]'); if (messageBox) { clearInterval(messageBoxInterval); messageBox.focus(); document.execCommand('paste'); setTimeout(() => { const sendBtn = document.querySelector('button[aria-label="Send"]') || document.querySelector('span[data-icon="send"]'); if (!sendBtn) return reject(new Error('Send button not found.')); sendBtn.click(); resolve('sent'); }, 500); } else if (attempt > 40) { clearInterval(messageBoxInterval); reject(new Error('Message box not found.')); } }, 500); });`);
        return { status: result };
    } catch (error) {
        console.error(`Error sending group message from window ${senderWindowId}:`, error.message);
        throw error;
    } finally {
        if (senderWinInfo) { senderWinInfo.isSending = false; clipboard.clear(); }
    }
});

ipcMain.handle('find-and-reply-story', async (_, accountId) => {
    const winInfo = state.whatsappWindows.get(Number(accountId));
    if (!winInfo) throw new Error('Account window not found for story reply.');
    if (winInfo.isSending) throw new Error('Window is busy');
    try {
        winInfo.isSending = true;
        const win = winInfo.window;
        win.focus();
        await win.webContents.executeJavaScript(`new Promise((resolve, reject) => { let attempt = 0; const findStatusTabInterval = setInterval(() => { attempt++; const statusTab = document.querySelector('button[aria-label*="Status"]'); if (statusTab) { clearInterval(findStatusTabInterval); statusTab.click(); resolve(true); } if (attempt > 60) { clearInterval(findStatusTabInterval); reject(new Error('Tombol Status tidak ditemukan setelah 30 detik.')); } }, 500); });`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        const storyElementBoundsJSON = await win.webContents.executeJavaScript(`new Promise((resolve, reject) => { let storyToClick = null; const statusItems = Array.from(document.querySelectorAll('div[class*="statusList"] div[role="listitem"]')); for (const item of statusItems) { const unreadIndicator = item.querySelector('svg[class*="x165d6jo"]'); if (unreadIndicator) { storyToClick = item.querySelector('div[role="button"]'); break; } } if (storyToClick) { const bounds = storyToClick.getBoundingClientRect(); resolve(JSON.stringify({ bounds: bounds, owner: storyToClick.querySelector('span[title]')?.getAttribute('title') || 'a friend' })); } else { resolve(JSON.stringify({ bounds: null, owner: null })); } });`);
        const storyData = JSON.parse(storyElementBoundsJSON);
        if (!storyData.bounds) {
            await win.webContents.executeJavaScript(`document.querySelector('button[aria-label*="Chat"]')?.click()`);
            return { success: false, reason: 'No unread stories found' };
        }
        const { bounds, owner } = storyData;
        const x = Math.round(bounds.left + bounds.width / 2);
        const y = Math.round(bounds.top + bounds.height / 2);
        await win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
        await new Promise(resolve => setTimeout(resolve, 100));
        await win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
        await new Promise(resolve => setTimeout(resolve, 500)); 
        const genericReplies = ["👍", "🔥", "Keren!", "Mantap 👍", "Wih asik!"];
        const replyMessage = genericReplies[Math.floor(Math.random() * genericReplies.length)];
        clipboard.writeText(replyMessage);
        const replyResult = await win.webContents.executeJavaScript(`new Promise(async (resolve, reject) => { let attempt = 0; const findReplyUIInterval = setInterval(() => { attempt++; const replyBox = document.querySelector('div[role="textbox"][aria-placeholder="Type a reply…"]'); const sendButtonContainer = document.querySelector('button span[data-icon="send"]'); const sendButton = sendButtonContainer ? sendButtonContainer.closest('button') : null; if (replyBox && sendButton) { clearInterval(findReplyUIInterval); replyBox.focus(); document.execCommand('paste'); setTimeout(() => { sendButton.click(); resolve(true); }, 500); } if (attempt > 40) { clearInterval(findReplyUIInterval); reject(new Error('Reply UI (box or send button) not found in story viewer.')); } }, 500); });`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await win.webContents.executeJavaScript(`const closeButton = document.querySelector('div[role="button"][aria-label="Close"]'); if (closeButton) closeButton.click(); setTimeout(() => { const chatTab = document.querySelector('button[aria-label*="Chat"]'); if(chatTab) chatTab.click(); }, 1000);`);
        return { success: replyResult, repliedTo: owner };
    } catch (error) {
        console.error(`Error replying to story from window ${accountId}:`, error.message);
        throw error;
    } finally {
        if (winInfo) { winInfo.isSending = false; clipboard.clear(); }
    }
});

ipcMain.handle('post-text-story', async (_, { accountId, storyText }) => {
    const winInfo = state.whatsappWindows.get(Number(accountId));
    if (!winInfo) throw new Error('Account window not found for posting story.');
    if (winInfo.isSending) throw new Error('Window is busy');
    try {
        winInfo.isSending = true;
        const win = winInfo.window;
        win.focus();
        clipboard.writeText(storyText);
        const result = await win.webContents.executeJavaScript(`new Promise(async (resolve, reject) => { const delay = ms => new Promise(res => setTimeout(res, ms)); try { const statusTab = document.querySelector('button[aria-label*="Status"]'); if (!statusTab) throw new Error('Status tab not found'); statusTab.click(); await delay(1500); const addStatusBtn = document.querySelector('button[aria-label="Add Status"]'); if (!addStatusBtn) throw new Error('Add Status (+) button not found'); addStatusBtn.click(); await delay(1500); const pencilIcon = document.querySelector('span[data-icon="pencil-refreshed"]'); const createTextStatusBtn = pencilIcon ? pencilIcon.closest('li[role="button"]') : null; if (!createTextStatusBtn) throw new Error('Create text status button (pencil icon) not found'); createTextStatusBtn.click(); await delay(2000); const textEditor = document.querySelector('div[contenteditable="true"][aria-placeholder="Type a status"]'); if (!textEditor) throw new Error('Status text editor not found'); textEditor.focus(); document.execCommand('paste'); await delay(500); const sendButton = document.querySelector('div[role="button"][aria-label="Send"]'); if (!sendButton) throw new Error('Send status button not found'); sendButton.click(); await delay(2000); await delay(1000); const chatTab = document.querySelector('button[aria-label*="Chat"]'); if(chatTab) chatTab.click(); resolve({ success: true }); } catch (err) { try { const chatTab = document.querySelector('button[aria-label*="Chat"]'); if(chatTab) chatTab.click(); } finally { reject(err); } } });`);
        return result;
    } catch (error) {
        console.error(`Error posting story from window ${accountId}:`, error.message);
        throw error;
    } finally {
        if (winInfo) { winInfo.isSending = false; clipboard.clear(); }
    }
});

ipcMain.handle('clear-all-data', async () => {
  try {
    const userDataPath = app.getPath('userData');
    BrowserWindow.getAllWindows().forEach(win => { if(!win.isDestroyed()) win.close(); });
    if (fs.existsSync(userDataPath)) {
        fs.rmSync(userDataPath, { recursive: true, force: true });
    }
    app.relaunch();
    app.quit();
    return { status: 'success' };
  } catch (error) {
    console.error('Failed to clear user data:', error);
    return { status: 'error', message: error.message };
  }
});
