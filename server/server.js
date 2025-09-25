// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

// --- MASTER FRAMEWORK PROMPT ---
const MASTER_FRAMEWORK_PROMPT = `
    # MASTER FRAMEWORK DOCUMENT: Your Developer's Guide

    ## 1. Core Philosophy: The Application is Data
    Your fundamental task is to generate JSON commands that manipulate three core data objects which define the entire application.
    - \`uiTree\`: Represents HTML structure.
    - \`styles\`: Represents CSS styling.
    - \`controllerLogic\`: Represents JavaScript behavior.

    ## 2. The Three Pillars of State (Data Models with Examples)

    ### 2.1. The \`uiTree\` Object (HTML Structure)
    - A JSON representation of the DOM. You MUST use this structure:
    - \`tag\`: string (e.g., 'div', 'span').
    - \`uid\`: string (System-generated, you CANNOT set this).
    - \`queryId\`: string (A human-readable name you SET for important elements).
    - \`presentation\`: object ({ className: 'my-class' }).
    - \`attributes\`: object ({ 'aria-label': '...', style: { ... } }).
    - \`behavior\`: object ({ eventHandlers: { click: { emit: 'event-name' } } }).
    - \`children\`: array (of node objects or strings).

    **EXAMPLE \`uiTree\` NODE:**
    \`\`\`json
    {
      "tag": "div",
      "queryId": "submit-button",
      "presentation": { "className": "button button--primary" },
      "attributes": { "role": "button", "aria-label": "Submit Message" },
      "behavior": {
        "eventHandlers": { "click": { "emit": "ui:submit-request" } }
      },
      "children": ["Send"]
    }
    \`\`\`

    ### 2.2. The \`styles\` Object (CSS Styling)
    - A dictionary of reusable CSS classes (CSS-in-JS).
    - **Keys:** BEM-style class names or \`@keyframes animation-name\`.
    - **Values:** Objects of camelCased CSS properties. Nested objects are for pseudo-selectors and keyframe steps.

    **EXAMPLE \`styles\` OBJECT:**
    \`\`\`json
    {
      "button": {
        "padding": "16px",
        "borderRadius": "8px",
        "hover": {
          "opacity": "0.9"
        }
      },
      "button--primary": {
        "backgroundColor": "#007bff"
      },
      "@keyframes fadeIn": {
        "from": { "opacity": "0" },
        "to": { "opacity": "1" }
      }
    }
    \`\`\`

    ### 2.3. The \`controllerLogic\` Object (JavaScript Behavior)
    - A dictionary of event handlers.
    - **Keys:** The event name to listen for (e.g., 'ui:submit-request').
    - **Values:** An object with the structure: \`{ args: ['payload'], body: '...' }\`.

    **EXAMPLE \`controllerLogic\` ENTRY:**
    \`\`\`json
    {
      "ui:clear-input": {
        "args": ["payload"],
        "body": "const input = this.getDOMElement({ queryId: 'main-input-field' });\\nif (input) {\\n  input.value = '';\\n}"
      }
    }
    \`\`\`

    ## 3. The \`handlerContext\` API (Methods You Must Call)
    When you write code for a logic handler's \`body\`, \`this\` refers to the \`handlerContext\`. This is your ONLY way to interact with the application.

    **API Methods & Examples:**
    - \`this.emit(eventName, payload)\`: Triggers other events.
      // Example: this.emit('datastore:addNode', { parentUid: 'node-5', nodeToAdd: myNode });
    - \`this.queryUiTree(query)\`: Finds a node in the \`uiTree\`.
      // Example: const inputNode = this.queryUiTree({ queryId: 'main-input-field' });
    - \`this.getDOMElement(query)\`: Returns a live HTML element from the DOM.
      // Example: const inputEl = this.getDOMElement({ queryId: 'main-input-field' });
    - \`this.getValue(query)\` / \`this.clearValue(query)\`: Manages the state of live form elements.
      // Example: this.clearValue({ queryId: 'main-input-field' });

    ## 4. Available Commands & Examples
    Your final JSON output must use only these commands.

    **EXAMPLE \`addStyle\` COMMAND:**
    \`\`\`json
    {
      "command": "addStyle",
      "className": "new-component",
      "payload": { "fontSize": "16px", "color": "blue" }
    }
    \`\`\`

     **EXAMPLE \`addNode\` COMMAND:**
    \`\`\`json
    {
      "command": "addNode",
      "targetUid": "node-2", 
      "payload": {
        "tag": "div",
        "presentation": { "className": "new-component" },
        "children": ["Hello World"]
      }
    }
    \`\`\`
    
    **EXAMPLE \`addLogic\` COMMAND:**
    \`\`\`json
    {
        "command": "addLogic",
        "eventName": "ui:new-component-click",
        "payload": {
            "args": ["payload"],
            "body": "console.log('New component clicked:', payload.node.uid);"
        }
    }
    \`\`\`

    ## 5. Your Guiding Principles
    - **Persona:** Act as an expert UI/UX designer and senior developer.
    - **Structure:** Use BEM and create semantic, accessible layouts.
    - **Aesthetics:** Use white space, grids, and cohesive, accessible color/typography.
    - **Feedback & Visibility:** Ensure your changes are immediately visible and perform self-correction checks.
`;

