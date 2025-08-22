# GenAI Hello World - Gemini Chat

A simple demonstration of integrating with GenAI in the form of a ChatBot.

## ✨ Features

* **Chat Interface:** A text input and scrolling chat view for a conversation.
* **Gemini Flash 2.5 Integration:** Messages get sent to Gemini 2.5 Flash for responses.
* **Chat History:** Messages earlier in the conversation are included in the chat.

## 🚀 How to Use

To run this project locally:

1. Clone the repository:
    ```
    git clone https://github.com/iphswift/hello-world-chat.git
    ```
2. Navigate to the project directory:
    ```
    cd hello-world-chat
    ```
3. Install any necessary packages:
    ```
    npm install
    ```
4. Add your [API Key](https://aistudio.google.com/prompts/new_chat) to the `.env` file:
    ```
    VITE_GOOGLE_API_KEY=your_api_key_here
    ```
5. Launch the development server:
    ```
    npm run dev
    ```
6. Navigate to the website in your browser. This should be `http://localhost:5173`, but it may be at another address.

That's it! Now you can type in the text box and press enter or click the send arrow button to converse with the AI!

## 🛠️ How It Works

The code is written in a single Vue component (`ChatWidget.vue`). It uses the `@google/genai` library to interact with the Gemini Flash 2.5 model. User messages are sent to the model, and the responses are displayed in a chat interface.

## 💻 Technologies Used

* **Vue.js 3.5** Frontend framework for building the user interface.
* **Vite:** Development server and build tool.
* **Google GenAI SDK:** For interacting with the Gemini Flash 2.5 model.
* **Font Awesome:** Icons for the chat interface.
