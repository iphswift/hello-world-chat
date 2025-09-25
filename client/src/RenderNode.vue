<template>
  <component :is="node.tag" v-bind="finalProps">
    <template v-for="(child, index) in node.children || []" :key="index">
      <RenderNode 
        v-if="isObject(child)" 
        :node="child"
        :index="index"
      />
      <template v-else>
        {{ child }}
      </template>
    </template>
  </component>
</template>

<script>
import { eventBus } from './eventBus.js';

function getValueFromPath(object, path) {
  return path.split('.').reduce((o, k) => (o || {})[k], object);
}

export default {
  name: 'RenderNode',
  props: {
    node: { type: Object, required: true },
    index: { type: Number, default: 0 },
  },
  computed: {
    finalProps() {
      const finalProps = { ...(this.node.attributes || {}) };
      
      finalProps['data-uid'] = this.node.uid;
      
      if (this.node.presentation?.className) {
        finalProps.class = [finalProps.class, this.node.presentation.className].filter(Boolean).join(' ');
      }

      const eventHandlers = this.node.behavior?.eventHandlers;
      if (eventHandlers) {
        for (const domEventName in eventHandlers) {
          const handlerName = `on${domEventName.charAt(0).toUpperCase() + domEventName.slice(1)}`;
          const eventConfig = eventHandlers[domEventName];

          finalProps[handlerName] = (domEvent) => {
            if (eventConfig.payload) {
                const stateUpdatePayload = { 
                    uid: this.node.uid, 
                    propToUpdate: eventConfig.payload.propToUpdate,
                    newValue: eventConfig.payload.valueFrom
                        ? getValueFromPath(domEvent, eventConfig.payload.valueFrom)
                        : undefined                
                };            
                eventBus.emit('viewState:update', stateUpdatePayload);
            }
            if (eventConfig.emit) {
                const eventPayload = {
                  domEvent: domEvent,
                  node: this.node
                };
                eventBus.emit(eventConfig.emit, eventPayload); 
            }
          };
        }
      }
      return finalProps;
    },
  },
  methods: {
    isObject(value) {
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
  }
};
</script>