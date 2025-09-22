export const controllerLogic = {
    'ui:input-keypress': {
        args: ['payload'], // MODIFIED: Expects the new payload object
        body: `
            // Extract domEvent and node from the payload for clarity
            const domEvent = payload.domEvent;
            const node = payload.node;

            // Handle "Enter" keypresses
            if (domEvent.type === 'keypress' && domEvent.key === 'Enter') {
                domEvent.preventDefault(); // Prevent default behavior
                const text = this.viewStateFacade.getValue({ styleId: 'input-field' });
                this.eventBus.emit('message:submit', { messageText: text.trim() });
            }
        `,
    },
        
    'ui:submit-request': {
        isAsync: false,
        args: ['payload'],
        body: `
            // 1. Get the data using the semantic viewState facade function.
            const text = this.viewStateFacade.getValue({ styleId: 'input-field' });

            if (text && text.trim()) {
                // 2. Dispatch the business logic event.
                this.eventBus.emit('message:submit', { messageText: text.trim() });
            }
        `
    },

    'message:submit': {
        isAsync: false,
        args: ['payload'],
        body: `
            if (this.processing) return;
            this.processing = true;

            const fullContainer = this.queryUiTree({ styleId: 'full-container' });
            if (fullContainer) {
                this.eventBus.emit('datastore:addNode', { parentUid: fullContainer.uid, nodeToAdd: this.spinnerNode });
            }
            
            const userNode = { tag: 'div', styleId: 'user-bubble', children: [payload.messageText] };
            
            const chatContainer = this.queryUiTree({ styleId: 'chat-container' });
            if (chatContainer) {
                this.eventBus.emit('datastore:addNode', { parentUid: chatContainer.uid, nodeToAdd: userNode });
            }

            this.viewStateFacade.clearValue({ styleId: 'input-field' });
            
            this.eventBus.emit('api:send-message', payload);
        `
    },

    'api:message-response': {
        args: ['payload'],
        body: `
            let parsedResponse;
            const rawResponse = payload.aiResponse;

            try {
                // 1. First, attempt to parse the raw response directly.
                // This is the ideal case for a perfectly formatted response.
                parsedResponse = JSON.parse(rawResponse);
            } catch (directParseError) {
                // 2. If the direct parse fails, try to extract JSON from a markdown block or other text.
                console.warn("Direct JSON.parse failed. Attempting to extract from text.", directParseError);
                
                // This regex finds the first '{' and the last '}' and grabs everything in between.
                const jsonMatch = rawResponse.match(/{[\\s\\S]*}/);

                if (jsonMatch && jsonMatch[0]) {
                    try {
                        // Attempt to parse only the extracted string.
                        parsedResponse = JSON.parse(jsonMatch[0]);
                    } catch (extractionParseError) {
                        console.error("Failed to parse the extracted JSON string:", extractionParseError);
                        parsedResponse = null; // Ensure failure is recorded.
                    }
                } else {
                    parsedResponse = null; // Ensure failure is recorded if no JSON object is found.
                }
            }

            const chatContainer = this.queryUiTree({ styleId: 'chat-container' });
            if (!chatContainer) return;


            // 3. If parsing failed at any stage, display a single, consistent error and stop.
            if (!parsedResponse) {
                const errorNode = {
                    tag: 'div',
                    styleId: 'ai-bubble',
                    children: [
                        "I'm sorry, I had a formatting error. Here is the raw data:",
                        { tag: 'pre', style: { 'white-space': 'pre-wrap', 'word-break': 'break-all' }, children: [rawResponse] }
                    ]
                };
                this.eventBus.emit('datastore:addNode', { parentUid: chatContainer.uid, nodeToAdd: errorNode });
                return; // Stop processing
            }

            // 1. Display the conversational response text
            if (parsedResponse.responseText) {
                const aiNode = { tag: 'div', styleId: 'ai-bubble', children: [parsedResponse.responseText] };
                this.eventBus.emit('datastore:addNode', { parentUid: chatContainer.uid, nodeToAdd: aiNode });
            }

            // 2. Apply any new style functions
            if (parsedResponse.styleFuncText) {
                this.eventBus.emit('datastore:addStyleFunc', { funcString: parsedResponse.styleFuncText });
            }

            // 3. Loop through the commands array and dispatch events directly
            if (parsedResponse.commands && Array.isArray(parsedResponse.commands)) {
                for (const cmd of parsedResponse.commands) {
                    if (!cmd.command) continue; // Skip malformed commands

                    switch (cmd.command) {
                        case 'addNode':
                            this.eventBus.emit('datastore:addNode', { parentUid: cmd.targetUid, nodeToAdd: cmd.payload });
                            break;
                        case 'updateNode':
                            this.eventBus.emit('datastore:updateNode', { targetUid: cmd.targetUid, newNodeData: cmd.payload });
                            break;
                        case 'removeNode':
                            this.eventBus.emit('datastore:removeNode', { targetUid: cmd.targetUid });
                            break;
                        case 'addLogic':
                            this.eventBus.emit('datastore:addControllerEvent', { eventName: cmd.eventName, eventConfig: cmd.payload });
                            break;
                        case 'updateLogic':
                            this.eventBus.emit('datastore:updateControllerEvent', { eventName: cmd.eventName, eventConfig: cmd.payload });
                            break;
                        case 'removeLogic':
                            this.eventBus.emit('datastore:removeControllerEvent', { eventName: cmd.eventName });
                            break;
                        default:
                            console.warn('Unknown command received from AI:', cmd.command);
                    }
                }
            }
        `
    },

    'process:complete': {
        args: ['payload'],
        body: `
            this.processing = false;
            this.eventBus.emit('ui:set-processing-state', { isProcessing: false });
            this.eventBus.emit('datastore:removeNode', { targetUid: 'system-loading-spinner' });
        `
    },
        
    'error:api': {
        args: ['payload'],
        body: `
            console.error('API Error:', payload.error);
            this.eventBus.emit('ui:add-error-bubble', { text: "My apologies, an error occurred." });
        `
    },
}