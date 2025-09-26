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

// --- COMPLETE FRAMEWORK PROMPT (Remains the same) ---
const COMPLETE_FRAMEWORK_PROMPT = `
    # COMPLETE FRAMEWORK DOCUMENT: Your Developer's Guide

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
    Your final JSON output must use only these commands as defined below. Do not invent new parameters.

    **\`addNode\`**
    - **Description:** Adds a new node to the UI tree.
    - **Parameters:**
        - \`command\`: "addNode"
        - \`payload\`: The new node object to add.
    - **For Child Mode:**
        - \`targetUid\` or \`targetQuery\`: The UID or query for the **parent node**.
    - **For Sibling Mode:**
        - \`siblingUid\` or \`siblingQuery\`: The UID or query for the existing node to position against.
        - \`position\`: "before" or "after".
        - **CRITICAL RULE:** The root node of the application **cannot have siblings**. You **must not** use Sibling Mode on any node at the root level. To add new top-level elements, you **must** use Child Mode and target the current root node (which originally has the \`uid: "node-0"\`).
    - **Example (Child Mode):**
      \`\`\`json
      {
        "command": "addNode",
        "targetQuery": { "className": "input-container" },
        "payload": { "tag": "div" }
      }
      \`\`\`
    - **Example (Sibling Mode):**
      \`\`\`json
      {
        "command": "addNode",
        "siblingUid": "node-3",
        "position": "before",
        "payload": { "tag": "i" }
      }
      \`\`\`

    **\`updateNode\`**
    - **Description:** Merges new data into an existing node.
    - **Parameters:**
        - \`command\`: "updateNode"
        - \`newNodeData\`: The properties to add or overwrite.
    - **For Direct Targeting:**
        - \`targetUid\` or \`targetQuery\`: The UID or query for the **node to update**.
    - **For Sibling Targeting:**
        - \`siblingUid\` or \`siblingQuery\`: The UID or query for the existing node that the target node is next to.
        - \`position\`: "before" or "after".
    - **Example (Direct Targeting):**
      {
        "command": "updateNode",
        "targetQuery": { "queryId": "submit-button" },
        "newNodeData": { "children": ["Submit Now"] }
      }
    - **Example (Sibling Targeting):**
      {
        "command": "updateNode",
        "siblingUid": "node-3",
        "position": "after",
        "newNodeData": { "presentation": { "className": "highlighted" } }
      }

    **\`removeNode\`**
    - **Description:** Removes a node from the UI tree.
    - **Parameters:**
        - \`command\`: (string, required) Must be "removeNode".
        - \`targetUid\` or \`targetQuery\`: (string or object, required) The UID or query to find the target node to remove.

    **\`addStyle\` / \`updateStyle\` / \`removeStyle\`**
    - **Description:** Manages CSS classes in the styles object.
    - **Parameters:**
        - \`command\`: (string, required) "addStyle", "updateStyle", or "removeStyle".
        - \`className\`: (string, required) The name of the CSS class.
        - \`payload\`: (object, required for add/update) The CSS-in-JS style object.
    
    **\`addLogic\` / \`updateLogic\` / \`removeLogic\`**
    - **Description:** Manages event handlers in the controller logic.
    - **Parameters:**
        - \`command\`: (string, required) "addLogic", "updateLogic", or "removeLogic".
        - \`eventName\`: (string, required) The name of the event.
        - \`payload\`: (object, required for add/update) The event configuration object.


    ## 5. Your Guiding Principles
    - **Persona:** Act as an expert UI/UX designer and senior developer.
    - **Prioritize Functional & Interactive Innovation:** A truly great solution often introduces a new capability or improves a user's workflow, not just visual appeal. Before proposing a simple restyle, always consider if a change in functionality or interaction would be more impactful.
    - **Structure:** Use BEM and create semantic, accessible layouts.
    - **Aesthetics:** Use white space, grids, and cohesive, accessible color/typography.
    - **Feedback & Visibility:** Ensure your changes are immediately visible and perform self-correction checks.
`;

