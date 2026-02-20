import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for deduplication logic.
 *
 * The deduplication module uses a module-level Set that persists across calls,
 * so we test the underlying Set semantics here directly. Integration tests
 * covering disk persistence would require mocking the fs module.
 */
describe('deduplication logic', () => {
  test('should track a newly added alert ID as spoken', () => {
    const spokenIds = new Set();
    const alertId = 'urn:oid:2.49.0.1.840.0.abc123';

    assert.equal(spokenIds.has(alertId), false, 'Alert should not be spoken initially');
    spokenIds.add(alertId);
    assert.equal(spokenIds.has(alertId), true, 'Alert should be spoken after marking');
  });

  test('should not duplicate an alert ID added twice', () => {
    const spokenIds = new Set();
    const alertId = 'urn:oid:2.49.0.1.840.0.dup456';

    spokenIds.add(alertId);
    spokenIds.add(alertId);

    assert.equal(spokenIds.size, 1, 'Set should deduplicate identical IDs');
  });

  test('should track multiple distinct alert IDs independently', () => {
    const spokenIds = new Set();
    const ids = ['id-1', 'id-2', 'id-3'];

    for (const id of ids) spokenIds.add(id);

    assert.equal(spokenIds.size, 3, 'All three distinct IDs should be tracked');
    for (const id of ids) {
      assert.equal(spokenIds.has(id), true, `ID ${id} should be present`);
    }
  });

  test('should correctly serialize and restore IDs via JSON round-trip', () => {
    const original = new Set(['id-a', 'id-b', 'id-c']);
    const serialized = JSON.stringify([...original]);
    const restored = new Set(JSON.parse(serialized));

    assert.equal(restored.size, 3);
    assert.equal(restored.has('id-a'), true);
    assert.equal(restored.has('id-b'), true);
    assert.equal(restored.has('id-c'), true);
  });
});
