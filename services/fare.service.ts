/**
 * Dhaka Tesla Pool - Pure Fare Calculation Engine
 *
 * All monetary amounts are computed and returned as integers in PAISA (1 BDT = 100 paisa)
 * to eliminate floating-point rounding errors in financial transactions.
 *
 * ======================================================================================
 * WORKED EXAMPLE: Nusrat's & Rafiq's Overlapping Trip (2+ Riders Share)
 * ======================================================================================
 * Scenario:
 *   - Vehicle: Tesla Model 3 (Gulshan -> Motijheel Corridor)
 *   - Base Fare: 3,000 paisa (30.00 BDT)
 *   - Standard Rate Per Km: 2,500 paisa/km (25.00 BDT/km)
 *   - Pooling Rule: When 2 or more passengers share an overlapping corridor trip,
 *     a 20% pool discount (poolDiscountPercent = 20) is deducted from each rider's fare.
 *
 * --------------------------------------------------------------------------------------
 * Rider 1: Nusrat (Gulshan-2 Circle to Motijheel Shapla Chattar)
 * --------------------------------------------------------------------------------------
 *   distanceKm          = 10.0 km
 *   baseFare            = 3,000 paisa
 *   distanceCharge      = round(10.0 * 2,500) = 25,000 paisa
 *   grossFare           = baseFare + distanceCharge = 3,000 + 25,000 = 28,000 paisa
 *   poolDiscountPercent = 20%
 *   poolDiscount        = round(28,000 * 0.20) = 5,600 paisa (Saved: 56.00 BDT!)
 *   passengerFare       = grossFare - poolDiscount
 *                       = 28,000 - 5,600
 *                       = 22,400 paisa (224.00 BDT)
 *
 * --------------------------------------------------------------------------------------
 * Rider 2: Rafiq (Boarded midway at Banani Road 11 to Motijheel Shapla Chattar)
 * --------------------------------------------------------------------------------------
 *   distanceKm          = 8.5 km
 *   baseFare            = 3,000 paisa
 *   distanceCharge      = round(8.5 * 2,500) = 21,250 paisa
 *   grossFare           = baseFare + distanceCharge = 3,000 + 21,250 = 24,250 paisa
 *   poolDiscountPercent = 20%
 *   poolDiscount        = round(24,250 * 0.20) = 4,850 paisa (Saved: 48.50 BDT!)
 *   passengerFare       = grossFare - poolDiscount
 *                       = 24,250 - 4,850
 *                       = 19,400 paisa (194.00 BDT)
 *
 * --------------------------------------------------------------------------------------
 * Aggregate Pool Economics:
 *   - Total Passenger Collections: 22,400 + 19,400 = 41,800 paisa (418.00 BDT)
 *   - Solo Tesla Fare Comparison: 28,000 paisa for single rider
 *   - Driver/Operator Earnings: +49.3% increase in vehicle seat yield
 *   - Passenger Savings: Each rider saves exactly 20% compared to private ride!
 * ======================================================================================
 */

export interface FareCalculationInput {
  baseFare: number; // in paisa (integer >= 0)
  distanceKm: number; // in kilometers (>= 0)
  ratePerKm: number; // in paisa per km (integer >= 0)
  poolDiscountPercent: number; // percentage discount (0 to 100)
}

export interface FareCalculationResult {
  baseFare: number; // in paisa
  distanceKm: number; // in kilometers
  ratePerKm: number; // in paisa per km
  distanceCharge: number; // in paisa: round(distanceKm * ratePerKm)
  grossFare: number; // in paisa: baseFare + distanceCharge
  poolDiscountPercent: number; // percentage (e.g. 20)
  poolDiscount: number; // in paisa: round(grossFare * (poolDiscountPercent / 100))
  passengerFare: number; // in paisa: grossFare - poolDiscount
  fareInBdt: number; // decimal equivalent in BDT (passengerFare / 100)
}

/**
 * Pure function: calculates passenger fare ensuring all monetary values are integer paisa.
 *
 * Formula:
 *   distanceCharge = Math.round(distanceKm * ratePerKm)
 *   grossFare      = baseFare + distanceCharge
 *   poolDiscount   = Math.round(grossFare * (poolDiscountPercent / 100))
 *   passengerFare  = grossFare - poolDiscount
 *
 * @param input FareCalculationInput with baseFare, distanceKm, ratePerKm, poolDiscountPercent
 * @returns FareCalculationResult with integer paisa amounts
 */
export function calculateFare(input: FareCalculationInput): FareCalculationResult {
  const { baseFare, distanceKm, ratePerKm, poolDiscountPercent } = input;

  if (baseFare < 0 || !Number.isFinite(baseFare)) {
    throw new TypeError('baseFare must be a non-negative finite number in paisa.');
  }

  if (distanceKm < 0 || !Number.isFinite(distanceKm)) {
    throw new TypeError('distanceKm must be a non-negative finite number.');
  }

  if (ratePerKm < 0 || !Number.isFinite(ratePerKm)) {
    throw new TypeError('ratePerKm must be a non-negative finite number in paisa.');
  }

  if (poolDiscountPercent < 0 || poolDiscountPercent > 100 || !Number.isFinite(poolDiscountPercent)) {
    throw new TypeError('poolDiscountPercent must be a number between 0 and 100.');
  }

  // Ensure baseFare is an integer in paisa
  const normalizedBaseFare = Math.round(baseFare);

  // Compute distance charge as integer in paisa
  const distanceCharge = Math.round(distanceKm * ratePerKm);

  // Compute gross fare before discount
  const grossFare = normalizedBaseFare + distanceCharge;

  // Compute pool discount amount as integer in paisa
  const poolDiscount = Math.round(grossFare * (poolDiscountPercent / 100));

  // Compute final passenger fare
  const passengerFare = Math.max(0, grossFare - poolDiscount);

  return {
    baseFare: normalizedBaseFare,
    distanceKm,
    ratePerKm: Math.round(ratePerKm),
    distanceCharge,
    grossFare,
    poolDiscountPercent,
    poolDiscount,
    passengerFare,
    fareInBdt: passengerFare / 100
  };
}

/**
 * Convenience helper: Evaluates discount percentage based on active pool passenger count.
 * E.g., Solo rider = 0% discount, 2+ riders = 20% discount, 3 riders = 25%, 4 riders = 30%.
 */
export function getPoolDiscountPercent(sharedPassengersCount: number): number {
  if (sharedPassengersCount <= 1) return 0;
  if (sharedPassengersCount === 2) return 20;
  if (sharedPassengersCount === 3) return 25;
  return 30; // Max 4 seats in Tesla Model 3
}
