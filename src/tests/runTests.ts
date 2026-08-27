// src/tests/runTests.ts
// Main Test Suite Runner Entry Point

process.env.DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/test_db';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_jwt_access_secret_1234567890';

import { runner } from './testRunner';
import { runOrderPricingTests } from './order.pricing.test';
import { runCouponRollbackTests } from './coupon.rollback.test';
import { runAuthSecurityTests } from './auth.security.test';

console.log('\n======================================================');
console.log('🧪 BARCODE CAFE SERVER — AUTOMATED INTEGRATION TEST SUITE');
console.log('======================================================');

const startTime = Date.now();

try {
  runOrderPricingTests();
  runCouponRollbackTests();
  runAuthSecurityTests();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const { total, passed, failed } = runner.getSummary();

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed}/${total} PASSED (${duration}s)`);
  if (failed > 0) {
    console.log(`❌ \x1b[31m${failed} TEST(S) FAILED\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`✅ \x1b[32mALL TEST SUITES PASSED CLEANLY!\x1b[0m`);
    console.log('======================================================\n');
    process.exit(0);
  }
} catch (error) {
  console.error('\n❌ Unhandled error during test execution:', error);
  process.exit(1);
}
