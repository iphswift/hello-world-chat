import { reactive } from 'vue';
import { eventBus } from './eventBus.js';

// The viewState now uses `uid` as the key.
export const viewState = reactive({
  nodesByUid: {},
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
  viewState.nodesByUid = {};
  console.log("ViewState has been reset.");
}

let isInitialized = false;

export function initViewState() {
  if (isInitialized) return;
  isInitialized = true;

  eventBus.on('viewState:update', handleStateUpdate);
  eventBus.on('viewState:reset', handleReset);
}

// --- PUBLIC FACADE METHODS ---

/**
 * Gets a value from the viewState. It can resolve a node from any valid query
 * (e.g., { uid: '...' }, { queryId: '...' }, { className: '...' }).
 */
export function getViewStateValue(query, dataStore) {
  let uid = query.uid;

  if (!uid) {
    const node = dataStore.findNodeByQuery(query);
    uid = node?.uid;
  }

  if (uid && viewState.nodesByUid[uid]) {
    return viewState.nodesByUid[uid].value;
  }
  return undefined;
}
  
/**
 * Clears a value from the viewState using any valid query.
 */
export function clearViewStateValue(query, dataStore) {
  let uid = query.uid;

  if (!uid) {
    const node = dataStore.findNodeByQuery(query);
    uid = node?.uid;
  }

  if (uid && viewState.nodesByUid[uid]) {
    viewState.nodesByUid[uid].value = '';
  }
}

/**
 * Finds and returns a live DOM element based on any valid query.
 */
export function getDOMElementByQuery(query, dataStore) {
  let uid = query.uid;

  if (!uid) {
    const node = dataStore.findNodeByQuery(query);
    uid = node?.uid;
  }

  if (!uid) {
    console.warn("getDOMElementByQuery: Could not resolve a UID from the query.", query);
    return null;
  }

  return document.querySelector(`[data-uid="${uid}"]`);
}