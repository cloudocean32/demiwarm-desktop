const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getOrCreateAccount: (accountData) => ipcRenderer.invoke('get-or-create-account', accountData),
  focusWindow: (windowId) => ipcRenderer.invoke('focus-window', windowId),
  closeWindow: (windowId) => ipcRenderer.invoke('close-window', windowId),
  sendMessage: (data) => ipcRenderer.invoke('send-message', data),
  sendGroupMessage: (data) => ipcRenderer.invoke('send-group-message', data),
  findAndReplyToFirstStory: (accountId) => ipcRenderer.invoke('find-and-reply-story', accountId),
  postTextStory: (data) => ipcRenderer.invoke('post-text-story', data),
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),
  getCurrentIp: () => ipcRenderer.invoke('get-current-ip'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  onWindowClosed: (callback) => ipcRenderer.on('window-closed', (event, ...args) => callback(...args)),
  askAI: (prompt) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.error('AI request timed out!');
        controller.abort();
    }, 20000);

    return fetch('https://ihaveaiservice.vercel.app/ask', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': '!@?BERIKUT-KUNCI-SAYA-ARWANA!@?'
      },
      body: JSON.stringify({ 
        prompt
      }),
      signal: controller.signal
    })
    .then(async res => {
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: `HTTP error! Status: ${res.status}` }));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }
      return res.json();
    })
    .then(data => data.answer || "Oops, something went wrong.")
    .catch(err => {
      const userFriendlyError = "Oops, something went wrong.";
      if (err.name === 'AbortError') {
        console.error('AI API Error: Request timed out after 20 seconds.');
        return userFriendlyError;
      }
      console.error('AI API Error:', err);
      return userFriendlyError;
    })
    .finally(() => {
      clearTimeout(timeoutId);
    });
  }
});
