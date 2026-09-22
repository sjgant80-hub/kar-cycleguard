import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as K from './kernel.mjs';

test('empty graph is a DAG with empty order', () => {
  const result = K.cycleGuard([], []);
  assert.equal(result.ok, true);
  assert.equal(result.isDAG, true);
  assert.deepEqual(result.order, []);
  assert.equal(result.order.length, 0);
});

test('simple chain a->b->c yields deterministic topo order', () => {
  const result = K.cycleGuard(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  assert.equal(result.ok, true);
  assert.equal(result.isDAG, true);
  assert.deepEqual(result.order, ['a', 'b', 'c']);
});

test('3-cycle reports all three nodes stuck', () => {
  const result = K.cycleGuard(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]);
  assert.equal(result.ok, true);
  assert.equal(result.isDAG, false);
  assert.deepEqual(result.cycleNodes, ['a', 'b', 'c']);
  assert.equal(result.cycleNodes.length, 3);
});

test('self-loop is a cycle of size one', () => {
  const result = K.cycleGuard(['x'], [['x', 'x']]);
  assert.equal(result.ok, true);
  assert.equal(result.isDAG, false);
  assert.deepEqual(result.cycleNodes, ['x']);
  assert.equal(result.cycleNodes.length, 1);
});

test('diamond DAG resolves to nodes-list order deterministically', () => {
  const result = K.cycleGuard(
    ['a', 'b', 'c', 'd'],
    [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']]
  );
  assert.equal(result.ok, true);
  assert.equal(result.isDAG, true);
  assert.deepEqual(result.order, ['a', 'b', 'c', 'd']);
  assert.equal(result.order.length, 4);
});

test('edge referencing unknown node is rejected with exact reason', () => {
  const result = K.cycleGuard(['a', 'b'], [['a', 'c']]);
  assert.equal(result.ok, false);
  assert.equal(result.why, 'edge references unknown node: c');
});

// --- mutation-killing probes for isValidNodeValue (line 8/9) ---

test('finite numeric nodes are valid and topo-sort deterministically (kills === ?!== , && ?||, return true?false on line 8)', () => {
  const result = K.cycleGuard([1, 2], [[1, 2]]);
  assert.equal(result.ok, true);
  assert.equal(result.isDAG, true);
  assert.deepEqual(result.order, [1, 2]);
});

test('NaN node is rejected: typeof is number but not finite (kills && ?|| on line 8, and return false?true on line 9)', () => {
  const result = K.cycleGuard([NaN], []);
  assert.equal(result.ok, false);
  assert.equal(result.why, 'invalid node value');
});

test('non-string non-number node (boolean) is rejected (kills return false?true on line 9)', () => {
  const result = K.cycleGuard([true], []);
  assert.equal(result.ok, false);
  assert.equal(result.why, 'invalid node value');
});

// --- mutation-killing probe for edge-shape guard (line 44) ---

test('edge with wrong length (not non-array) exposes || vs && distinction with exact reason', () => {
  const result = K.cycleGuard(['a', 'b'], [['a']]);
  assert.equal(result.ok, false);
  assert.equal(result.why, 'edge must be a 2-element array');
});
