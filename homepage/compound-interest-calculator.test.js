const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULTS,
  calculateCompound,
  normalizeConfig,
} = require('./compound-interest-calculator.js');

function approx(actual, expected, tolerance = 0.0001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test('default case: 1000만원 연 5% 10년 = 1628.89만원', () => {
  const result = calculateCompound(DEFAULTS);

  approx(result.finalAmount, 1628.894626777442);
  approx(result.totalInterest, 628.894626777442);
  approx(result.multiple, 1.628894626777442);
  assert.equal(result.rows.length, 11);
  assert.equal(result.rows[0].year, 0);
  assert.equal(result.rows[0].networth, 1000);
  assert.equal(result.rows.at(-1).year, 10);
});

test('zero rate keeps principal flat', () => {
  const result = calculateCompound({ ...DEFAULTS, annualRate: 0 });

  assert.equal(result.finalAmount, 1000);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.multiple, 1);
  assert.equal(result.rows.at(-1).networth, 1000);
});

test('zero principal yields zero everywhere', () => {
  const result = calculateCompound({ ...DEFAULTS, principal: 0 });

  assert.equal(result.finalAmount, 0);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.rows.at(-1).networth, 0);
});

test('20 years doubles the gap vs principal at 5%', () => {
  const result = calculateCompound({ ...DEFAULTS, years: 20 });

  approx(result.finalAmount, 2653.297705144422);
  assert.equal(result.rows.length, 21);
});

test('each row carries year, networth, interest', () => {
  const result = calculateCompound({ principal: 1000, annualRate: 10, years: 3 });

  approx(result.rows[1].networth, 1100);
  approx(result.rows[2].networth, 1210);
  approx(result.rows[3].networth, 1331);
  approx(result.rows[3].interest, 331);
});

test('simple interest mode grows linearly', () => {
  const result = calculateCompound({ principal: 1000, annualRate: 5, years: 10, mode: 'simple' });

  assert.equal(result.finalAmount, 1500);
  assert.equal(result.totalInterest, 500);
  approx(result.rows[5].networth, 1250);
  assert.equal(result.config.mode, 'simple');
});

test('mode defaults to compound and is validated', () => {
  assert.equal(normalizeConfig({}).mode, 'compound');
  assert.equal(normalizeConfig({ mode: 'simple' }).mode, 'simple');
  assert.equal(normalizeConfig({ mode: 'weird' }).mode, 'compound');
});

test('Korean money input is normalized for principal', () => {
  const cfg = normalizeConfig({ principal: '1억', annualRate: '5', years: '10' });
  assert.equal(cfg.principal, 10000);
  assert.equal(cfg.annualRate, 5);
  assert.equal(cfg.years, 10);
});

test('inputs are clamped to sane ranges', () => {
  const cfg = normalizeConfig({ principal: -50, annualRate: 999, years: 200 });
  assert.equal(cfg.principal, 0);
  assert.equal(cfg.annualRate, 30);
  assert.equal(cfg.years, 50);
});

test('적금만(원금0): 월 50만원 5% 10년 복리 적립', () => {
  const result = calculateCompound({ principal: 0, monthly: 50, annualRate: 5, years: 10, mode: 'compound' });

  assert.equal(result.totalPaid, 6000);
  approx(result.finalAmount, 7764.1139722833595);
  approx(result.totalInterest, 1764.1139722833595);
  assert.equal(result.rows[0].networth, 0);
  assert.equal(result.rows.at(-1).year, 10);
});

test('적금만(원금0): 단리 = 원금 + 단리이자', () => {
  const result = calculateCompound({ principal: 0, monthly: 50, annualRate: 5, years: 10, mode: 'simple' });

  assert.equal(result.totalPaid, 6000);
  approx(result.finalAmount, 7512.5);
  approx(result.totalInterest, 1512.5);
});

test('원금+월적립 혼합: 둘을 합산한다', () => {
  const lump = calculateCompound({ principal: 1000, monthly: 0, annualRate: 5, years: 10, mode: 'compound' });
  const inst = calculateCompound({ principal: 0, monthly: 50, annualRate: 5, years: 10, mode: 'compound' });
  const both = calculateCompound({ principal: 1000, monthly: 50, annualRate: 5, years: 10, mode: 'compound' });

  assert.equal(both.totalPaid, 7000);
  approx(both.finalAmount, lump.finalAmount + inst.finalAmount);
});
