import { handleMessage } from './messageHandler';
import type { Message } from '../types/messages';

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true; // async response
  }
);