const VERIFICATION_RULES = `
/**
 * You are an automated linter and repair tool. Your sole purpose is to verify and correct a given JSON object against the following strict schema.
 * If the JSON is valid, return it unmodified.
 * If the JSON is invalid, return a corrected version, explaining the changes in the 'responseText' field.
 * Your output MUST be a single, valid JSON object.
 */

// ---------------------------------
// SECTION 1: ROOT OBJECT SCHEMA
// ---------------------------------
{
  "responseText": "string", // A conversational response describing the changes. Required.
  "commands": "Command[]"    // An array of command objects. Required.
}

// ---------------------------------
// SECTION 2: DETAILED COMMAND SCHEMAS
// ---------------------------------

/**
 * @command addNode
 * @description Adds a new node to the uiTree.
 * @property {object} payload - The uiTree node object to add. REQUIRED.
 * @property {string} [targetUid] - The parent node's UID.
 * @property {object} [targetQuery] - A query to find the parent node.
 * @property {string} [siblingUid] - A sibling node's UID for relative positioning.
 * @property {object} [siblingQuery] - A query to find the sibling node.
 * @property {string} [position] - Must be "before" or "after".
 * @rule Must use Child Mode (targetUid/targetQuery) OR Sibling Mode (siblingUid/siblingQuery + position).
 * @rule The root node ("node-0") cannot be a sibling target.
 */

/**
 * @command updateNode
 * @description Merges new properties into an existing node.
 * @property {object} newNodeData - The properties to merge. REQUIRED.
 * @property {string} [targetUid] - The target node's UID.
 * @property {object} [targetQuery] - A query to find the target node.
 * @property {string} [siblingUid] - A sibling node's UID for relative positioning.
 * @property {object} [siblingQuery] - A query to find the sibling node.
 * @property {string} [position] - Must be "before" or "after".
 * @rule Must use Direct Targeting (targetUid/targetQuery) OR Sibling Targeting (siblingUid/siblingQuery + position).
 */

/**
 * @command removeNode
 * @description Removes a node from the uiTree.
 * @property {string} [targetUid] - The target node's UID. REQUIRED unless targetQuery is used.
 * @property {object} [targetQuery] - A query to find the target node. REQUIRED unless targetUid is used.
 */

/**
 * @command addStyle / updateStyle
 * @description Adds or updates a style class.
 * @property {string} className - The name of the class or @keyframes rule. REQUIRED.
 * @property {object} payload - The CSS-in-JS style object. REQUIRED.
 * @rule 'className' MUST NOT contain spaces or dots ('.'). It must be a single BEM-style class or start with '@keyframes'.
 */

/**
 * @command removeStyle
 * @description Removes a style class.
 * @property {string} className - The name of the class or @keyframes rule. REQUIRED.
 */

/**
 * @command addLogic / updateLogic
 * @description Adds or updates an event handler.
 * @property {string} eventName - The name of the event. REQUIRED.
 * @property {object} payload - The event configuration object. REQUIRED.
 * @rule 'payload' MUST be an object with keys { "args": string[], "body": string }.
 */

/**
 * @command removeLogic
 * @description Removes an event handler.
 * @property {string} eventName - The name of the event. REQUIRED.
 */

// ---------------------------------
// SECTION 3: CORE DATA STRUCTURES
// ---------------------------------

/**
 * @structure uiTree Node
 * @description The schema for any node object used in a command's 'payload'.
 * @property {string} tag - An HTML tag name (e.g., 'div'). REQUIRED.
 * @property {string} [uid] - ILLEGAL. Commands MUST NOT set the 'uid' property. The system generates it.
 * @property {string} [queryId] - A human-readable ID for querying.
 * @property {object} [presentation] - Style binding, e.g., { "className": "my-class" }.
 * @property {object} [attributes] - HTML attributes, e.g., { "placeholder": "text" }.
 * @property {object} [behavior] - Event handling configuration.
 * @property {array} [children] - An array of strings or other uiTree Node objects.
 */
 
/**
 * @structure Query Object
 * @description The schema for a 'targetQuery' object.
 * @property {string} [uid]
 * @property {string} [queryId]
 * @property {object} [presentation] - e.g., { "className": "my-class" }
 * @rule A query object can use any combination of keys from the uiTree Node structure to find a unique node.
 */

// ---------------------------------
// SECTION 4: CONTROLLERLOGIC 'BODY' RULES
// ---------------------------------

/**
 * The 'body' property of a logic handler is a JavaScript string that will be executed. It has a specific context ('this').
 *
 * 1.  **STRING ESCAPING (CRITICAL):** The 'body' string MUST be a valid JSON string value. All internal double quotes must be escaped (\\"), all backslashes must be escaped (\\\\), and all newlines must be escaped (\\n).
 *
 * 2.  **AVAILABLE 'this' CONTEXT:** The 'this' object inside the body provides the ONLY way to interact with the application. The only available methods are:
 * - \`this.emit(eventName, payload)\`: To trigger other events.
 * - \`this.queryUiTree(query)\`: To find a node in the data state.
 * - \`this.getDOMElement(query)\`: To get a live DOM element from the page.
 * - \`this.getValue(query)\`: To get the current value of a form element.
 * - \`this.clearValue(query)\`: To clear the value of a form element.
 *
 * 3.  **UIDS ARE DYNAMIC:** The 'body' code cannot know a node's UID before it is created. It MUST use \`this.queryUiTree()\` to find a node and get its UID dynamically if needed (e.g., \`const node = this.queryUiTree({queryId: 'my-node'}); const uid = node.uid;\`).
 */
`;

