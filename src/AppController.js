import { eventBus } from './eventBus.js';

// The AsyncFunction constructor is not a global, so we access it this way.
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

export default class AppController {
    constructor(systemPromptProvider, logicConfig, uiTreeQuerier, viewStateFacade) {
        this.processing = false;
        this.getSystemPrompt = systemPromptProvider;
        this.logic = logicConfig;
        this.queryUiTree = uiTreeQuerier; // 2. Store the querier function.
        this.viewStateFacade = viewStateFacade;
        this.eventBus = eventBus;
        this.activeHandlers = new Map(); // To store active handlers for removal
        this.spinnerNode =  {
          tag: 'div',
          styleId: 'loading',
          uid: 'system-loading-spinner', // A predictable UID is key
          children: [{
            tag: 'i',
            props: { class: 'fa fa-spinner fa-spin' },
            styleId: 'spinner'
          }]
        };

    
        this._activateListenersFromConfig();
        this.logicUpdateHandler = this._handleLogicUpdate.bind(this);

        // Listen for logic updates from the DataStore
        eventBus.on('datastore:logic-updated', this.logicUpdateHandler);
    }

  /**
   * Public method to clean up all event bus subscriptions.
   */
  destroy() {
      this._deactivateAllListeners();
      // Use the stored reference to unsubscribe
      eventBus.off('datastore:logic-updated', this.logicUpdateHandler);
      console.log("AppController destroyed and listeners cleaned up.");
  }

  _deactivateAllListeners() {
    for (const [eventName, handler] of this.activeHandlers.entries()) {
      // Assumes the eventBus has an 'off' method with this signature
      eventBus.off(eventName, handler);
    }
    this.activeHandlers.clear();
    console.log("AppController: Deactivated all dynamic listeners.");
  }

  _activateListenersFromConfig() {
    for (const eventName in this.logic) {
      const config = this.logic[eventName];
      if (!config || !config.body) continue;

      const { args = [], body, isAsync = false } = config;
      let handler;

      try {
        if (isAsync) {
          handler = new AsyncFunction(...args, body);
        } else {
          handler = new Function(...args, body);
        }
        
        // FIX: Create the bound handler once
        const boundHandler = handler.bind(this);
        
        // Use the same bound handler for both the listener and the tracker
        eventBus.on(eventName, boundHandler);
        this.activeHandlers.set(eventName, boundHandler);

      } catch (error) {
        console.error(`Failed to create function for event '${eventName}':`, error);
      }
    }
    console.log("AppController: Activated listeners from config.");
  }

  _handleLogicUpdate(payload) {
    console.log("AppController: Detected logic update. Re-initializing listeners...");
    this._deactivateAllListeners();
    this.logic = payload.logic;
    this._activateListenersFromConfig();
  }

  async _fetchAiResponse(payload) {
    try {
      const systemPrompt = this.getSystemPrompt();
      const aiResponse = await sendMessageToAI(payload.messageText, systemPrompt);
      eventBus.emit('process:parse-response', { aiResponse });
    } catch (error) {
      eventBus.emit('error:api', { error });
    } finally {
      eventBus.emit('process:complete');
    }
  }
}