import { eventBus } from './eventBus.js';
import { controllerLogic as defaultControllerLogic } from './controllerLogic.js';
import { buildInitialUiTree } from './uiTree.js'; 
import { syncIdCounterFromTree, addUidsToTree } from './uid.js';

const LOGIC_KEY = 'app_controller_logic';
const STYLES_KEY = 'app_style_functions';
const UI_TREE_KEY = 'app_ui_tree';

function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Recursively merges properties from a source object into a target object.
 */
function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}


class Store {
    constructor() {
      this._isInitialized = false; // Add this flag
      this.controllerLogic = this._load(LOGIC_KEY, defaultControllerLogic);
      this.styleFunctions = this._loadStyleFunctions();
      let tree = this._load(UI_TREE_KEY, buildInitialUiTree());
      syncIdCounterFromTree(tree); // Sync counter from loaded state
      this.uiTree = addUidsToTree(tree); // Add UIDs to any new nodes
    }
    /**
   * Public method to get a property from a specific node.
   * @param {string} targetId - The styleId of the node to find.
   * @param {string} propName - The name of the property to retrieve.
   * @returns {*} The value of the property, or undefined if not found.
   */
    // MODIFIED: Public query method now uses UID
    getNodePropByUid(targetUid, propName) {
        const node = this._findNodeByUid(this.uiTree, targetUid);
        return node?.props?.[propName];
    }
    
  /**
   * Initializes the DataStore by subscribing to command events.
   */
  init() {
    if (this._isInitialized) return; // Add this guard
    this._isInitialized = true; // Set the flag
    eventBus.on('datastore:addStyleFunc', this._addStyleFunc.bind(this));
    eventBus.on('datastore:addNode', this._addNode.bind(this));
    eventBus.on('datastore:removeNode', this._removeNode.bind(this));
    eventBus.on('datastore:updateNode', this._updateNode.bind(this));
    eventBus.on('datastore:addControllerEvent', this._addControllerEvent.bind(this));
    eventBus.on('datastore:removeControllerEvent', this._removeControllerEvent.bind(this));
    eventBus.on('datastore:updateControllerEvent', this._updateControllerEvent.bind(this));
    
    // Initial broadcast to sync the app on startup
    this.broadcastState();
    console.log("Event-driven DataStore initialized and listening. 💾");
  }

    /**
   * Finds the first node in the tree that matches all properties of a query object.
   * @param {object} query - An object with properties to match (e.g., { styleId: 'input-field' }).
   * @returns {object|null} The found node object, or null.
   */
    findNodeByQuery(query) {
        // A recursive helper function to do the actual search
        const find = (node) => {
            if (!node || typeof node !== 'object') {
            return null;
            }

            // Check if the current node is a match
            let isMatch = true;
            for (const key in query) {
            if (node[key] !== query[key]) {
                isMatch = false;
                break;
            }
            }
            if (isMatch) {
            return node;
            }

            // If not a match, search in the children
            if (node.children) {
            for (const child of node.children) {
                const foundInChildren = find(child);
                if (foundInChildren) {
                return foundInChildren;
                }
            }
            }

            return null;
        };

        return find(this.uiTree);
    }
    
    _findParentAndIndexByUid(node, targetUid, parent = null, index = -1) {
    if (node.uid === targetUid) {
      return { parent, index };
    }
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (typeof child === 'object') {
          const found = this._findParentAndIndexByUid(child, targetUid, node, i);
          if (found) return found;
        }
      }
    }
    return null;
  }
  /**
   * Adds a new node to the children of a parent node identified by a query.
   * @param {object} nodeToAdd - The new node to add.
   * @param {object} parentQuery - The query to find the parent node (e.g., { styleId: 'chat-container' }).
   */
  addNodeToParentByQuery(nodeToAdd, parentQuery) {
    const parentNode = this.findNodeByQuery(parentQuery);
    if (parentNode && parentNode.children) {
      const nodeWithUids = addUidsToTree(nodeToAdd); // Ensure the new node has UIDs
      parentNode.children.push(nodeWithUids);
      this._save('app_ui_tree', this.uiTree); // Save the updated tree
      eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree }); // Broadcast the update
    } else {
      console.error(`addNodeToParentByQuery Error: Parent node not found for query`, parentQuery);
    }
  }
  
  /**
   * Broadcasts the current state to the rest of the application.
   */
  broadcastState() {
    eventBus.emit('datastore:styles-updated', { styleFunctions: this.styleFunctions });
    eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
    eventBus.emit('datastore:logic-updated', { logic: this.controllerLogic });
  }

  // --- Event Handlers ---

  _addStyleFunc(payload) {
    const newFunc = this._rehydrateFunction(payload.funcString);
    if (newFunc) {
      this.styleFunctions.push(newFunc);
      this._saveStyleFunctions();
      eventBus.emit('datastore:styles-updated', { styleFunctions: this.styleFunctions });
    }
  }

  _addNode(payload) {
    const parent = this._findNodeByUid(this.uiTree, payload.parentUid);
    if (parent && parent.children) {
      const nodeWithUids = addUidsToTree(payload.nodeToAdd);
      parent.children.push(nodeWithUids);
      this._save('app_ui_tree', this.uiTree);
      eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
    }
  }