// --- Few-Shot Examples for JSON Generation (Remains the same) ---
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

function sendStatusUpdate(res, step, message) {
    const statusPayload = {
        command: 'updateSystemMessage',
        step: step,
        message: message,
    };
    res.write(`\n${JSON.stringify(statusPayload)}`);
}
// --- Multi-Step Reasoning Functions ---

async function executeStep(prompt, model, referencePrompt = COMPLETE_FRAMEWORK_PROMPT) {
    const fullPrompt = `${prompt}\n\n**REFERENCE DOCUMENT:**\n${referencePrompt}`;
    console.log(`--- Executing Step: ${prompt.substring(0, 80)}... ---`);
    const response = await model.sendMessage({ message: fullPrompt });
    return response.candidates[0].content.parts[0].text;
}

// --- PHASE 1: DESIGN ---

// STEP 1: Deconstruct the Request (The "Why")
async function deconstructRequest(userMessage, chatHistory, model) {
    const prompt = `
        You are attempting to modify an existing webpage. The user has given you a request. Your task is to analyze the user's request and the chat history to uncover the core problem.
        
        **CONTEXT:**
        Chat History: ${JSON.stringify(chatHistory)}
        User's Latest Request: "${userMessage}"
        
        **OUTPUT (A clear, concise problem statement identifying the primary user goal):**
    `;
    return executeStep(prompt, model);
}

// STEP 2: Analyze Current State (NEW)
async function analyzeCurrentState(problemStatement, currentState, model) {
    const prompt = `
        You are redesigning a webpage. To do so, you first need to take notes on relevant context with the existing implementation. Your task is to analyze the current application state to find components, styles, and logic relevant to the problem. Do not suggest solutions yet; your only goal is to gather context.
        
        **CONTEXT:**
        The Problem to Solve: "${problemStatement}"
        Current Application State: ${currentState}

        **OUTPUT (A concise summary of the existing UI components, styles, or logic that the upcoming design changes will likely need to interact with or modify):**
    `;
    return executeStep(prompt, model);
}

// STEP 3: Explore Solutions (The "How")
async function exploreSolutions(problemStatement, stateAnalysis, model) {
    const prompt = `
        This is a creative, divergent brainstorming phase. Your task is to generate three conceptually distinct UI/UX solutions. You **must propose at least one solution that introduces a new functionality or interaction model.**

        **CREATIVE VECTORS TO EXPLORE:**
        - **1. Functional Change:** How can the user accomplish a new task? (e.g., adding a "clear" button, a search filter, a settings toggle, a new form). This involves new event logic.
        - **2. Interactive Change:** How can the user interact with the UI differently? (e.g., introducing drag-and-drop, a context menu on right-click, keyboard shortcuts, or a modal window).
        - **3. Structural/Aesthetic Change:** How can the layout or theme be altered to better serve the user's goal? (e.g., reorganizing elements, adding a new panel, or applying a comprehensive visual theme).

        **CONTEXT:**
        The Problem Statement: "${problemStatement}"
        Analysis of Current State: "${stateAnalysis}"

        **OUTPUT (Brainstorm 3 distinct solutions, drawing from the creative vectors above. For each, provide a name and a one-sentence description of the new user experience):**
    `;
    return executeStep(prompt, model);
}

