export const controllerLogic = {
    'ui:input-keypress': {
        args: ['payload'],
        body: `
            const domEvent = payload.domEvent;
            if (domEvent.type === 'keypress' && domEvent.key === 'Enter') {
                domEvent.preventDefault();
                const text = domEvent.target.value; 
                if (text && text.trim()) {
                    this.emit('message:submit', { 
                        messageText: text.trim(),
                        targetUid: payload.node.uid
                    });
                }
            }
        `,
    },
        
    'ui:submit-request': {
        isAsync: false,
        args: ['payload'],
        body: `
            const targetQuery = payload.node.behavior?.targetQuery;
            if (!targetQuery) return;
            const targetElement = this.getDOMElement(targetQuery);
            if (!targetElement) return;
            const text = targetElement.value; 
            if (text && text.trim()) {
                this.emit('message:submit', { 
                    messageText: text.trim(),
                    targetUid: targetElement.getAttribute('data-uid')
                });
            }
        `
    },    
    
    'message:submit': {
        isAsync: true,
        args: ['payload'],
        body: `
            if (this.processing) return;
            this.processing = true;
        
            const fullContainer = this.queryUiTree({ presentation: { className: 'full-container' } });
            if (fullContainer) {
                // Add the spinner
                this.emit('datastore:addNode', { parentUid: fullContainer.uid, nodeToAdd: this.spinnerNode });
                
                // NEW: Add the status message node right after the spinner
                const statusMessageNode = {
                    tag: 'div',
                    queryId: 'system-status-message',
                    attributes: { 
                        style: { 
                            position: 'absolute',
                            top: 'calc(50% + 40px)', // Position below spinner
                            textAlign: 'center',
                            width: '100%',
                            color: '#555',
                            fontFamily: '"Roboto", sans-serif',
                        }
                    },
                    children: ['Initializing...']
                };
                this.emit('datastore:addNode', { siblingUid: 'system-loading-spinner', position: 'after', nodeToAdd: statusMessageNode });
            }
        
            const userNode = { 
                tag: 'div', 
                presentation: { className: 'user-bubble' }, 
                children: [payload.messageText] 
            };
            const chatContainer = this.queryUiTree({ presentation: { className: 'chat-container' } });
            if (chatContainer) {
                this.emit('datastore:addNode', { parentUid: chatContainer.uid, nodeToAdd: userNode });
                this.emit('ui:scroll-to-bottom');
            }
        
            const inputElement = this.getDOMElement({ uid: payload.targetUid });
            if (inputElement) {
                inputElement.value = '';
            }
        
            this.emit('api:send-message', { messageText: payload.messageText });
        `
    },

    'api:message-response': {
        args: ['payload'],
        body: `
            const rawResponse = payload.aiResponse;
            const chatContainer = this.queryUiTree({ presentation: { className: 'chat-container' } });

            // A good defensive check to prevent trying to parse non-string payloads.
            if (typeof rawResponse !== 'string') {
                console.error('api:message-response received an invalid payload. Expected a string.', payload);
                this.emit('process:complete'); // Clean up even if the payload is bad.
                return;
            }
            
            try {
                if (!chatContainer) {
                    console.error('Could not find chat container.');
                    return; // Exit, but finally will still run.
                }

                let parsedResponse = null;

                // Attempt 1: Parse the raw string directly.
                try {
                    parsedResponse = JSON.parse(rawResponse);
                } catch (e) {
                    // This is not an error, just a failed attempt. Move to fallback.
                }

                // Attempt 2: If the first attempt failed, try to extract and parse.
                if (!parsedResponse) {
                    try {
                        const jsonMatch = rawResponse.match(/{[\\s\\S]*}/);
                        if (jsonMatch && jsonMatch[0]) {
                            parsedResponse = JSON.parse(jsonMatch[0]);
                        }
                    } catch (e) {
                        // Fallback also failed. parsedResponse remains null.
                    }
                }

                // After all attempts, check if we have a valid response.
                if (parsedResponse) {
                    // --- SUCCESS LOGIC ---
                    if (parsedResponse.responseText) {
                        const aiNode = { 
                            tag: 'div', 
                            presentation: { className: 'ai-bubble' }, 
                            children: [parsedResponse.responseText] 
                        };
                        this.emit('datastore:addNode', { parentUid: chatContainer.uid, nodeToAdd: aiNode });
                        this.emit('ui:scroll-to-bottom');
                    }
                
                    if (parsedResponse.commands && Array.isArray(parsedResponse.commands)) {
                        for (const cmd of parsedResponse.commands) {
                            if (!cmd.command) continue;
                            switch (cmd.command) {
                                case 'addNode':
                                    this.emit('datastore:addNode', { parentUid: cmd.targetUid, nodeToAdd: cmd.payload });
                                    break;
                                case 'updateNode':
                                    this.emit('datastore:updateNode', { targetUid: cmd.targetUid, targetQuery: cmd.targetQuery, newNodeData: cmd.payload });
                                    break;
                                case 'removeNode':
                                    this.emit('datastore:removeNode', { targetUid: cmd.targetUid, targetQuery: cmd.targetQuery});
                                    break;
                                case 'addLogic':
                                    this.emit('datastore:addControllerEvent', { eventName: cmd.eventName, eventConfig: cmd.payload });
                                    break;
                                case 'updateLogic':
                                    this.emit('datastore:updateControllerEvent', { eventName: cmd.eventName, eventConfig: cmd.payload });
                                    break;
                                case 'removeLogic':
                                    this.emit('datastore:removeControllerEvent', { eventName: cmd.eventName });
                                    break;
                                case 'addStyle':
                                    this.emit('datastore:addStyle', { className: cmd.className, styleObject: cmd.payload });
                                    break;
                                case 'updateStyle':
                                    this.emit('datastore:updateStyle', { className: cmd.className, styleObject: cmd.payload });
                                    break;
                                case 'removeStyle':
                                    this.emit('datastore:removeStyle', { className: cmd.className });
                                    break;
                                default:
                                    console.warn('Unknown command received from AI:', cmd.command);
                            }
                        }
                    }
                } else {
                    // --- FAILURE LOGIC ---
                    console.error('--- AI Response Parsing Failed ---');
                    console.log('Raw Response:', rawResponse);
                    const errorNode = {
                        tag: 'div',
                        presentation: { className: 'ai-bubble' },
                        children: ["My apologies, I encountered a formatting error. Let's try that again."]
                    };
                    this.emit('datastore:addNode', { parentUid: chatContainer.uid, nodeToAdd: errorNode });
                    this.emit('ui:scroll-to-bottom');
                }
            } finally {
                // THIS ALWAYS RUNS, ensuring the spinner is removed and the app is responsive again.
                this.emit('process:complete');
            }
        `
    },
    'process:complete': {
        args: ['payload'],
        body: `
        this.processing = false;
     
        this.emit('datastore:removeNode', { targetQuery: { queryId: 'system-status-message' }});
        this.emit('datastore:removeNode', { targetUid: 'system-loading-spinner' });
    `    },
        
    'error:api': {
        args: ['payload'],
        body: `
            console.error('API Error:', payload.error);
            const chatContainer = this.queryUiTree({ presentation: { className: 'chat-container' } });
            if (chatContainer) {
                 const errorNode = { 
                    tag: 'div', 
                    presentation: { className: 'ai-bubble' },
                    attributes: { style: { border: '1px solid red' } },
                    children: ["My apologies, an error occurred while connecting to the server."]
                };
                this.emit('datastore:addNode', { parentUid: chatContainer.uid, nodeToAdd: errorNode });
            }
        `
    },

    'ui:scroll-to-bottom': {
        args: ['payload'],
        body: `
            const chatContainerElement = this.getDOMElement({ presentation: { className: 'chat-container' } });
            if (chatContainerElement) {
                setTimeout(() => {
                    chatContainerElement.scrollTop = chatContainerElement.scrollHeight;
                }, 0);
            }
        `
    }
}