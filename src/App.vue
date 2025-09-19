<script setup>
import ChatWidget from './ChatWidget.vue';
</script>

<template>
    <div id="app" :style="{ backgroundColor: backgroundColor }">
        <ChatWidget @background-color-change="updateBackgroundColor" />
    </div>
</template>

<script>
import ChatWidget from './ChatWidget.vue';

export default {
    name: 'App',
    components: {
        ChatWidget,
    },
    data() {
        return {
            backgroundColor: '#FFFFFF', 
        };
    },
    methods: {
        updateBackgroundColor(newColor) {
            this.backgroundColor = newColor;
        },
    },
};
</script>

<style>
#app {
    height: 100vh; 
    width: 100vw; 
    margin: 0;
    padding: 0;
    box-sizing: border-box; 
    overflow: hidden; 
}
</style>
