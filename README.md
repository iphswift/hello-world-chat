# AI FOR FUN - A Live UI Design with AI

This project is an advanced web application where you interact with a Gemini-powered AI to build, modify, and style the application itself in real-time. It's not just a chatbot; it's a dynamic, AI-driven development environment where the AI acts as your front-end development partner.

---

## ✨ Features

* **Real-Time UI Manipulation:** Instruct the AI to add, update, and remove UI elements on the fly.
* **Dynamic Styling:** Change the application's appearance by asking the AI to add or modify CSS styles.
* **Live Logic Programming:** Add and update JavaScript event handlers to create new interactive behaviors.
* **State Persistence:** All AI-driven changes to UI, styles, and logic are saved to `localStorage`, persisting across sessions.
* **Two-Step AI Reasoning:** A Node.js backend prompts the AI to first create a logical plan and then execute it by generating a structured JSON command list.
* **Self-Healing JSON:** The backend automatically asks the AI to correct its own malformed JSON output, increasing reliability.
* **Reset to Default:** A "Start Over" button allows you to wipe all changes and return to the application's initial state.

---

## 🚀 How to Use

This project has a Node.js backend and a Vue.js frontend, which must be run separately in two terminals.

### Backend Setup

1.  Clone the repository:
    ```bash
    git clone [https://github.com/iphswift/hello-world-chat.git](https://github.com/iphswift/hello-world-chat.git)
    ```
2.  Navigate to the project directory:
    ```bash
    cd hello-world-chat
    ```
3.  Install the necessary packages:
    ```bash
    npm install
    ```
4.  Create a `.env` file in the root directory. Add your Google AI Studio API key to this file:
    ```
    GOOGLE_API_KEY=your_api_key_here
    ```
5.  Launch the backend server:
    ```bash
    node server.js
    ```
    The backend will now be running on `http://localhost:3000`.

### Frontend Setup

1.  Open a **new terminal window** in the same project directory.
2.  Launch the development server:
    ```bash
    npm run dev
    ```
3.  Navigate to the local URL provided by Vite (usually `http://localhost:5173`) in your browser to start using the application.

---

## 🛠️ How It Works

The application is built on a client-server model that enables the AI to modify its own structure, appearance, and behavior.

#### The Frontend

Built with Vue.js, the frontend's state is defined by three core JavaScript objects managed by a central `DataStore`:
* **`uiTree`**: A JSON object representing the DOM structure.
* **`styles`**: A CSS-in-JS object for all styling.
* **`controllerLogic`**: An object where keys are event names and values are the string bodies of their handler functions.

When the backend sends commands, an event bus system dispatches them to the `DataStore`, which updates the state. Vue's reactivity then automatically re-renders the UI to reflect the changes.

#### The Backend

Built with Node.js and Express, the backend serves as a smart proxy to the Gemini API.
1.  It receives the user's message and the frontend's entire current state (`uiTree`, `styles`, `logic`).
2.  It prompts the AI in a two-step process: first to generate a step-by-step plan, and second to convert that plan into a precise list of JSON commands (e.g., `addNode`, `updateStyle`, `addLogic`).
3.  This command list is then sent back to the frontend for execution.

---

## 💻 Technologies Used

* **Frontend:** Vue.js, Vite
* **Backend:** Node.js, Express.js
* **AI:** Google GenAI SDK (Gemini 2.5 Flash)
* **Icons:** Font Awesome