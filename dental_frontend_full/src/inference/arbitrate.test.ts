import test from 'node:test';
import assert from 'node:assert/strict';
import { arbitrate } from './arbitrate.ts';
import { Condition } from './types.ts';

test('low-margin classifier prediction should be treated as uncertain', () => {
  const result = arbitrate(
    {
      detections: [],
      topCanonicalClass: Condition.HEALTHY,
      topConfidence: 0.1,
    },
    {
      condition: Condition.CAVITY_DECAY,
      confidence: 0.56,
      probabilities: {
        [Condition.HEALTHY]: 0.52,
        [Condition.CAVITY_DECAY]: 0.56,
        [Condition.FILLING]: 0.02,
      },
    },
  );

  assert.equal(result.status, 'uncertain');
});

test('clear top prediction with a strong margin should still pass', () => {
  const result = arbitrate(
    {
      detections: [],
      topCanonicalClass: Condition.HEALTHY,
      topConfidence: 0.08,
    },
    {
      condition: Condition.CAVITY_DECAY,
      confidence: 0.82,
      probabilities: {
        [Condition.HEALTHY]: 0.1,
        [Condition.CAVITY_DECAY]: 0.82,
        [Condition.FILLING]: 0.08,
      },
    },
  );

  assert.equal(result.status, 'finding');
  assert.equal(result.findings[0]?.condition, Condition.CAVITY_DECAY);
});
