import { createApp } from 'vue';
import App from './App.vue';
import '@fortawesome/fontawesome-free/css/all.css';
import { eventBus } from './eventBus.js';
import './sessionManager.js'; // Ensure session management is initialized


// --- CATCH CONSOLE.ERROR CALLS ---
// 1. Save a reference to the original console.error function
const originalConsoleError = console.error;

// 2. Override the console.error function
console.error = function(...args) {
  // 3. Call the original function to preserve normal console behavior
  originalConsoleError.apply(console, args);

  // 4. Format the error message for the AI
  const formattedMessage = args.map(arg => {
    if (arg instanceof Error) {
      return arg.stack || arg.message;
    }
    return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
  }).join(' ');

  const fullErrorMessage = `A console.error was triggered: ${formattedMessage}`;

  // 5. Emit the event to send the error to the AI
  eventBus.emit('error:frontend-uncaught', { error: fullErrorMessage });
};

createApp(App).mount('#app');