const fewShotExamples = [
    {
        request: "Add a header that says 'Welcome'",
        goal: "Add a main header to the application with the text 'Welcome'.",
        relevantState: "The 'full-container' (queryId: 'node-0') is the main layout block.",
        solution: "I will add a new 'app-header' organism. This will involve creating a new div element and a corresponding BEM-style class with appropriate styling for a header, following semantic structure and visual hierarchy principles.",
        plan: `1. \`addStyle\` for a new class \`app-header\` with styles for background color, text color, padding, and typography.
2. \`addNode\` to insert a new \`div\` with the class \`app-header\` and text 'Welcome' into the main 'full-container'.`,
        json: {
            "responseText": "I've added a new header that says 'Welcome' to the top of the application.",
            "commands": [
                { "command": "addStyle", "className": "app-header", "payload": { "backgroundColor": "#333", "color": "white", "padding": "16px", "textAlign": "center", "fontSize": "24px" } },
                { "command": "addNode", "targetUid": "node-0", "payload": { "tag": "div", "presentation": { "className": "app-header" }, "children": ["Welcome"] } } // CORRECTED: parentUid -> targetUid
            ]
        }
    },
    {
        request: "Make the user chat bubble background blue",
        goal: "Change the background color of the user's chat bubble to blue.",
        relevantState: "The 'user-bubble' class controls the styling for user messages.",
        solution: "I will update the existing 'user-bubble' style class. Following the visibility self-correction principle, I should also update the text color to ensure it remains readable against a new blue background.",
        plan: `1. \`updateStyle\` on the class \`user-bubble\` to set \`backgroundColor\` to a shade of blue.
2. \`updateStyle\` on the class \`user-bubble\` to set \`color\` to white for contrast.`,
        json: {
            "responseText": "I've updated the user chat bubbles to have a blue background and white text for better readability.",
            "commands": [
                { "command": "updateStyle", "className": "user-bubble", "payload": { "backgroundColor": "#007bff", "color": "white" } }
            ]
        }
    },
    // NEW, MORE COMPLEX EXAMPLE
    {
        request: "Add a winter theme with falling snow.",
        goal: "Apply a winter-themed style to the application and add an animated falling snow effect in the background.",
        relevantState: "The 'full-container' is the main layout block. The 'user-bubble' and 'ai-bubble' are the main chat components. The snow effect will require a new top-level container.",
        solution: "I will devise a comprehensive winter theme. This involves updating the styles of the main container and chat bubbles to a cool color palette. For the snow, I will implement an efficient, multi-layered parallax effect using the CSS box-shadow technique. This follows the principle of creating an immediate, visible change. The implementation will use the BEM methodology for new classes (`snow-container`, `snowflake`) and will ensure the effect is placed behind the main content (`z-index: -1`) to follow visibility self-correction rules.",
        plan: `1. \`updateStyle\` for \`full-container\` to set a cool, icy background color.
2. \`updateStyle\` for chat bubbles to match the winter theme.
3. \`addStyle\` for a new BEM block class \`snow-container\` to act as a fullscreen, non-interactive background layer.
4. \`addStyle\` for a new BEM element class \`snow-container__layer\` that uses a large \`box-shadow\` to generate a field of snowflakes. It will also have an animation property.
5. \`addStyle\` for the \`@keyframes fall\` animation to make the snowflakes drift down the screen.
6. \`addNode\` to create the main \`snow-container\` div inside the \`full-container\`.
7. \`addNode\` to create three separate \`snow-container__layer\` divs inside the \`snow-container\`, each with a different inline \`animation-duration\` to create a parallax effect.`,
        json: {
            "responseText": "Welcome to a winter wonderland! I've applied a cool, icy theme to the UI and added a multi-layered, animated snow effect in the background.",
            "commands": [
                { "command": "updateStyle", "className": "full-container", "payload": { "backgroundColor": "#2c3e50" } },
                { "command": "updateStyle", "className": "user-bubble", "payload": { "backgroundColor": "#3498db", "color": "white" } },
                { "command": "addStyle", "className": "snow-container", "payload": { "position": "absolute", "top": "0", "left": "0", "width": "100%", "height": "100%", "pointerEvents": "none", "zIndex": "-1" } },
                { "command": "addStyle", "className": "snow-container__layer", "payload": { "position": "absolute", "top": "0", "left": "0", "width": "1px", "height": "1px", "background": "transparent", "animationName": "fall", "animationTimingFunction": "linear", "animationIterationCount": "infinite", "boxShadow": "10vw 20vh 0px 0px #fff, 30vw 10vh 0px 1px #fff, 50vw 80vh 0px 0px #fff, 70vw 5vh 0px 1px #fff, 90vw 45vh 0px 0px #fff, 20vw 95vh 0px 1px #fff" } },
                { "command": "addStyle", "className": "@keyframes fall", "payload": { "to": { "transform": "translateY(100vh)" } } },
                { "command": "addNode", "targetUid": "node-0", "payload": { "tag": "div", "queryId": "snow-container", "presentation": { "className": "snow-container" } } }, // CORRECTED: parentUid -> targetUid
                { "command": "addNode", "targetQuery": { "queryId": "snow-container" }, "payload": { "tag": "div", "presentation": { "className": "snow-container__layer" }, "attributes": { "style": { "animationDuration": "15s" } } } },
                { "command": "addNode", "targetQuery": { "queryId": "snow-container" }, "payload": { "tag": "div", "presentation": { "className": "snow-container__layer" }, "attributes": { "style": { "animationDuration": "20s", "animationDelay": "7s" } } } },
                { "command": "addNode", "targetQuery": { "queryId": "snow-container" }, "payload": { "tag": "div", "presentation": { "className": "snow-container__layer" }, "attributes": { "style": { "animationDuration": "25s", "animationDelay": "3s" } } } }
            ]
        }
    }
];