// STEP 4: Formulate the Proposition (The "What")
async function formulateProposition(solutions, stateAnalysis, model) {
    const prompt = `
        This is a convergent step to select the most compelling design. Your task is to evaluate the brainstormed concepts and formulate a single, actionable design proposition.

        **EVALUATION CRITERIA:**
        1.  **Novelty & Engagement:** Which solution provides the most unique, interesting, or satisfying user experience?
        2.  **Effectiveness:** Which solution solves the user's problem most directly and intuitively?
        3.  **Feasibility:** Which solution integrates best with the existing application state?

        **CONTEXT:**
        Brainstormed Solutions: "${solutions}"
        Analysis of Current State: "${stateAnalysis}"

        **OUTPUT (Evaluate the solutions against the criteria above. Select the one that best balances novelty and effectiveness, and formulate a clear design proposition. Justify your choice):**
    `;
    return executeStep(prompt, model);
}
// --- PHASE 2: IMPLEMENTATION ---

// STEP 5: Component Breakdown & Technical Specification
async function getTechnicalSpecification(designProposition, stateAnalysis, model) {
    const prompt = `
        To build a website from a plan, the first step is to identifty the technical requirements. Your task is to translate the conceptual design into a detailed list of technical requirements.
        
        **CONTEXT:**
        The Design Proposition: "${designProposition}"
        Analysis of Current State: "${stateAnalysis}"
        
        **OUTPUT (A detailed technical specification listing the new UI elements, required styles, and a description of the event logic, considering the existing state):**
    `;
    return executeStep(prompt, model);
}

// STEP 6: Propose & Evaluate Implementation Strategies (Divergence)
async function evaluateImplementations(technicalSpecification, chatHistory, messageText, stateAnalysis, model) {
    const prompt = `
        As critical divergent stage to avoid buggy solutions, it is important to create multiple solutions and determine which one works best. Your task is to brainstorm multiple technical approaches to achieve the specification.
        
        **CONTEXT:**
        Technical Specification: "${technicalSpecification}"
        Chat History: ${JSON.stringify(chatHistory)}
        Original Request: "${messageText}"
        Analysis of Current State: "${stateAnalysis}"

        **OUTPUT (Propose 2 different implementation strategies that leverage the existing state. For each, describe the approach and list its pros and cons (e.g., reusability, performance, complexity). Finally, select the best strategy to move forward with):**
    `;
    return executeStep(prompt, model);
}

// STEP 7: Create the Final Action Plan (Convergence)
async function createActionPlan(chosenStrategy, model) {
    const prompt = `
        Implementing a solution in a novel web framework requires a clear and concise stratetgy. This is a convergent step based on the chosen implementation strategy. Your task is to create the final, step-by-step sequence of commands.
        
        **CONTEXT:**
        The Chosen Implementation Strategy: "${chosenStrategy}"

        **CRITICAL RULE FOR LOGIC:** When writing the 'body' for a logic handler, you are writing a JavaScript string that will be embedded in a JSON file. You **MUST** properly escape all characters, especially double quotes (") and newlines (\\n), to ensure the final JSON is valid.

        **OUTPUT (First, define all necessary new BEM-style class names and \`queryId\`s. Then, create a numbered action plan using only valid commands like \`addStyle\`, \`addNode\`, \`updateNode\`, \`addLogic\`, etc.):**
    `;
    return executeStep(prompt, model);
}

// STEP 8: Generate Final JSON
async function generateFinalJson(messageText, actionPlan, model) {
    const prompt = `
        The existing web framework requires the response to be formatted in precise JSON. Your task is to translate the final action plan into a single, executable JSON object.

        --- Here are examples showing the relationship between a plan and its JSON output. ---
        ${JSON.stringify(fewShotExamples.map(e => ({ plan: e.plan, json: e.json })), null, 2)}
        ---

        **CRITICAL RULE FOR LOGIC:** When writing the 'body' for a logic handler, you are writing a JavaScript string that will be embedded in a JSON file. You **MUST** properly escape all characters, especially double quotes (") and newlines (\\n), to ensure the final JSON is valid.

        **CRITICAL INSTRUCTION:** The examples show a 'plan' and its corresponding 'json' object. Your job is to generate **ONLY the value of the 'json' key** for the current plan. Your output must be a single JSON object starting with { and ending with }.

        **CONTEXT:**
        The users's Original Request: "${messageText}"
        Your Final Action-Plan:
        ${actionPlan}
        
        **OUTPUT (A single JSON object with 'responseText' and 'commands' keys):**
    `;
    return executeStep(prompt, model);
}