_removeNode(payload) {
    // 1. Handle the case where the root node is the target
    if (this.uiTree && this.uiTree.uid === payload.targetUid) {
      this.uiTree = null;
      this._save(UI_TREE_KEY, this.uiTree);
      eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
      return; // Exit early
    }

    // 2. Existing logic for all non-root nodes
    const parent = this._findParentByUid(this.uiTree, payload.targetUid);
    if (parent && parent.children) {
      parent.children = parent.children.filter(child => child.uid !== payload.targetUid);
      this._save(UI_TREE_KEY, this.uiTree);
      eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
    }
  }

  _updateNode(payload) {
    const { targetUid, newNodeData } = payload;

    // 1. Handle the case where the root node is the target
    if (this.uiTree && this.uiTree.uid === targetUid) {
      const originalUid = this.uiTree.uid;
      // Replace the whole tree, preserving the original UID and adding UIDs to any new children
      this.uiTree = addUidsToTree({ ...newNodeData, uid: originalUid });
      this._save(UI_TREE_KEY, this.uiTree);
      eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
      return; // Exit early
    }

    // 2. Existing logic for all non-root nodes
    const location = this._findParentAndIndexByUid(this.uiTree, targetUid);
    if (location && location.parent) {
      const { parent, index } = location;
      const originalNode = parent.children[index];
      const finalNode = addUidsToTree({ ...newNodeData, uid: originalNode.uid });
      parent.children[index] = finalNode;
      this._save(UI_TREE_KEY, this.uiTree);
      eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
    } else {
      console.error(`_updateNode Error: Node with UID ${targetUid} not found.`);
    }
  }

  _addControllerEvent(payload) {
    const { eventName, eventConfig } = payload;
    if (eventName && eventConfig) {
      this.controllerLogic[eventName] = eventConfig;
      this._save(LOGIC_KEY, this.controllerLogic);
      eventBus.emit('datastore:logic-updated', { logic: this.controllerLogic });
    }
  }

  _removeControllerEvent(payload) {
    const { eventName } = payload;
    if (eventName && this.controllerLogic[eventName]) {
      delete this.controllerLogic[eventName];
      this._save(LOGIC_KEY, this.controllerLogic);
      eventBus.emit('datastore:logic-updated', { logic: this.controllerLogic });
    }
  }

  _updateControllerEvent(payload) {
    const { eventName, eventConfig } = payload;
    if (eventName && this.controllerLogic[eventName] && eventConfig) {
      // For simplicity, update is a full replacement, same as add.
      this.controllerLogic[eventName] = eventConfig;
      this._save(LOGIC_KEY, this.controllerLogic);
      eventBus.emit('datastore:logic-updated', { logic: this.controllerLogic });
    }
  }

  // --- Persistence & Utility ---

  _save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
  _load(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }
  _saveStyleFunctions() {
      const stringArray = this.styleFunctions.map(func => func.toString());
      this._save(STYLES_KEY, stringArray);
  }
  _loadStyleFunctions() {
      const stringArray = this._load(STYLES_KEY, []);
      return stringArray.map(s => this._rehydrateFunction(s)).filter(Boolean);
  }
    /**
     * Converts a string representation of a function back into an executable function.
     * @param {string} funcString - The string to convert (e.g., "function(a, b) { return a + b; }").
     * @returns {Function|null} The executable function, or null if parsing fails.
     */
    _rehydrateFunction(funcString) {
        if (!funcString || typeof funcString !== 'string') {
            return null;
        }
        
        try {
            // This regex is designed to capture the arguments and body from both
            // standard 'function()' and arrow '() => {}' function strings.
            const match = funcString.match(/function\s*(?:[\w$]*)?\s*\(([^)]*)\)\s*\{([\s\S]*)\}/) || funcString.match(/\(([^)]*)\)\s*=>\s*\{([\s\S]*)\}/);

            if (!match) {
            console.error("Could not parse function string:", funcString);
            return null;
            }

            // The first captured group is the arguments string (e.g., "style, uniqueId").
            const args = match[1].split(',').map(arg => arg.trim()).filter(Boolean);
            
            // The second captured group is the function's body.
            const body = match[2];

            // The Function constructor creates a new function from these parts.
            return new Function(...args, body);
        } catch (error) {
            console.error("Error rehydrating function:", error);
            return null;
        }
    }
    _findNodeByUid(node, uid) {
        if (!node) return null;
        if (node.uid === uid) {
            return node;
        }
        if (node.children) {
            for (const child of node.children) {
                if (typeof child === 'object') {
                    const found = this._findNodeByUid(child, uid);
                    if (found) return found;
                }
            }
        }
        return null;
    }
    _findParentByUid(node, uid) {
        if (node.children) {
          for (const child of node.children) {
            if (typeof child === 'object') {
              if (child.uid === uid) {
                return node; // Current node is the parent
              }
              const foundParent = this._findParentByUid(child, uid);
              if (foundParent) return foundParent;
            }
          }
        }
        return null;
      }
}




export const DataStore = new Store();