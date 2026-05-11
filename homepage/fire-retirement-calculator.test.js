const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULTS,
  calculateFire,
  normalizeConfig,
} = require('./fire-retirement-calculator.js');

function approx(actual, expected, tolerance = 0.000001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test('default case reaches target FIRE amount at age 53', () => {
  const result = calculateFire(DEFAULTS);

  assert.equal(result.annualSavings, 2400);
  assert.equal(result.targetNetworth, 65000);
  assert.equal(result.retirementYear, 18);
  assert.equal(result.retirementAge, 53);
  approx(result.monthlyPassiveIncome, 216.66666666666666);
  approx(result.rows.at(-1).networth, 69205.66629760135);
  assert.equal(result.rows.at(-1).independent, true);
});

test('zero monthly savings does not reach target within 80 years from zero assets', () => {
  const result = calculateFire({ ...DEFAULTS, monthlySavings: 0 });

  assert.equal(result.annualSavings, 0);
  assert.equal(result.retirementYear, null);
  assert.equal(result.retirementAge, null);
  assert.equal(result.rows.length, 81);
  assert.equal(result.rows.at(-1).year, 80);
  assert.equal(result.rows.at(-1).networth, 0);
  assert.equal(result.rows.at(-1).independent, false);
});

test('zero annual return reaches target by savings only', () => {
  const result = calculateFire({ ...DEFAULTS, annualReturn: 0 });

  assert.equal(result.retirementYear, 28);
  assert.equal(result.retirementAge, 63);
  assert.equal(result.rows.at(-1).roi, 0);
  assert.equal(result.rows.at(-1).networth, 67200);
});

test('negative annual return keeps the result as not reached when target is missed', () => {
  const result = calculateFire({ ...DEFAULTS, annualReturn: -5 });

  assert.equal(result.retirementYear, null);
  assert.equal(result.retirementAge, null);
  assert.equal(result.rows.length, 81);
  assert.equal(result.rows.at(-1).independent, false);
  approx(result.rows.at(-1).networth, 46027.080478781354);
});

test('three percent annual return reaches target at age 55', () => {
  const result = calculateFire({ ...DEFAULTS, annualReturn: 3 });

  assert.equal(result.retirementYear, 20);
  assert.equal(result.retirementAge, 55);
  approx(result.rows.at(-1).networth, 65456.232255156414);
});

test('already reached target reports immediate retirement without projection rows', () => {
  const result = calculateFire({ ...DEFAULTS, currentAssets: '6.5억' });

  assert.equal(result.targetNetworth, 65000);
  assert.equal(result.retirementYear, 0);
  assert.equal(result.retirementAge, DEFAULTS.currentAge);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].independent, true);
});

test('Korean money input is normalized before calculation', () => {
  const config = normalizeConfig({
    currentAge: '40',
    currentAssets: '1억2천500',
    monthlySavings: '300만원',
    annualExpenses: '3천600만원',
    annualReturn: '3',
    withdrawalRate: '4',
  });
  const result = calculateFire(config);

  assert.deepEqual(config, {
    currentAge: 40,
    currentAssets: 12500,
    monthlySavings: 300,
    annualExpenses: 3600,
    annualReturn: 3,
    withdrawalRate: 4,
  });
  assert.equal(result.annualSavings, 3600);
  assert.equal(result.targetNetworth, 90000);
  assert.equal(result.retirementYear, 16);
  assert.equal(result.retirementAge, 56);
  assert.equal(result.monthlyPassiveIncome, 300);
});