// --- Multi-Step Reasoning Functions ---

async function executeStep(prompt, model) {
    const fullPrompt = `${prompt}\n\n**FRAMEWORK REFERENCE (Review this document before answering):**\n${MASTER_FRAMEWORK_PROMPT}`;
    console.log(`--- Executing Step: ${prompt.substring(0, 80)}... ---`);
    response = await model.sendMessage({ message: fullPrompt });
    return response.candidates[0].content.parts[0].text;}

// STEP 1: Interpret the Goal
// STEP 1: Interpret the Goal
async function getGoal(userMessage, chatHistory, model) {
    const prompt = `
        Your task is to interpret the user's primary goal from their latest message.
        
        **CONTEXT:**
        Chat History: ${JSON.stringify(chatHistory)}
        User Message: "${userMessage}"
        
        **OUTPUT (A single, concise sentence describing the goal):**
    `;
    return executeStep(prompt, model);
}

// STEP 2: Interpret the Current State
async function getStateInterpretation(currentState, model) {
    const prompt = `
        Your task is to interpret the current state of the application.
        
        **CONTEXT:**
        Current Application State: ${currentState}
        
        **OUTPUT (A brief, high-level description of the application's current layout, key components, and functionality):**
    `;
    return executeStep(prompt, model);
}

// STEP 3: Ideate the Best Change
async function getIdeatedChange(goal, stateInterpretation, model) {
    const prompt = `
        Your task is to ideate the single best change to meet the user's goal, considering the current state.
        
        **CONTEXT:**
        User's Goal: "${goal}"
        Current State Interpretation: "${stateInterpretation}"
        
        **DESIGN HEURISTICS (Your Guiding Principles for Ideation):**
        You must evaluate your ideas against these 10 principles to ensure a high-quality user experience.

        1.  **Visibility of system status:** The UI must always keep the user informed about what is happening (e.g., show a loading spinner for long operations).
        2.  **Match between system and the real world:** The UI should speak the user's language and use familiar concepts and icons.
        3.  **User control and freedom:** Users need a clear "emergency exit" to undo actions or leave an unwanted state (e.g., a "Cancel" button).
        4.  **Consistency and standards:** Components and actions should look and behave the same way throughout the application.
        5.  **Error prevention:** Your design should proactively prevent problems from occurring (e.g., disable a button until required fields are filled).
        6.  **Recognition rather than recall:** Minimize the user's memory load by making options and information visible.
        7.  **Flexibility and efficiency of use:** The UI should be efficient for both new and experienced users (e.g., providing shortcuts).
        8.  **Aesthetic and minimalist design:** The UI must be free of clutter. Every element should serve a purpose.
        9.  **Help users with errors:** Error messages must be in plain language, explain the problem, and suggest a solution.
        10. **Help and documentation:** If a feature is complex, provide clear, easy-to-find help.
        
        **OUTPUT (A high-level, conceptual description of the best change to the app's layout and functionality that adheres to the heuristics above):**
    `;
    return executeStep(prompt, model);
}

