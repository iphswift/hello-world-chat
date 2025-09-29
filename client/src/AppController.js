import { eventBus } from './eventBus.js';

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

export default class AppController {
    constructor(systemPromptProvider, logicConfig, uiTreeQuerier, viewStateFacade) {
        this.getSystemPrompt = systemPromptProvider;
        this.logic = logicConfig;
        
        this.handlerContext = {
            processing: false,
            spinnerNode: {
              tag: 'div',
              uid: 'system-loading-spinner',
              presentation: { className: 'loading' },
              children: [{
                tag: 'i',
                presentation: { className: 'spinner' },
                attributes: { class: 'fa fa-spinner fa-spin' }
              }]
            },
            queryUiTree: uiTreeQuerier,
            ...viewStateFacade,
            emit: (eventName, payload) => eventBus.emit(eventName, payload),
        };

        this.activeHandlers = new Map();
        this._activateListenersFromConfig();
        this.logicUpdateHandler = this._handleLogicUpdate.bind(this);
        eventBus.on('datastore:logic-updated', this.logicUpdateHandler);
    }

    destroy() {
      this._deactivateAllListeners();
      eventBus.off('datastore:logic-updated', this.logicUpdateHandler);
      console.log("AppController destroyed and listeners cleaned up.");
    }

    _deactivateAllListeners() {
        for (const [eventName, handler] of this.activeHandlers.entries()) {
            eventBus.off(eventName, handler);
        }
        this.activeHandlers.clear();
    }

    _activateListenersFromConfig() {
        for (const eventName in this.logic) {
            const config = this.logic[eventName];
            if (!config || !config.body) continue;

            const { args = [], body, isAsync = false } = config;
            let handler;

            try {
                const sanitizedBody = body.trim();

                if (isAsync) {
                    handler = new AsyncFunction(...args, sanitizedBody);
                } else {
                    handler = new Function(...args, sanitizedBody);
                }
                
                const boundHandler = handler.bind(this.handlerContext); 
                eventBus.on(eventName, boundHandler);
                this.activeHandlers.set(eventName, boundHandler);

            } catch (error) {
                // MODIFIED: Enhanced error logging
                console.error(`❌ Failed to create function for event '${eventName}':`, {
                    message: error.message,
                    eventName: eventName,
                    functionBody: body, // Log the original, untrimmed body for inspection
                    errorDetails: error
                });
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
}