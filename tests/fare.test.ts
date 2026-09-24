import { calculateFare, getPoolDiscountPercent } from '../services/fare.service';

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${message} - Expected [${expected}], but received [${actual}]`);
  }
  console.log(`  ✓ ${message}`);
}

console.log('=== Running Unit Tests: calculateFare Pure Function ===\n');

// Test 1: Nusrat's Worked Example
console.log("Test 1: Nusrat's Trip (10.0 km, 20% pool discount)");
const nusratResult = calculateFare({
  baseFare: 3000,
  distanceKm: 10.0,
  ratePerKm: 2500,
  poolDiscountPercent: 20
});
assertEqual(nusratResult.baseFare, 3000, 'Base fare is 3000 paisa');
assertEqual(nusratResult.distanceCharge, 25000, 'Distance charge is 25000 paisa (10.0 * 2500)');
assertEqual(nusratResult.grossFare, 28000, 'Gross fare is 28000 paisa (3000 + 25000)');
assertEqual(nusratResult.poolDiscount, 5600, 'Pool discount is 5600 paisa (20% of 28000)');
assertEqual(nusratResult.passengerFare, 22400, 'Passenger fare is 22400 paisa (28000 - 5600)');
assertEqual(nusratResult.fareInBdt, 224, 'Fare in BDT is 224.00');

// Test 2: Rafiq's Worked Example
console.log("\nTest 2: Rafiq's Trip (8.5 km, 20% pool discount)");
const rafiqResult = calculateFare({
  baseFare: 3000,
  distanceKm: 8.5,
  ratePerKm: 2500,
  poolDiscountPercent: 20
});
assertEqual(rafiqResult.baseFare, 3000, 'Base fare is 3000 paisa');
assertEqual(rafiqResult.distanceCharge, 21250, 'Distance charge is 21250 paisa (8.5 * 2500)');
assertEqual(rafiqResult.grossFare, 24250, 'Gross fare is 24250 paisa (3000 + 21250)');
assertEqual(rafiqResult.poolDiscount, 4850, 'Pool discount is 4850 paisa (20% of 24250)');
assertEqual(rafiqResult.passengerFare, 19400, 'Passenger fare is 19400 paisa (24250 - 4850)');
assertEqual(rafiqResult.fareInBdt, 194, 'Fare in BDT is 194.00');

// Test 3: Solo Rider (0% discount)
console.log('\nTest 3: Solo Rider (0% discount)');
const soloResult = calculateFare({
  baseFare: 3000,
  distanceKm: 5.0,
  ratePerKm: 2500,
  poolDiscountPercent: 0
});
assertEqual(soloResult.distanceCharge, 12500, 'Distance charge is 12500 paisa');
assertEqual(soloResult.grossFare, 15500, 'Gross fare is 15500 paisa');
assertEqual(soloResult.poolDiscount, 0, 'Pool discount is 0 paisa');
assertEqual(soloResult.passengerFare, 15500, 'Passenger fare is 15500 paisa');

// Test 4: Fractional rounding to integers in paisa
console.log('\nTest 4: Fractional distance and rates produce rounded integer paisa');
const fractionalResult = calculateFare({
  baseFare: 3000,
  distanceKm: 7.333,
  ratePerKm: 2499,
  poolDiscountPercent: 17.5
});
assertEqual(Number.isInteger(fractionalResult.distanceCharge), true, 'distanceCharge is integer');
assertEqual(Number.isInteger(fractionalResult.grossFare), true, 'grossFare is integer');
assertEqual(Number.isInteger(fractionalResult.poolDiscount), true, 'poolDiscount is integer');
assertEqual(Number.isInteger(fractionalResult.passengerFare), true, 'passengerFare is integer');

// Test 5: Input validation / error handling
console.log('\nTest 5: Error handling on invalid inputs');
let errorCaught = false;
try {
  calculateFare({
    baseFare: -500,
    distanceKm: 10,
    ratePerKm: 2500,
    poolDiscountPercent: 20
  });
} catch (e: any) {
  errorCaught = true;
  assertEqual(e.name, 'TypeError', 'Throws TypeError for negative baseFare');
}
assertEqual(errorCaught, true, 'Negative baseFare correctly rejected');

// Test 6: Helper getPoolDiscountPercent
console.log('\nTest 6: getPoolDiscountPercent helper');
assertEqual(getPoolDiscountPercent(1), 0, '1 passenger = 0% discount');
assertEqual(getPoolDiscountPercent(2), 20, '2 passengers = 20% discount (Nusrat & Rafiq rule)');
assertEqual(getPoolDiscountPercent(3), 25, '3 passengers = 25% discount');
assertEqual(getPoolDiscountPercent(4), 30, '4 passengers = 30% discount');

console.log('\n======================================================');
console.log('🎉 ALL UNIT TESTS PASSED FOR calculateFare');
console.log('======================================================');