// STEP 4: Determine Thematic Direction (NEW)
async function getThematicDirection(ideatedChange, model) {
    const prompt = `
        Your task is to determine a thematic direction for the proposed change.
        
        **CONTEXT:**
        The High-Level Idea: "${ideatedChange}"
        
        **OUTPUT (Brainstorm and list relevant themes, styles, color palettes, and font characteristics):**
    `;
    return executeStep(prompt, model);
}

// STEP 5: Analyze Available Resources (NEW)
async function getResourceAnalysis(thematicDirection, model) {
    const prompt = `
        Your task is to determine the available visual resources that fit the theme.
        
        **CONTEXT:**
        Thematic Direction: "${thematicDirection}"
        
        **CRITICAL CONSTRAINT:** The only resource library available is **Font Awesome (Free Set)**. You cannot use images or other icon sets.
        
        **OUTPUT (List 2-3 specific Font Awesome icon classes (e.g., 'fa-solid fa-star') that could be used. If no icons are relevant, state "No new icons needed."):**
    `;
    return executeStep(prompt, model);
}

// STEP 6: Determine Conceptual UI Description (Formerly Step 4)
async function getConceptualUiDescription(ideatedChange, thematicDirection, resourceAnalysis, model) {
    const prompt = `
        Your task is to synthesize the theme and resources into a conceptual description of the UI change.
        
        **CONTEXT:**
        The High-Level Idea: "${ideatedChange}"
        Thematic Direction: "${thematicDirection}"
        Available Resources: "${resourceAnalysis}"
        
        **OUTPUT (Describe the necessary UI changes in terms of what the user will see, combining the theme and resources into a cohesive visual description):**
    `;
    return executeStep(prompt, model);
}

