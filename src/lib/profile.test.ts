// Run with `npm test` (node --test, TypeScript types stripped by Node).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROFILE_GROUPS,
  PROFILE_KEYS,
  PROFILE_QUESTIONS,
  answeredCount,
  hiddenReason,
  matchesProfile,
  profileConflicts,
  sanitizeProfile,
  setAnswer,
  splitByProfile,
  validateWhen,
  type HouseProfile,
  type When,
} from './profile.ts';

const item = (when?: When) => ({ id: Math.random().toString(36), when });

test('no when always applies; empty profile never hides', () => {
  assert.equal(matchesProfile(item(), { gas: 'no' }), true);
  assert.equal(matchesProfile(item({ gas: ['yes'] }), {}), true);
  assert.equal(matchesProfile(item({ gas: ['yes'] }), null), true);
});

test('an answered attribute must be one of the listed values', () => {
  const csst = item({ gas: ['yes'] });
  assert.equal(matchesProfile(csst, { gas: 'yes' }), true);
  assert.equal(matchesProfile(csst, { gas: 'no' }), false);
  const bolt = item({ foundation: ['basement', 'crawlspace'] });
  assert.equal(matchesProfile(bolt, { foundation: 'crawlspace' }), true);
  assert.equal(matchesProfile(bolt, { foundation: 'slab' }), false);
});

test('unanswered attributes in a multi-attribute when never hide', () => {
  const balloon = item({ type: ['site-built'], stories: ['two-plus'] });
  assert.equal(matchesProfile(balloon, { type: 'site-built' }), true);
  assert.equal(matchesProfile(balloon, { stories: 'one' }), false);
  assert.deepEqual(profileConflicts(balloon, { type: 'manufactured', stories: 'one' }), ['type', 'stories']);
  // answers unrelated to the item's conditions do nothing
  assert.equal(matchesProfile(balloon, { gas: 'no', sewer: 'septic' }), true);
});

test('hiddenReason names the answers that rule an item out', () => {
  assert.equal(hiddenReason(item({ gas: ['yes'] }), { gas: 'no' }), 'no gas');
  assert.equal(hiddenReason(item({ gas: ['yes'] }), { gas: 'yes' }), null);
  assert.equal(
    hiddenReason(item({ heating: ['boiler'], gas: ['yes'] }), { heating: 'forced-air', gas: 'no' }),
    'furnace heat and no gas',
  );
  assert.equal(hiddenReason(item({ foundation: ['basement', 'crawlspace'] }), { foundation: 'slab' }), 'a slab foundation');
});

test('splitByProfile keeps order', () => {
  const a = item(), b = item({ gas: ['yes'] }), c = item({ sewer: ['septic'] }), d = item();
  const { shown, hidden } = splitByProfile([a, b, c, d], { gas: 'no', sewer: 'city' });
  assert.deepEqual(shown, [a, d]);
  assert.deepEqual(hidden, [b, c]);
  assert.deepEqual(splitByProfile([a, b], {}).hidden, []);
});

test('sanitizeProfile drops unknown keys and values', () => {
  assert.deepEqual(sanitizeProfile({ gas: 'no', foundation: 'mud', colour: 'red', sewer: 3 }), { gas: 'no' });
  assert.deepEqual(sanitizeProfile(null), {});
  assert.deepEqual(sanitizeProfile(['gas']), {});
  assert.deepEqual(sanitizeProfile('{"gas":"no"}'), {});
});

test('setAnswer sets, replaces and clears', () => {
  let p: HouseProfile = {};
  p = setAnswer(p, 'gas', 'no');
  assert.deepEqual(p, { gas: 'no' });
  p = setAnswer(p, 'gas', 'yes');
  assert.deepEqual(p, { gas: 'yes' });
  p = setAnswer(p, 'gas', undefined);
  assert.deepEqual(p, {});
  assert.deepEqual(setAnswer({}, 'gas', 'maybe'), {});
});

test('answeredCount', () => {
  assert.equal(answeredCount({}), 0);
  assert.equal(answeredCount({ gas: 'no', roof: 'flat', water: 'well' }), 3);
  assert.equal(answeredCount(undefined), 0);
});

test('validateWhen accepts good conditions and names every bad one', () => {
  assert.deepEqual(validateWhen(undefined), []);
  assert.deepEqual(validateWhen({ gas: ['yes'], foundation: ['basement', 'crawlspace'] }), []);
  assert.equal(validateWhen({ gaz: ['yes'] }).length, 1);
  assert.match(validateWhen({ foundation: ['slab', 'pier'] })[0], /unknown value "pier"/);
  assert.match(validateWhen({ gas: 'yes' })[0], /non-empty array/);
  assert.match(validateWhen({ gas: [] })[0], /non-empty array/);
  assert.match(validateWhen({ gas: ['yes', 'no'] })[0], /every value/);
  assert.match(validateWhen({})[0], /empty/);
  assert.match(validateWhen(['gas'])[0], /object/);
});

test('questions, groups and keys agree', () => {
  assert.equal(PROFILE_QUESTIONS.length, 11);
  assert.deepEqual(PROFILE_QUESTIONS.map((q) => q.key), [...PROFILE_KEYS]);
  assert.deepEqual(PROFILE_GROUPS.flatMap((g) => g.keys).sort(), [...PROFILE_KEYS].sort());
  for (const q of PROFILE_QUESTIONS) {
    assert.ok(q.values.length >= 2, q.key);
    for (const v of q.values) assert.ok(v.label && v.fact, `${q.key}.${v.id}`);
  }
});
