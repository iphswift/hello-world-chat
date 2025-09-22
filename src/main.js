import { createApp } from 'vue';
import App from './App.vue';
import '@fortawesome/fontawesome-free/css/all.css';
import { apiService } from './apiService.js'; // Import ApiService to ensure it initializes

createApp(App).mount('#app');
