// kernel.mjs
// CycleGuard: pure functions for detecting cycles in a directed graph
// via Kahn's algorithm. No I/O, no throwing — bad input returns
// { ok:false, why:... }.

function isValidNodeValue(n) {
  if (typeof n === 'string') return true;
  if (typeof n === 'number' && Number.isFinite(n)) return true;
  return false;
}

/**
 * cycleGuard(nodes, edges)
 * nodes: array of unique strings/finite numbers
 * edges: array of [from, to] pairs, both endpoints must be in nodes
 *
 * Returns on success:
 *   { ok:true, isDAG:true,  order: [...] }        — a valid topological order
 *   { ok:true, isDAG:false, cycleNodes: [...] }    — nodes that Kahn's algorithm
 *                                                     could never reduce to
 *                                                     in-degree 0 (i.e. the set
 *                                                     stuck in / behind a cycle)
 * Returns on bad input:
 *   { ok:false, why: '<reason>' }
 */
export function cycleGuard(nodes, edges) {
  try {
    if (!Array.isArray(nodes)) {
      return { ok: false, why: 'nodes must be an array' };
    }
    if (!Array.isArray(edges)) {
      return { ok: false, why: 'edges must be an array' };
    }
    for (const n of nodes) {
      if (!isValidNodeValue(n)) {
        return { ok: false, why: 'invalid node value' };
      }
    }
    const nodeSet = new Set(nodes);
    if (nodeSet.size !== nodes.length) {
      return { ok: false, why: 'duplicate node in nodes list' };
    }
    for (const edge of edges) {
      if (!Array.isArray(edge) || edge.length !== 2) {
        return { ok: false, why: 'edge must be a 2-element array' };
      }
      const [u, v] = edge;
      if (!nodeSet.has(u)) {
        return { ok: false, why: `edge references unknown node: ${String(u)}` };
      }
      if (!nodeSet.has(v)) {
        return { ok: false, why: `edge references unknown node: ${String(v)}` };
      }
    }

    // Build adjacency list and in-degree map, preserving insertion order
    // (Map iteration order follows insertion order) so results are
    // deterministic given the same nodes/edges order.
    const adjacency = new Map();
    const inDegree = new Map();
    for (const n of nodes) {
      adjacency.set(n, []);
      inDegree.set(n, 0);
    }
    for (const [u, v] of edges) {
      adjacency.get(u).push(v);
      inDegree.set(v, inDegree.get(v) + 1);
    }

    const queue = nodes.filter((n) => inDegree.get(n) === 0);
    const order = [];

    while (queue.length > 0) {
      const u = queue.shift();
      order.push(u);
      for (const v of adjacency.get(u)) {
        const next = inDegree.get(v) - 1;
        inDegree.set(v, next);
        if (next === 0) {
          queue.push(v);
        }
      }
    }

    if (order.length === nodes.length) {
      return { ok: true, isDAG: true, order };
    }

    const orderedSet = new Set(order);
    const cycleNodes = nodes.filter((n) => !orderedSet.has(n));
    return { ok: true, isDAG: false, cycleNodes };
  } catch (e) {
    return { ok: false, why: e instanceof Error ? e.message : 'unknown error' };
  }
}
