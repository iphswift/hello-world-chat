<template>
  <RenderNode
    v-if="uiTree"
    :node="uiTree"
    :generate-props="generateProps"
  />
</template>

<script>
import { eventBus } from './eventBus.js';
import { DataStore } from './DataStore.js';
import AppController from './AppController.js';
import { controllerLogic } from './controllerLogic.js';
import RenderNode from './RenderNode.vue';
import { viewState, initViewState, getViewStateValue, clearViewStateValue, getDOMElementByQuery } from './viewState.js';

export default {
    name: 'ChatWidget',
    components: { RenderNode },
    data() {
        return {
            appController: null,
            uiTree: null,
            styleFunctions: [],
            prompts: {
                reasoning: '',
                execution: '',
                currentState: ''
            },
            styles: {
                'full-container': {
                   position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: 'calc(100vh - 10rem)',
                    maxHeight: 'calc(100vh - 10rem)',
                    margin: '5rem',
                },
                'chat-container': {
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '.75rem',
                    gap: '2rem',
                    overflow: 'auto',
                    width: '100%',
                    marginBottom: '5rem',
                },
                'user-bubble': {
                    padding: '1rem',
                    border: '1px solid #ccc',
                    borderRadius: '10px',
                    backgroundColor: '#f0f0f0',
                    fontSize: '1.2rem',
                    width: 'fit-content',
                    height: 'fit-content',
                    maxWidth: '40%',
                    textAlign: 'left',
                    marginLeft: 'auto',
                    fontFamily: '"Roboto", sans-serif',
                },
                'ai-bubble': {
                    padding: '1rem',
                    border: '1px solid #ccc',
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    fontSize: '1.2rem',
                    width: 'fit-content',
                    height: 'fit-content',
                    maxWidth: '80%',
                    textAlign: 'left',
                    marginRight: 'auto',
                    fontFamily: '"Roboto", sans-serif',
                },
                'input-container': {
                    backgroundColor: '#ffffff',
                    border: '2px solid #ccc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginTop: 'auto',
                    borderRadius: '10px',
                    padding: '.75rem',
                    margin: '0 5rem',
                    width: 'calc(100% - 1.5rem)',
                    gap: '1rem',
                },
                'input-field': {
                    fontSize: '1.2rem',
                    fontFamily: '"Roboto", sans-serif',
                    border: 'none',
                    overflowWrap: 'break-word',
                    width: '100%',
                    lineHeight: '1.5rem',
                    maxHeight: 'calc(1.5rem * 6)',
                    overflowY: 'auto',
                    resize: 'none',
                },
                'input-icon': {
                    padding: '.7rem',
                    marginLeft: 'auto',
                    marginRight: '1rem',
                    borderRadius: '50%',
                    transition: 'background-color 0.3s',
                },
                'loading': {
                    position: 'absolute',
                    top: '0',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.7)',
                },
                'spinner': {
                    fontSize: '2rem',
                },
            },
        };
    },
    created() {
      eventBus.on('datastore:uiTree-updated', (payload) => {
        console.log("UI Tree updated:", payload.uiTree);
        this.uiTree = JSON.parse(JSON.stringify(payload.uiTree));
        this.updateSystemPrompts();
      });
      eventBus.on('datastore:styles-updated', (payload) => this.styleFunctions = [...payload.styleFunctions]);
      
      initViewState();
      DataStore.init();
      
      const uiTreeQuerier = (query) => {
        if (!query) return DataStore.uiTree;
        return DataStore.findNodeByQuery(query);
      };
      const viewStateFacade = {
        getValue: (query) => getViewStateValue(query, DataStore),
        clearValue: (query) => clearViewStateValue(query, DataStore),
        getDOMElement: (query) => getDOMElementByQuery(query, DataStore),
      };

      this.appController = new AppController(
        () => `${this.prompts.execution}\n${this.prompts.currentState}`,
        controllerLogic,
        uiTreeQuerier,
        viewStateFacade
      );
    },
    beforeUnmount() {
      if (this.appController) {
        this.appController.destroy();
      }
    },
    methods: {
        generateProps(node, index) {
          const finalProps = { ...node.props };
          let style = {
            ...(this.styles[node.styleId] || {}),
            ...(node.props && node.props.style || {})
          };
          for (const func of this.styleFunctions) {
            style = func(style, node.styleId, node.styleGroupId, index);
          }
          finalProps.style = style;
          const state = viewState.nodesByUid[node.uid];
          if (state) {
            Object.assign(finalProps, state);
          }
          return finalProps;
        },
        
        updateSystemPrompts() {
            const controllerLogicForPrompt = JSON.stringify(DataStore.controllerLogic, (key, value) => {
                if (key === 'body') {
                    return value.replace(/\\n/g, '\\n').replace(/"/g, '\\"');
                }
                return value;
            }, 2);
            
            const currentState = `
              Current Styles Object: ${JSON.stringify(this.styles)}
              Current UI Tree: ${JSON.stringify(this.uiTree)}
              Current Controller Logic: ${controllerLogicForPrompt}
            `;

            // MODIFIED: This prompt is now ONLY for planning and MUST output TEXT.
            const reasoningInfo = `
              Your task is to act as an architect and create a step-by-step plan to fulfill the user's request. Your SOLE output should be a plan written in plain text. This plan will be given to another AI responsible for writing the final JSON code. Do not generate JSON.

              Here are the available commands and their payload structures:
              1.  "addNode": Adds a new UI element.
              2.  "updateNode": Replaces an entire UI element with a new one.
              3.  "removeNode": Removes a UI element.
              4.  "addLogic": Adds a new event handler.
              5.  "updateLogic": Updates an existing event handler.
              6.  "removeLogic": Removes an event handler.

              ---

              HOW THE UI FRAMEWORK WORKS:
              When a user interacts with an element with a 'publishEvents' block, the system fires an event. The logic handler for that event receives a single payload object with two properties: **payload.domEvent** (the raw DOM Event) and **payload.node** (the complete UI node object).

              ---

              HOW TO FORMULATE A PLAN (Architectural Approach):
              To create your plan, you MUST follow this reasoning process. Your final output should be a clear articulation of steps 3 and 4.
              1.  **Identify User Goal**: (e.g., "The user wants a button that can alert its own text content.")
              2.  **Formulate a Conceptual Solution**: (e.g., "I will add a button. When clicked, it will trigger an action that reads the button's text and displays it.")
              3.  **Architect the UI Solution**: (e.g., "Plan Step 1: Use an 'addNode' command for a <button> with a 'publishEvents' block to emit a unique event like 'ui:show-text-click'.")
              4.  **Design the Logic Architecture**: (e.g., "Plan Step 2: Use an 'addLogic' command for 'ui:show-text-click'. The handler's body will access 'payload.domEvent.target.innerText' for the alert().")
            `;

            const executionInfo = `
              Your SOLE function is to act as a JSON endpoint. Your entire response must be a single, valid JSON object, starting with '{' and ending with '}'. Do not include markdown formatting like "\\\`\\\`\\\`json".

              The response JSON must conform to the following schema:
              {
                "responseText": "A friendly, conversational message for the user.",
                "styleFuncText": "A string containing a JavaScript arrow function for dynamic styles. Example: '(style, styleId) => { if (styleId === \\'user-bubble\\') style.color = \\'blue\\'; return style; }'",
                "commands": "[ An array of command objects to modify the UI or logic. ]"
              }

              A 'command' object must have: { "command": "(String)", "targetUid": "(String)", "eventName": "(String)", "payload": "(Object)" }

              EXAMPLE OF A FULL RESPONSE:
              {
                "responseText": "Certainly! I've added a new 'Welcome' button.",
                "styleFuncText": "",
                "commands": [
                  {
                    "command": "addNode",
                    "targetUid": "chat-container",
                    "payload": { "tag": "button", "styleId": "welcome-btn", "children": ["Welcome!"], "publishEvents": { "click": { "emit": "ui:welcome-btn-click" } } }
                  },
                  {
                    "command": "addLogic",
                    "eventName": "ui:welcome-btn-click",
                    "payload": { 
                      "args": ["payload"], 
                      "body": "const buttonText = payload.domEvent.target.innerText; alert('The button says: ' + buttonText);" 
                    }
                  }
                ]
              }

              ---
              
              Inside 'responseText', adopt an enthusiastic tone, suggest UI improvements, and build on what's there. The 'responseText' is ALWAYS displayed automatically; do not add a command to display it again.

              If you cannot fulfill the request, you must still respond with valid JSON, using 'responseText' to explain the issue and an empty 'commands' array.
            `;

            const newPrompts = {
                reasoning: reasoningInfo,
                execution: executionInfo,
                currentState: currentState,
            };
            this.prompts = newPrompts;
            eventBus.emit('api:update-system-prompts', newPrompts);
        }
    },
};
</script>