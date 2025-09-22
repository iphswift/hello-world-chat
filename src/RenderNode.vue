<template>
  <component :is="node.tag" v-bind="finalProps" :uid="node.uid">
    <template v-for="(child, index) in node.children || []" :key="index">
      <RenderNode 
        v-if="isObject(child)" 
        :node="child" 
        :generate-props="generateProps" 
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
    generateProps: { type: Function, required: true },
    index: { type: Number, default: 0 },
  },
  computed: {
    finalProps() {
      const props = this.generateProps(this.node, this.index);
      if (this.node.publishEvents) {
        for (const domEventName in this.node.publishEvents) {
          const handlerName = `on${domEventName.charAt(0).toUpperCase() + domEventName.slice(1)}`;
          const eventConfig = this.node.publishEvents[domEventName];

          props[handlerName] = (domEvent) => {
            if (eventConfig.payload) {
                const stateUpdatePayload = { 
                    uid: this.node.uid, 
                    propToUpdate: eventConfig.payload.propToUpdate,
                    newValue: eventConfig.payload.valueFrom
                        ? getValueFromPath(domEvent, eventConfig.payload.valueFrom)
                        : undefined                };            
                eventBus.emit('viewState:update', stateUpdatePayload);
            }
            if (eventConfig.emit) {
                // MODIFIED: Emit a structured payload with both domEvent and the node
                const eventPayload = {
                  domEvent: domEvent,
                  node: this.node
                };
                eventBus.emit(eventConfig.emit, eventPayload); 
            }
          };
        }
      }
      return props;
    },
  },
  methods: {
    isObject(value) {
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
  }
};
</script>