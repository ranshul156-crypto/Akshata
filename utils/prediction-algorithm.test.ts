/**
 * Test suite for prediction algorithm
 * Demonstrates deterministic behavior with sample datasets
 */

import { predictCycle, predictMultipleCycles, CycleEntry, UserProfile } from './prediction-algorithm';

interface TestCase {
  name: string;
  cycleEntries: CycleEntry[];
  profile: UserProfile;
  expectedSource: 'historical' | 'profile_default' | 'hybrid';
  expectedConfidenceRange: [number, number];
}

const testCases: TestCase[] = [
  {
    name: 'No historical data - should use profile defaults',
    cycleEntries: [],
    profile: { cycle_length_days: 28, period_length_days: 5 },
    expectedSource: 'profile_default',
    expectedConfidenceRange: [0.5, 0.5]
  },
  {
    name: 'One cycle - should use profile default with low confidence',
    cycleEntries: [
      { entry_date: '2024-01-01', flow_intensity: 'medium' },
      { entry_date: '2024-01-02', flow_intensity: 'heavy' },
      { entry_date: '2024-01-03', flow_intensity: 'medium' },
      { entry_date: '2024-01-04', flow_intensity: 'light' },
      { entry_date: '2024-01-05', flow_intensity: 'spotting' }
    ],
    profile: { cycle_length_days: 28, period_length_days: 5 },
    expectedSource: 'profile_default',
    expectedConfidenceRange: [0.5, 0.5]
  },
  {
    name: 'Two cycles - should use hybrid approach',
    cycleEntries: [
      // Cycle 1
      { entry_date: '2024-01-01', flow_intensity: 'medium' },
      { entry_date: '2024-01-02', flow_intensity: 'heavy' },
      { entry_date: '2024-01-03', flow_intensity: 'medium' },
      { entry_date: '2024-01-04', flow_intensity: 'light' },
      { entry_date: '2024-01-05', flow_intensity: 'spotting' },
      { entry_date: '2024-01-06', flow_intensity: 'none' },
      // Gap
      // Cycle 2
      { entry_date: '2024-01-29', flow_intensity: 'medium' },
      { entry_date: '2024-01-30', flow_intensity: 'heavy' },
      { entry_date: '2024-01-31', flow_intensity: 'medium' },
      { entry_date: '2024-02-01', flow_intensity: 'light' },
      { entry_date: '2024-02-02', flow_intensity: 'spotting' }
    ],
    profile: { cycle_length_days: 28, period_length_days: 5 },
    expectedSource: 'hybrid',
    expectedConfidenceRange: [0.6, 0.7]
  },
  {
    name: 'Three regular cycles - should use historical with high confidence',
    cycleEntries: [
      // Cycle 1
      { entry_date: '2024-01-01', flow_intensity: 'medium' },
      { entry_date: '2024-01-02', flow_intensity: 'heavy' },
      { entry_date: '2024-01-03', flow_intensity: 'medium' },
      { entry_date: '2024-01-04', flow_intensity: 'light' },
      { entry_date: '2024-01-05', flow_intensity: 'spotting' },
      // Cycle 2
      { entry_date: '2024-01-29', flow_intensity: 'medium' },
      { entry_date: '2024-01-30', flow_intensity: 'heavy' },
      { entry_date: '2024-01-31', flow_intensity: 'medium' },
      { entry_date: '2024-02-01', flow_intensity: 'light' },
      { entry_date: '2024-02-02', flow_intensity: 'spotting' },
      // Cycle 3
      { entry_date: '2024-02-26', flow_intensity: 'medium' },
      { entry_date: '2024-02-27', flow_intensity: 'heavy' },
      { entry_date: '2024-02-28', flow_intensity: 'medium' },
      { entry_date: '2024-02-29', flow_intensity: 'light' },
      { entry_date: '2024-03-01', flow_intensity: 'spotting' }
    ],
    profile: { cycle_length_days: 28, period_length_days: 5 },
    expectedSource: 'historical',
    expectedConfidenceRange: [0.7, 0.95]
  },
  {
    name: 'Irregular cycles - should have lower confidence',
    cycleEntries: [
      // Cycle 1 (28 days)
      { entry_date: '2024-01-01', flow_intensity: 'medium' },
      { entry_date: '2024-01-02', flow_intensity: 'heavy' },
      { entry_date: '2024-01-03', flow_intensity: 'medium' },
      // Cycle 2 (35 days - irregular)
      { entry_date: '2024-01-29', flow_intensity: 'medium' },
      { entry_date: '2024-01-30', flow_intensity: 'heavy' },
      // Cycle 3 (21 days - irregular)
      { entry_date: '2024-03-05', flow_intensity: 'medium' },
      { entry_date: '2024-03-06', flow_intensity: 'heavy' },
      // Cycle 4 (28 days)
      { entry_date: '2024-03-26', flow_intensity: 'medium' },
      { entry_date: '2024-03-27', flow_intensity: 'heavy' }
    ],
    profile: { cycle_length_days: 28, period_length_days: 5 },
    expectedSource: 'historical',
    expectedConfidenceRange: [0.5, 0.8]
  }
];

