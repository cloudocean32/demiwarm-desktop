module.exports = {
  // Panel Utama & Navigasi
  mainPanel: '#main',
  chatList: '#pane-side',
  searchBox: 'div[contenteditable="true"][data-tab="3"]',
  statusTab: 'button[aria-label*="Status"]',
  chatTab: 'button[aria-label*="Chat"]',

  // Di dalam Panel Chat
  chatListItem: 'div[role="listitem"]',
  chatListItemTitle: 'span[title]',
  messageBox: 'div[contenteditable="true"][data-tab="10"]',
  sendButton: 'button[aria-label="Send"]',

  // Di dalam Halaman Status
  addStatusButton: 'button[aria-label="Add Status"]',
  createTextStatusButton: 'span[data-icon="pencil-refreshed"]',
  statusEditorCanvas: 'div[contenteditable="true"][aria-placeholder="Type a status"]',
  sendStatusButton: 'div[role="button"][aria-label="Send"]',
  statusListContainer: 'div[class*="statusList"]',
  unreadStatusIndicator: 'svg[class*="x165d6jo"]',
  
  // Di dalam Story Viewer
  storyReplyBox: 'div[role="textbox"][aria-placeholder="Type a reply…"]',
  storySendReplyButtonIcon: 'button span[data-icon="send"]',
  storyCloseButton: 'div[role="button"][aria-label="Close"]',

  // Umum
  genericPopupButtons: ['continue', 'ok', 'got it']
};
