let idCounter = 0;

/**
 * Scans a node tree for UIDs, finds the highest number used,
 * and sets the internal counter to be higher than that.
 * @param {object} node - The root node of the tree to scan.
 */
export function syncIdCounterFromTree(node) {
  let maxId = -1;

  // A recursive helper to traverse the tree
  const findMaxId = (n) => {
    if (!n || typeof n !== 'object' || !n.uid) return;

    // Extract the number from the UID string (e.g., 'node-12' -> 12)
    const match = n.uid.match(/\d+$/);
    if (match) {
      const id = parseInt(match[0], 10);
      if (id > maxId) {
        maxId = id;
      }
    }
    
    if (n.children) {
      n.children.forEach(findMaxId);
    }
  };

  findMaxId(node);
  
  // Set the counter to be one higher than the max found ID.
  idCounter = maxId + 1;
}

/**
 * Recursively traverses a node tree and assigns a UID to any node 
 * that doesn't already have one.
 */
export function addUidsToTree(node) {
  if (!node || typeof node !== 'object') return node;

  if (!node.uid) {
    node.uid = `node-${idCounter++}`;
  }

  if (node.children) {
    node.children = node.children.map(addUidsToTree);
  }

  return node;
}