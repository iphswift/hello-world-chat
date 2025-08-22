<template>
    <div class="full-container">
        <div class="chat-container">
            <div v-for="(element, index) in chatHistory" :key="index">
                <div v-if="element.role === 'model'" class="ai-bubble">{{ element.parts[0].text }}</div>
                <div v-else class="user-bubble">
                    {{ element.parts[0].text }}
                </div>
            </div>
        </div>
        <div class="input-container" style="position: relative; pointer-events: none;" :style="{ opacity: processing ? 0.5 : 1 }">
            <textarea 
                class="input-field" 
                placeholder="Type your message here..." 
                @keydown="handleKeyPress"
                ref="inputField"
                :disabled="processing"
                style="pointer-events: auto;"
            ></textarea>
            <i 
                class="input-icon fa fa-arrow-right" 
                aria-hidden="true" 
                @click="sendMessage"
                :class="{ 'disabled-icon': processing }"
                style="pointer-events: auto;"
            ></i>
            <div v-if="processing" class="loading">
                <i class="fa fa-spinner fa-spin" style="font-size: 2rem;"></i>
            </div>
        </div>
    </div>
</template>

<script>
import { GoogleGenAI } from '@google/genai';
import { onMounted } from 'vue';

export default {
    name: 'ChatWidget',
    data() {
        return {
            chatHistory: [],
            model: null,
            processing: false,
        };
    },
    created() {
        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY; // Use Vite's import.meta.env

        // 2. (Optional but recommended) Check if the key exists before using it.
        if (!apiKey) {
            console.error("Gemini API Key is missing!");
            return; // Stop the initialization if the key is not found
        }

        // 3. Pass the key directly to the constructor.
        const genAI = new GoogleGenAI({apiKey});
        this.chat = genAI.chats.create({
            model: 'gemini-2.5-flash',
        });
    },

    methods: {
        handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey && !this.processing) {
                event.preventDefault(); // Prevent adding a new line
                this.processing = true;
                this.sendMessage();
            }
        },
        async sendMessage() {
            const inputField = this.$refs.inputField;
            const messageText = inputField.value.trim();

            try {
                if (messageText) {
                    this.chatHistory.push({
                        role: 'user',
                        parts: [{
                            text: messageText
                        }]
                    });

                    inputField.value = '';

                    const response = await this.chat.sendMessage({message: messageText});

                    this.chatHistory.push({
                        role: 'model',
                        parts: response.candidates[0].content.parts
                    });
                }
            } catch (error) {
                console.error("Error sending message:", error);
                chatHistory.value.push({ role: 'model', parts: [{ text: "Sorry, I encountered an error." }] });
            } finally {
                this.processing = false;
            }
        }
    }
};
</script>

<style scoped>
.user-bubble {
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 10px;
    background-color: #f0f0f0f0;
    font-size: 1.2rem;
    width: fit-content;
    height: fit-content;
    max-width: 40%;
    text-align: left;
    margin-left: auto;
}

.ai-bubble {
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 10px;
    font-size: 1.2rem;
    width: fit-content;
    height: fit-content;
    max-width: 80%;
    text-align: left;
    margin-right: auto;
}

.chat-container {
    display: flex;
    flex-direction: column;
    padding: .75rem;
    gap: 2rem;
    overflow: auto;
    width: 100%;
    margin-bottom: 5rem;
}

.input-container {
    border: 2px solid #ccc;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: auto;
    border-radius: 10px;
    padding: .75rem;
    margin-right: 5rem;
    margin-left: 5rem;
    width: calc(100% - 1.5rem);
    gap: 1rem;
}

.input-field {
    font-size: 1.2rem;
    font-family: "Times New Roman", serif;
    border: none;
    overflow-wrap: break-word;
    width: 100%;
    field-sizing: content;
    --line-height: 1.5rem;
    line-height: var(--line-height);
    max-height: calc(var(--line-height) * 6);
    overflow-y: auto;
    resize: none;
}
.input-icon {
    padding: .7rem;
    margin-left: auto;
    margin-right: 1rem;
    border-radius: 50%;
    transition: background-color 0.3s;
}

.input-icon:hover {
    background-color: #f0f0f0;
}

.input-icon:active {
    background-color: #c0c0c0;
}

.full-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 10rem);
    max-height: calc(100vh - 10rem);
    margin-left: 5rem;
    margin-right: 5rem;
    margin-top: 5rem;
    margin-bottom: 5rem;
}

.loading {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(255,255,255,0.7);
}
</style>