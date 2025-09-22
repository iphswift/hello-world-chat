import { reactive } from 'vue';
import { eventBus } from './eventBus.js';

// The viewState now uses `uid` as the key.
export const viewState = reactive({
  nodesByUid: {}, // Updated to use `uid` as the key
});

/**
 * The generic handler now receives the node's `uid`.
 */
function handleStateUpdate(payload) {
  const { uid, propToUpdate, newValue } = payload;
  if (!uid) return;

  if (!viewState.nodesByUid[uid]) {
    viewState.nodesByUid[uid] = {};
  }
  
  viewState.nodesByUid[uid][propToUpdate] = newValue;
}

// The reset function is simpler.
function handleReset() {
  viewState.nodesByUid = {}; // Updated to reset `nodesByUid`
  console.log("ViewState has been reset.");
}

let isInitialized = false; // Add this flag

export function initViewState() {
  if (isInitialized) return; // Add this guard
  isInitialized = true; // Set the flag

  eventBus.on('viewState:update', handleStateUpdate);
  eventBus.on('viewState:reset', handleReset);
}

// --- PUBLIC FACADE METHODS ---

/**
 * Facade now gets value directly from its own state, resolving `uid` from `styleId` using `findNodeByQuery`.
 */
export function getViewStateValue(query, dataStore) {
  const styleId = query.styleId;
  const node = styleId ? dataStore.findNodeByQuery({ styleId }) : null;
  const uid = node?.uid || query.uid;

  if (uid && viewState.nodesByUid[uid]) {
    return viewState.nodesByUid[uid].value;
  }
  return undefined;
}
  
/**
 * Facade now clears value directly from its own state, resolving `uid` from `styleId` using `findNodeByQuery`.
 */
export function clearViewStateValue(query, dataStore) {
  const styleId = query.styleId;
  const node = styleId ? dataStore.findNodeByQuery({ styleId }) : null;
  const uid = node?.uid || query.uid;

  if (uid && viewState.nodesByUid[uid]) {
    viewState.nodesByUid[uid].value = '';
  }
}

/**
 * Finds and returns a live DOM element based on a query object.
 * This assumes the rendered element has a `data-uid` attribute.
 * @param {object} query - The query to find the node (e.g., { styleId: 'input-field' } or { uid: 'node-3' }).
 * @param {object} dataStore - The application's data store instance.
 * @returns {HTMLElement|null} The found DOM element, or null if not found.
 */
export function getDOMElementByQuery(query, dataStore) {
  // 1. Resolve the query to a UID, same as the other facade methods.
  const styleId = query.styleId;
  const node = styleId ? dataStore.findNodeByQuery({ styleId }) : null;
  const uid = node?.uid || query.uid;

  if (!uid) {
    console.warn("getDOMElementByQuery: Could not resolve a UID from the query.", query);
    return null;
  }

  // 2. Use the UID to select the element directly from the DOM.
  return document.querySelector(`[data-uid="${uid}"]`);
}
