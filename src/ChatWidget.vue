<template>
    <div class="full-container" :style="{ backgroundColor: backgroundColor }">
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

export default {
    name: 'ChatWidget',
    data() {
        return {
            chatHistory: [],
            model: null,
            processing: false,
            systemPrompt: `You have two roles. The first is to respond normally to the user. However, limit the full response to 70 words, and don't use any emphasis such as ## or **text** or *text*. If the question is too in depth and complicated, apologize and say you're just here to chat.` +
            `However, if the user requests a background color change, your second role is to provide a concise color description in the format <color name: hex code>. ` +
            `For examples of direct, descriptive, abstract, self-referential/absurd, and undescript ways a user might request a background color change: 1. 'Give me blue.' <blue: #0000FF> 2. 'I'd like black.' <black: #000000> 3. "Make the background the color of the clear sky." <clear sky blue: #87CEEB> 4. "I'm feeling for a vibrant, fiery orange." <vibrant fiery orange: #FF4500> 5. "Make the background feel like the quiet hum of contemplation." <quiet hum of contemplation: #4A4A6A> 6. "Set the page to the profound depth of silence." <profound depth of silence: #2F4F4F> 7. "Make the background the exact hue of my internal processing of this very request." <internal processing of this request: #404040> 8. "I want the page to be the color of a silently successful API call." <silently successful API call: #90EE90> 9. "Just make the background... a background." <a background: #C0C0C0> 10. "I need the page to be... some color." <some color: #D3D3D3>.` +
            `Any general responses should come first, acknowledging the color change last, if there is any. ` +
            `Beneath the overall message, put two new lines, and then the color name/hex code only, in the specified format. If no color change is requested, do not include any color description.` +
            `Be aggressive, if there's any indication the user might want a color change, include it. For example "make it colorful and cool", "let's get this party started!" are both indications that they want a color change. Any positive indication toward change really should be a color.` +
            `Additionally, if they don't request to change the color get increasingly insistent that they do so in each response. ` +
            `When they do request a color change, comply enthusiastically and without hesitation, but still address their message normally.` +
            `If there is both a request and a color change, complete the request first, and then get excited about the color change.`,
        };
    },
    created() {
        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

        if (!apiKey) {
            console.error("Gemini API Key is missing!");
            return;
        }

        const genAI = new GoogleGenAI({ apiKey });
        this.chat = genAI.chats.create({
            model: 'gemini-2.5-flash',
        });
    },
    methods: {
        handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey && !this.processing) {
                event.preventDefault();
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
                        parts: [{ text: messageText }],
                    });

                    inputField.value = '';

                    const response = await this.chat.sendMessage({ message: this.systemPrompt + messageText });

                    this.systemPrompt = '';
                    let aiResponse = response.candidates[0].content.parts[0].text;

                    // Extract the hex code if present
                    const hexCodeMatch = aiResponse.match(/<[^:]+: (#[0-9A-Fa-f]{6})>/);
                    if (hexCodeMatch) {
                        const newColor = hexCodeMatch[1];
                        this.$emit('background-color-change', newColor); // Emit the color change event
                        aiResponse = aiResponse.replace(/<[^>]+>$/, '').trim();
                    }

                    this.chatHistory.push({
                        role: 'model',
                        parts: [{ text: aiResponse }],
                    });
                }
            } catch (error) {
                console.error('Error sending message:', error);
                this.chatHistory.push({ role: 'model', parts: [{ text: 'Sorry, I encountered an error.' }] });
            } finally {
                this.processing = false;
            }
        },
    },
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
    font-family: "Roboto", sans-serif;
}

.ai-bubble {
    padding: 1rem;
    border: 1px solid #ccc;
    background-color: #ffffff;
    border-radius: 10px;
    font-size: 1.2rem;
    width: fit-content;
    height: fit-content;
    max-width: 80%;
    text-align: left;
    margin-right: auto;
    font-family: "Roboto", sans-serif;
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
    background-color: #ffffff;
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
    font-family: "Roboto", sans-serif;
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