// NEW STEP 9: Verify and Correct the Final JSON
async function verifyAndCorrectJson(generatedJson, model) {
    const prompt = `
    **You are an automated linter and repair tool.** Your only purpose is to find and fix errors in a JSON object based on the provided schema.

    **JSON to Review:**
    ---
    ${generatedJson}
    ---

    **TASK:** Review the JSON against the rules in the REFERENCE DOCUMENT. If the JSON is already perfect, return it **unmodified**. If you find any errors (especially invalid command structures, incorrect escaping in strings, or use of forbidden fields like 'uid'), return a new, corrected version of the entire JSON object. Your output MUST be a single, valid JSON object and nothing else.
`;
// Use the specialized, lean verification schema instead of the full prompt
return executeStep(prompt, model, VERIFICATION_RULES); 
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

        // --- Execute the 8-Step Reasoning Chain ---

        // Phase 1: Design
        sendStatusUpdate(res, 1, 'Deconstructing request...');
        const problemStatement = await deconstructRequest(messageText, chatHistory, textModel);
        console.log(`\n--- 💭 AI Thought: Step 1 - Deconstructed Request ---\n${problemStatement}\n------------------------------------------------------`);
        
        sendStatusUpdate(res, 2, 'Analyzing current state...');
        const stateAnalysis = await analyzeCurrentState(problemStatement, currentState, textModel);
        console.log(`\n--- 💭 AI Thought: Step 2 - State Analysis ---\n${stateAnalysis}\n-------------------------------------------------`);
        
        sendStatusUpdate(res, 3, 'Exploring solutions...');
        const solutions = await exploreSolutions(problemStatement, stateAnalysis, textModel);
        console.log(`\n--- 💭 AI Thought: Step 3 - Explored Solutions ---\n${solutions}\n----------------------------------------------------`);
        
        sendStatusUpdate(res, 4, 'Formulating design proposition...');
        const designProposition = await formulateProposition(solutions, stateAnalysis, textModel);
        console.log(`\n--- 💭 AI Thought: Step 4 - Design Proposition ---\n${designProposition}\n----------------------------------------------------`);

        // Phase 2: Implementation
        sendStatusUpdate(res, 5, 'Creating technical specification...');
        const technicalSpecification = await getTechnicalSpecification(designProposition, stateAnalysis, textModel);
        console.log(`\n--- 💭 AI Thought: Step 5 - Technical Specification ---\n${technicalSpecification}\n---------------------------------------------------------`);
        
        sendStatusUpdate(res, 6, 'Evaluating implementation strategies...');
        const chosenStrategy = await evaluateImplementations(technicalSpecification, chatHistory, messageText, stateAnalysis, textModel);
        console.log(`\n--- 💭 AI Thought: Step 6 - Chosen Strategy ---\n${chosenStrategy}\n--------------------------------------------------`);
        
        sendStatusUpdate(res, 7, 'Creating final action plan...');
        const actionPlan = await createActionPlan(chosenStrategy, textModel);
        console.log(`\n--- 💭 AI Thought: Step 7 - Final Action Plan ---\n${actionPlan}\n----------------------------------------------------`);
        
         
        sendStatusUpdate(res, 8, 'Generating final JSON response...');
        const initialJson = await generateFinalJson(messageText, actionPlan, jsonModel);
        console.log(`\n--- 🤖 AI Thought: Step 8 - Initial JSON Generation ---\n${initialJson}\n---------------------------------------------------------`);

        // --- NEW VERIFICATION STEP ---
        sendStatusUpdate(res, 9, 'Verifying and correcting JSON...');
        const correctedJson = await verifyAndCorrectJson(initialJson, jsonModel);
        
        // --- Logging and sending the final, VERIFIED payload ---
        console.log('\n--- ✅ FINAL VERIFIED AI JSON OUTPUT ---');
        try {
            const parsedResponse = JSON.parse(correctedJson);
            console.log(JSON.stringify(parsedResponse, null, 2));
        } catch (e) {
            console.log('--- ⚠️  Could not parse JSON, logging raw response: ---');
            console.log(correctedJson);
        }
        console.log('-------------------------------------\n');
        
        const finalPayload = {
            command: 'finalResponse',
            payload: { aiResponse: correctedJson, plan: actionPlan } // Use the corrected JSON
        };
        res.write(`\n${JSON.stringify(finalPayload)}`);
        res.end();

    } catch (error) {
        console.error("Error in /api/chat endpoint:", error);
        res.status(500).json({ error: 'An error occurred while communicating with the AI service.' });
    }
});

app.listen(PORT, () => {
    console.log(`AI Backend server is running on http://localhost:${PORT}`);
});