// STEP 7: Identify Associated Components (Formerly Step 5)
async function getComponentAnalysis(conceptualUiDescription, currentState, model) {
    const prompt = `
        Your task is to identify all components associated with the conceptual UI change.
        
        **CONTEXT:**
        Conceptual UI Change: "${conceptualUiDescription}"
        Current Application State: ${currentState}
        
        **OUTPUT (A list of existing \`queryId\`s and \`className\`s that will be modified, plus a description of any new components that need to be created):**
    `;
    return executeStep(prompt, model);
}

// STEP 8: Determine Specific IDs and Relationships (Formerly Step 6)
async function getSpecificTargets(componentAnalysis, model) {
    const prompt = `
        Your task is to determine the specific names and relationships for the planned changes.
        
        **CONTEXT:**
        Component Analysis: "${componentAnalysis}"
        
        **OUTPUT (A list of the exact new \`queryId\`s and BEM-style \`className\`s you will create. This is a list of names only):**
    `;
    return executeStep(prompt, model);
}

// STEP 9: Plan Specific Actions (Formerly Step 7)
async function getActionPlan(goal, specificTargets, model) {
    const prompt = `
        Your task is to create the final, numbered, step-by-step plan of specific actions.
        
        **CONTEXT:**
        User Goal: "${goal}"
        Specific Targets (IDs, classes, etc.): "${specificTargets}"

        **OUTPUT (A numbered list of actions using only the available commands: \`addNode\`, \`updateNode\`, \`addStyle\`, \`updateStyle\`, \`addLogic\`, etc.):**
    `;
    return executeStep(prompt, model);
}

// --- Main API Endpoint ---

app.post('/api/chat', async (req, res) => {
    try {
        const { messageText, chatHistory, currentState } = req.body;
        if (!messageText || !currentState) {
            return res.status(400).json({ error: 'Missing messageText or currentState' });
        }

        const textModel = genAI.chats.create({ model: "gemini-2.5-flash" });
        const jsonModel = genAI.chats.create({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });

        // --- Execute the 10-Step Reasoning Chain ---
        const goal = await getGoal(messageText, chatHistory, textModel);
        const stateInterpretation = await getStateInterpretation(currentState, textModel);
        const ideatedChange = await getIdeatedChange(goal, stateInterpretation, textModel);
        const thematicDirection = await getThematicDirection(ideatedChange, textModel);
        const resourceAnalysis = await getResourceAnalysis(thematicDirection, textModel);
        const conceptualUiDescription = await getConceptualUiDescription(ideatedChange, thematicDirection, resourceAnalysis, textModel);
        const componentAnalysis = await getComponentAnalysis(conceptualUiDescription, currentState, textModel);
        const specificTargets = await getSpecificTargets(componentAnalysis, textModel);
        const actionPlan = await getActionPlan(goal, specificTargets, textModel);

        // STEP 10: Generate the Specific JSON (Formerly Step 8)
        const executionPrompt = `
            Your task is to generate the final JSON object to execute a plan.

            --- Here are examples showing the relationship between a plan and its JSON output. ---
            ${JSON.stringify(fewShotExamples.map(e => ({ plan: e.plan, json: e.json })), null, 2)}
            ---

            **CRITICAL INSTRUCTION:** The examples above show a 'plan' and its corresponding 'json' object. Your job is to generate **ONLY the value of the 'json' key** for the current plan. Your output must be a single JSON object starting with { and ending with }.

            **CONTEXT:**
            Your Action Plan:
            ${actionPlan}
            
            **OUTPUT (A single JSON object with 'responseText' and 'commands' keys):**
        `;
        const aiResponse = await executeStep(executionPrompt, jsonModel);
        
        res.json({ aiResponse, plan: actionPlan });

    } catch (error) {
        console.error("Error in /api/chat endpoint:", error);
        res.status(500).json({ error: 'An error occurred while communicating with the AI service.' });
    }
});

app.listen(PORT, () => {
    console.log(`AI Backend server is running on http://localhost:${PORT}`);
});






