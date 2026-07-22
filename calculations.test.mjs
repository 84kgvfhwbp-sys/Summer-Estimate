import assert from 'node:assert/strict';
import { calculateEstimate, defaultEstimate } from '../js/calculations.js';

const empty = calculateEstimate(defaultEstimate());
assert.equal(empty.grandTotal, 0, 'Empty estimate should total zero');

const lawn = calculateEstimate(defaultEstimate({
  weeklyEnabled: true,
  weeklyTime: 1.25,
  weeklyVisits: 22,
  crewRate: 120,
  gardensEnabled: true,
  gardensTime: 0.5,
  gardensVisits: 10,
  clippingsEnabled: true,
  clippingsFee: 330,
}));
assert.equal(lawn.weeklyCharge, 3300);
assert.equal(lawn.gardensCharge, 600);
assert.equal(lawn.lawnTotal, 4230);

const fert = calculateEstimate(defaultEstimate({
  squareFootage: 2500,
  fertFallEnabled: true,
  limeFallEnabled: true,
  fertLabourTime: 0.5,
  fertLabourRate: 75,
}));
assert.equal(fert.applicationCount, 2);
assert.equal(fert.fertilizerMaterialTotal, 67.5);
assert.equal(fert.fertLabourCharge, 75);
assert.equal(fert.fertTotal, 142.5);

const disabledDelivery = calculateEstimate(defaultEstimate({
  squareFootage: 2500,
  springAerationEnabled: false,
  springAerationDeliveryEnabled: true,
  springAerationDeliveryFee: 75,
}));
assert.equal(disabledDelivery.springAerationCharge, 0, 'Delivery must not charge when service is disabled');

const litter = calculateEstimate(defaultEstimate({
  litterEnabled: true,
  litterTime: 0.5,
  litterRate: 75,
  litterVisits: 12,
  litterDisposalFee: 26,
}));
assert.equal(litter.litterCharge, 762);

console.log('All Summer Estimate calculation tests passed.');
