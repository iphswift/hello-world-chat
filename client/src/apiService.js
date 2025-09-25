// apiService.js
import { eventBus } from './eventBus.js';

class ApiService {
  constructor() {
    this.prompts = {
      currentState: '' // The shape of prompts is now simpler
    };
    this.chatHistory = [];
    this.initListeners();
  }

  updateSystemPrompts(newPrompts) {
    this.prompts = newPrompts;
    console.log('System prompts updated in ApiService.');
  }

  initListeners() {
    eventBus.on('api:send-message', async (payload) => {
      try {
        const { messageText } = payload;
        
        // Use fetch to call your new backend endpoint
        const response = await fetch('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // --- THIS IS THE FIX ---
          // Send currentState as a top-level property
          body: JSON.stringify({
            messageText,
            currentState: this.prompts.currentState,
            chatHistory: this.chatHistory
          }),
        });
        this.chatHistory.push({ role: 'user', parts: [{ text: messageText }] });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.statusText}`);
        }

        const data = await response.json();

        this.chatHistory.push({ role: 'model', parts: [{ text: data.plan }] });

        eventBus.emit('api:message-response', { aiResponse: data.aiResponse });

      } catch (error) {
        eventBus.emit('api:error', { error });
      } finally {
        eventBus.emit('process:complete');
      }
    });

    eventBus.on('api:update-system-prompts', (payload) => {
      this.updateSystemPrompts(payload);
    });
  }
}

export const apiService = new ApiService();