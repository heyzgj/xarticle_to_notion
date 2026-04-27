import { handleMessage } from './messageHandler';
import { runQuickSave } from './quickSave';
import type { Message } from '../types/messages';

// Open welcome tab on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});

// Message handler
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});

// Reflex save (M2): keyboard shortcut → extract → save → toast, no popup.
chrome.commands.onCommand.addListener((command) => {
  if (command === 'quick-save') {
    void runQuickSave();
  }
});