function runTests() {
  console.log('===========================================');
  console.log('Prediction Algorithm Test Suite');
  console.log('===========================================\n');

  let passedTests = 0;
  let failedTests = 0;

  testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: ${testCase.name}`);
    console.log('-'.repeat(50));

    try {
      const result = predictCycle(testCase.cycleEntries, testCase.profile);

      console.log(`Result:`);
      console.log(`  Next period start: ${result.next_period_start}`);
      console.log(`  Next period end: ${result.next_period_end}`);
      console.log(`  Fertility window: ${result.fertility_window_start} to ${result.fertility_window_end}`);
      console.log(`  Confidence: ${result.confidence}`);
      console.log(`  Source: ${result.source}`);
      console.log(`  Cycles analyzed: ${result.metadata.cycles_analyzed}`);
      if (result.metadata.average_cycle_length) {
        console.log(`  Average cycle length: ${result.metadata.average_cycle_length.toFixed(1)} days`);
      }
      if (result.metadata.std_deviation) {
        console.log(`  Standard deviation: ${result.metadata.std_deviation.toFixed(1)} days`);
      }

      // Validate source
      if (result.source !== testCase.expectedSource) {
        console.log(`  ❌ FAILED: Expected source '${testCase.expectedSource}', got '${result.source}'`);
        failedTests++;
        return;
      }

      // Validate confidence range
      const [minConf, maxConf] = testCase.expectedConfidenceRange;
      if (result.confidence < minConf || result.confidence > maxConf) {
        console.log(`  ❌ FAILED: Confidence ${result.confidence} not in expected range [${minConf}, ${maxConf}]`);
        failedTests++;
        return;
      }

      // Validate dates are in correct format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(result.next_period_start)) {
        console.log(`  ❌ FAILED: Invalid date format for next_period_start`);
        failedTests++;
        return;
      }

      console.log(`  ✅ PASSED`);
      passedTests++;

    } catch (error) {
      console.log(`  ❌ FAILED: ${error.message}`);
      failedTests++;
    }
  });

  console.log('\n===========================================');
  console.log('Test Summary');
  console.log('===========================================');
  console.log(`Total tests: ${testCases.length}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log('===========================================\n');

  // Test multiple predictions
  console.log('\nBonus Test: Multiple Cycle Predictions');
  console.log('-'.repeat(50));
  const multiplePredictions = predictMultipleCycles(
    testCases[3].cycleEntries,
    testCases[3].profile,
    3
  );

  console.log(`Generated ${multiplePredictions.length} predictions:`);
  multiplePredictions.forEach((pred, idx) => {
    console.log(`  Cycle ${idx + 1}: ${pred.next_period_start} (confidence: ${pred.confidence})`);
  });

  return failedTests === 0;
}

// Run tests if this file is executed directly
if (import.meta.main) {
  const success = runTests();
  Deno.exit(success ? 0 : 1);
}

export { runTests };
