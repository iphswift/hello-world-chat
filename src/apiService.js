import { eventBus } from './eventBus.js';
import { GoogleGenAI } from '@google/genai';

// Initialize the GoogleGenAI client
const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
if (!apiKey) {
  console.error("Gemini API Key is missing!");
}
const genAI = new GoogleGenAI({ apiKey });

class ApiService {
  constructor() {
    // Using the stateful chat session API from the older library
    this.textChat = genAI.chats.create({ model: "gemini-2.5-flash" });
    
    this.jsonChat = genAI.chats.create({ 
        model: "gemini-2.5-flash",
        generationConfig: {
            response_mime_type: "application/json",
        } 
    });
    
    this.prompts = {
      reasoning: '',
      execution: '',
      currentState: ''
    };
    this.initListeners();
  }

  updateSystemPrompts(newPrompts) {
    this.prompts = newPrompts;
    console.log('System prompts updated.');
  }

  async getReasoningPlan(messageText) {
    try {
      const reasoningPrompt = `
        The user wants to modify a web application.
        Based on their request and the application's current state below, formulate a step-by-step plan.
        Use the provided architectural guidelines and available commands to structure your plan.
        This is a planning step. DO NOT generate the final JSON response. Only output your textual plan.

        USER REQUEST: "${messageText}"

        --- APPLICATION STATE ---
        ${this.prompts.currentState}

        --- GUIDELINES AND AVAILABLE ACTIONS ---
        ${this.prompts.reasoning}
      `;
      
      console.log("Requesting reasoning plan...");
      // Using sendMessage with the required format for this library version
      const response = await this.textChat.sendMessage({message: reasoningPrompt});
      const plan = response.candidates[0].content.parts[0].text;

      console.log("Received plan:", plan);
      return plan;

    } catch (error) {
      console.error("Error in getReasoningPlan:", error);
      throw error;
    }
  }

  async sendMessageToAI(messageText, plan) {
    try {
      const fullMessage = `
        ${this.prompts.execution}

        --- APPLICATION STATE ---
        ${this.prompts.currentState}

        --- User Request ---
        ${messageText}

        --- Your Plan (EXECUTE THIS) ---
        ${plan}

        Based on the application state and the plan above, generate the final JSON response. Adhere strictly to the formatting rules.
      `;
      
      const response = await this.jsonChat.sendMessage({message: fullMessage});
      return response.candidates[0].content.parts[0].text;
    } 
      catch (error) {
        console.error("Error in sendMessageToAI:", error);
      throw error;
    }
  }

  initListeners() {
    eventBus.on('api:send-message', async (payload) => {
      try {
        const { messageText } = payload;
        const plan = await this.getReasoningPlan(messageText);
        const aiResponse = await this.sendMessageToAI(messageText, plan);
        eventBus.emit('api:message-response', { aiResponse });
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