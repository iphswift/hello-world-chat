<template>
  <DynamicStyles :styles="styles" />
  <RenderNode
    v-if="uiTree"
    :node="uiTree"
  />
  <button @click="handleStartOver" class="start-over-btn">Start Over</button>
</template>

<script>
import { eventBus } from './eventBus.js';
import { DataStore } from './DataStore.js';
import AppController from './AppController.js';
import { controllerLogic } from './controllerLogic.js';
import RenderNode from './RenderNode.vue';
import DynamicStyles from './DynamicStyles.vue';
import { apiService } from './apiService.js'; 
import { viewState, initViewState, getViewStateValue, clearViewStateValue, getDOMElementByQuery } from './viewState.js';

export default {
    name: 'ChatWidget',
    components: { RenderNode, DynamicStyles },
    data() {
        return {
            appController: null,
            uiTree: null,
            prompts: {
                reasoning: '',
                execution: '',
                currentState: ''
            },
            styles: {},            
        };
    },
    created() {
      eventBus.on('datastore:uiTree-updated', (payload) => {
        this.uiTree = JSON.parse(JSON.stringify(payload.uiTree));
        this.updateSystemPrompts();
      });
      eventBus.on('datastore:styles-updated', (payload) => {
        this.styles = { ...payload.styles }; 
      });      
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
        DataStore.controllerLogic,
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
        handleStartOver() {
            // 1. Prompt the user for confirmation.
            const isConfirmed = window.confirm(
                'Are you sure you want to start over? This will erase all changes and restore the initial configuration.'
            );

            // 2. If confirmed, clear the specific localStorage keys and reload.
            if (isConfirmed) {
                localStorage.removeItem('app_controller_logic');
                localStorage.removeItem('app_styles');
                localStorage.removeItem('app_ui_tree');
                
                // 3. Reload the page. The application will now load the default
                // state from the initial configuration files.
                window.location.reload();
            }
        },
        updateSystemPrompts() {
            const controllerLogicForPrompt = JSON.stringify(DataStore.controllerLogic, null, 2);
            
            // We only need to generate the currentState now.
            const currentState = `
              Current Styles Object: ${JSON.stringify(this.styles, null, 2)}
              Current UI Tree: ${JSON.stringify(this.uiTree, null, 2)}
              Current Controller Logic: ${controllerLogicForPrompt}
            `;

            // The reasoning and execution info are gone from the client.
            // The new prompts object is much smaller.
            const newPrompts = {
                currentState: currentState,
            };

            this.prompts = newPrompts;
            // The apiService will now send this much smaller object to the backend.
            eventBus.emit('api:update-system-prompts', newPrompts);
        }
    },
};
</script>
<style scoped>
.start-over-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 18px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-family: "Roboto", sans-serif;
  font-size: 1rem;
  font-weight: 500;
  z-index: 9999; /* Ensure it's on top of other UI elements */
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  transition: background-color 0.2s ease-in-out;
}
.start-over-btn:hover {
  background-color: #c82333;
}
</style>