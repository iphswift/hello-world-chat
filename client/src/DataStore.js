import { eventBus } from './eventBus.js';
import { controllerLogic as defaultControllerLogic } from './controllerLogic.js';
import { buildInitialUiTree } from './uiTree.js'; 
import { syncIdCounterFromTree, addUidsToTree } from './uid.js';
import { initialStyles } from './initialStyles.js'; // Import the new styles

const LOGIC_KEY = 'app_controller_logic';
const STYLES_KEY = 'app_styles';
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
      this.styles = this._load(STYLES_KEY, initialStyles); // Use the imported styles
      let tree = this._load(UI_TREE_KEY, buildInitialUiTree());
      syncIdCounterFromTree(tree); // Sync counter from loaded state
      this.uiTree = addUidsToTree(tree); // Add UIDs to any new nodes
    }
    /**
   * Public method to get a property from a specific node.
   * @param {string} targetId - The className of the node to find.
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
    eventBus.on('datastore:addNode', this._addNode.bind(this));
    eventBus.on('datastore:removeNode', this._removeNode.bind(this));
    eventBus.on('datastore:updateNode', this._updateNode.bind(this));
    eventBus.on('datastore:addControllerEvent', this._addControllerEvent.bind(this));
    eventBus.on('datastore:removeControllerEvent', this._removeControllerEvent.bind(this));
    eventBus.on('datastore:updateControllerEvent', this._updateControllerEvent.bind(this));
    eventBus.on('datastore:addStyle', this._addStyle.bind(this));
    eventBus.on('datastore:updateStyle', this._updateStyle.bind(this));
    eventBus.on('datastore:removeStyle', this._removeStyle.bind(this));
    eventBus.on('datastore:updateSystemMessage', this._updateSystemMessage.bind(this)); // Register new event

    // Initial broadcast to sync the app on startup
    this.broadcastState();
    console.log("Event-driven DataStore initialized and listening. 💾");
  }

    /**
   * Finds the first node in the tree that matches all properties of a query object.
   * @param {object} query - An object with properties to match (e.g., { className: 'input-field' }).
   * @returns {object|null} The found node object, or null.
   */
    findNodeByQuery(query) {
        // ✅ REVISED: This function now handles nested queries.
        const isMatch = (node, q) => {
            for (const key in q) {
                if (!node.hasOwnProperty(key)) {
                    return false;
                }
                const nodeValue = node[key];
                const queryValue = q[key];

                if (typeof queryValue === 'object' && queryValue !== null && typeof nodeValue === 'object' && nodeValue !== null) {
                    if (!isMatch(nodeValue, queryValue)) {
                        return false;
                    }
                } else if (nodeValue !== queryValue) {
                    return false;
                }
            }
            return true;
        };

        const find = (node) => {
            if (!node || typeof node !== 'object') {
                return null;
            }
            if (isMatch(node, query)) {
                return node;
            }
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
   * @param {object} parentQuery - The query to find the parent node (e.g., { className: 'chat-container' }).
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
    eventBus.emit('datastore:styles-updated', { styles: this.styles });
    eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
    eventBus.emit('datastore:logic-updated', { logic: this.controllerLogic });
  }

  // --- Event Handlers ---


  _addNode(payload) {
    let { parentUid, targetUid, targetQuery, siblingUid, siblingQuery, position, nodeToAdd } = payload;
    let effectiveParentUid = parentUid || targetUid; 
    const nodeWithUids = addUidsToTree(nodeToAdd);
  
    // Case 1: Insert as a sibling
    if ((siblingUid || siblingQuery) && (position === 'before' || position === 'after')) {
      let siblingNode = null;
      if (siblingUid) {
        siblingNode = this._findNodeByUid(this.uiTree, siblingUid);
      } else {
        siblingNode = this.findNodeByQuery(siblingQuery);
      }
  
      if (!siblingNode) {
        console.error('_addNode Error: Could not find sibling node', {siblingUid, siblingQuery});
        return;
      }
      // ... rest of sibling logic is correct
      const location = this._findParentAndIndexByUid(this.uiTree, siblingNode.uid);
      if (location && location.parent && location.parent.children) {
        const { parent, index } = location;
        const insertionIndex = position === 'before' ? index : index + 1;
        parent.children.splice(insertionIndex, 0, nodeWithUids);
        this._save(UI_TREE_KEY, this.uiTree);
        eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
      }
      return;
    }
  
    // --- FIX: Resolve targetQuery to a UID before proceeding ---
    if (!effectiveParentUid && targetQuery) {
      const parentNode = this.findNodeByQuery(targetQuery);
      if (parentNode) {
        effectiveParentUid = parentNode.uid;
      }
    }
    // --- END FIX ---
  
    // Case 2: Add as a child
    if (effectiveParentUid) {
      const parent = this._findNodeByUid(this.uiTree, effectiveParentUid);
      if (parent && parent.children) {
        parent.children.push(nodeWithUids);
        this._save(UI_TREE_KEY, this.uiTree);
        eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
      } else {
        console.error(`_addNode Error: Parent with UID ${effectiveParentUid} not found.`);
      }
      return;
    }
  
    console.error('_addNode Error: Invalid payload. Must provide parent/target or sibling identifier.', payload);
  }
    
  _updateNode(payload) {
    let { targetUid, targetQuery, newNodeData, siblingUid, siblingQuery, position } = payload;
  
    // Case 1: Update a node based on its sibling's position using either UID or a query.
    if ((siblingUid || siblingQuery) && (position === 'before' || position === 'after')) {
      let siblingNode = null;
      if (siblingUid) {
        siblingNode = this._findNodeByUid(this.uiTree, siblingUid);
      } else { // siblingQuery must exist
        siblingNode = this.findNodeByQuery(siblingQuery);
      }
  
      if (!siblingNode) {
        console.error(`_updateNode Error: Could not find sibling node with identifier:`, {siblingUid, siblingQuery});
        return;
      }
  
      const location = this._findParentAndIndexByUid(this.uiTree, siblingNode.uid);
      if (location && location.parent && location.parent.children) {
        const { parent, index: siblingIndex } = location;
        const targetIndex = position === 'before' ? siblingIndex - 1 : siblingIndex + 1;
  
        if (targetIndex >= 0 && targetIndex < parent.children.length) {
          const originalNode = parent.children[targetIndex];
          const finalNode = deepMerge(originalNode, newNodeData);
          parent.children[targetIndex] = addUidsToTree(finalNode);
          
          this._save(UI_TREE_KEY, this.uiTree);
          eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
        } else {
          console.error(`_updateNode Error: No node found at position '${position}' relative to resolved sibling UID ${siblingNode.uid}.`);
        }
      } else {
        console.error(`_updateNode Error: Could not find parent for resolved sibling with UID ${siblingNode.uid}.`);
      }
      return;
    }
  
    // Case 2: Fallback to existing direct targeting logic (UID or query).
    if (!targetUid && targetQuery) {
      const foundNode = this.findNodeByQuery(targetQuery);
      if (foundNode) {
        targetUid = foundNode.uid;
      } else {
        console.error(`_updateNode Error: No node found for query`, targetQuery);
        return;
      }
    }
  
    if (!targetUid) {
      console.error(`_updateNode Error: A valid target was not provided.`);
      return;
    }
  
    if (this.uiTree && this.uiTree.uid === targetUid) {
      this.uiTree = deepMerge(this.uiTree, newNodeData);
      this.uiTree = addUidsToTree(this.uiTree);
      this._save(UI_TREE_KEY, this.uiTree);
      eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
      return;
    }
  
    const location = this._findParentAndIndexByUid(this.uiTree, targetUid);
    if (location && location.parent) {
      const { parent, index } = location;
      const originalNode = parent.children[index];
      const finalNode = deepMerge(originalNode, newNodeData);
      parent.children[index] = addUidsToTree(finalNode);
      this._save(UI_TREE_KEY, this.uiTree);
      eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
    } else {
      console.error(`_updateNode Error: Node with UID ${targetUid} not found.`);
    }
  }

_removeNode(payload) {
  let { targetUid, targetQuery } = payload;

  // 1. Resolve the query to a UID if necessary.
  if (!targetUid && targetQuery) {
      const foundNode = this.findNodeByQuery(targetQuery);
      if (foundNode) {
          targetUid = foundNode.uid; // Assign to our single source-of-truth variable.
      } else {
          console.error(`_removeNode Error: No node found for query`, targetQuery);
          return;
      }
  }

  if (!targetUid) {
      console.error(`_removeNode Error: No targetUid or valid targetQuery was provided.`);
      return;
  }
  
  // 2. Handle removing the root node.
  if (this.uiTree && this.uiTree.uid === targetUid) {
    this.uiTree = null;
    this._save(UI_TREE_KEY, this.uiTree);
    eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
    return;
  }

  // 3. Find the node's parent and remove it from the children array.
  const location = this._findParentAndIndexByUid(this.uiTree, targetUid);
  if (location && location.parent && location.parent.children) {
    location.parent.children.splice(location.index, 1); // Use splice for direct removal.
    this._save(UI_TREE_KEY, this.uiTree);
    eventBus.emit('datastore:uiTree-updated', { uiTree: this.uiTree });
  } else {
    // This is not necessarily an error, the node might have already been removed.
    // console.warn(`_removeNode: Node with UID ${targetUid} not found or has no parent.`);
  }
}

  _updateSystemMessage(payload) {
    const { message } = payload;
    const targetNode = this.findNodeByQuery({ queryId: 'system-status-message' });
    if (targetNode) {
      // Create the update payload as if it were a regular updateNode command
      const updatePayload = {
        targetUid: targetNode.uid,
        newNodeData: { children: [message] }
      };
      this._updateNode(updatePayload);
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

  _addStyle(payload) {
    const { className, styleObject } = payload;
    if (className && styleObject) {
        this.styles[className] = styleObject;
        this._save(STYLES_KEY, this.styles);
        eventBus.emit('datastore:styles-updated', { styles: this.styles });
    }
  }

  _updateStyle(payload) {
      const { className, styleObject } = payload;
      if (className && this.styles[className] && styleObject) {
          this.styles[className] = deepMerge(this.styles[className], styleObject);
          this._save(STYLES_KEY, this.styles);
          eventBus.emit('datastore:styles-updated', { styles: this.styles });
      }
  }

  _removeStyle(payload) {
      const { className } = payload;
      if (className && this.styles[className]) {
          delete this.styles[className];
          this._save(STYLES_KEY, this.styles);
          eventBus.emit('datastore:styles-updated', { styles: this.styles });
      }
  }

  // --- Persistence & Utility ---

  _save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
  _load(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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