import { eventBus } from './eventBus.js';
import { getUserId } from './sessionManager.js'; // ✅ Import the getter

class ApiService {
  constructor() {
    this.prompts = {
      currentState: ''
    };
    this.chatHistory = [];
    this.controllerLogic = {}; 
    this.initListeners();
  }

  updateSystemPrompts(newPrompts) {
    this.prompts = newPrompts;
    console.log('System prompts updated in ApiService.');
  }

  /**
   * Parses a single line from the stream and emits the corresponding event.
   * @param {string} line A string containing a JSON object.
   */
  processStreamLine(line) {
    try {
      const data = JSON.parse(line);
      if (data.command === 'updateSystemMessage') {
        eventBus.emit('datastore:updateSystemMessage', data);
      } else if (data.command === 'finalResponse') {
        this.chatHistory.push({ role: 'model', parts: [{ text: data.payload.plan }] });
        eventBus.emit('api:message-response', { aiResponse: data.payload.aiResponse });
      } else if (data.command === 'errorResponse') {
        console.error('Server-side error received:', data.payload);
        eventBus.emit('api:error', { error: data.payload.message });
      }
    } catch (e) {
      console.error('Error parsing stream line:', e, 'Line:', line);
    }
  }

  initListeners() {
    eventBus.on('api:send-message', async (payload) => {
      try {
        const { messageText } = payload;
        
        const response = await fetch('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: getUserId(),
            messageText,
            currentState: this.prompts.currentState,
            chatHistory: this.chatHistory,
            controllerLogic: this.controllerLogic
          }),
        });

        this.chatHistory.push({ role: 'user', parts: [{ text: messageText }] });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep any partial line for the next chunk

            for (const line of lines) {
                if (line.trim()) {
                    this.processStreamLine(line);
                }
            }
        }

        // --- FIX: Process the final data remaining in the buffer after the stream closes ---
        if (buffer.trim()) {
            this.processStreamLine(buffer);
        }

      } catch (error) {
        eventBus.emit('api:error', { error });
      }
    });

    eventBus.on('api:update-system-prompts', (payload) => {
      this.updateSystemPrompts(payload);
    });

    eventBus.on('datastore:logic-updated', (payload) => {
      if (payload && payload.logic) {
        this.controllerLogic = payload.logic;
        console.log('ApiService updated with latest controller logic.');
      }
    });

    eventBus.on('error:frontend-uncaught', async (payload) => {
        const { error } = payload;
        console.warn("ApiService caught error, sending to new server endpoint...", error);
    
        // This is a fire-and-forget request. The server will stream
        // its response back through the normal SSE connection.
        await fetch('http://localhost:3000/api/error-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            errorMessage: error,
            userId: getUserId(),
            currentState: this.prompts.currentState,
            chatHistory: this.chatHistory,
            controllerLogic: this.controllerLogic
          }),
        });        
  })}
};



export const apiService = new ApiService();