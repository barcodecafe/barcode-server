// src/tests/testRunner.ts
// Lightweight, zero-dependency TypeScript Test Suite Runner

export class TestRunner {
  private total = 0;
  private passed = 0;
  private failed = 0;
  private currentSuite = '';

  describe(suiteName: string, fn: () => void) {
    this.currentSuite = suiteName;
    console.log(`\n📦 \x1b[1m\x1b[34m[TEST SUITE]\x1b[0m \x1b[1m${suiteName}\x1b[0m`);
    fn();
  }

  it(testName: string, fn: () => void) {
    this.total++;
    try {
      fn();
      this.passed++;
      console.log(`  ✅ \x1b[32mPASS:\x1b[0m ${testName}`);
    } catch (err: any) {
      this.failed++;
      console.log(`  ❌ \x1b[31mFAIL:\x1b[0m ${testName}`);
      console.log(`     \x1b[31mError: ${err?.message || err}\x1b[0m`);
    }
  }

  expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
        }
      },
      toEqual: (expected: any) => {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
          throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
        }
      },
      toBeCloseTo: (expected: number, delta = 0.01) => {
        if (Math.abs(actual - expected) > delta) {
          throw new Error(`Expected ${expected} ± ${delta} but got ${actual}`);
        }
      },
      toBeGreaterThan: (expected: number) => {
        if (!(actual > expected)) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`Expected null but got ${actual}`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error(`Expected defined value but got undefined`);
        }
      },
      toContain: (item: any) => {
        if (!Array.isArray(actual) && typeof actual !== 'string') {
          throw new Error(`Expected array or string but got ${typeof actual}`);
        }
        if (!actual.includes(item)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
        }
      },
    };
  }

  getSummary() {
    return { total: this.total, passed: this.passed, failed: this.failed };
  }
}

export const runner = new TestRunner();
export const describe = (name: string, fn: () => void) => runner.describe(name, fn);
export const it = (name: string, fn: () => void) => runner.it(name, fn);
export const expect = (actual: any) => runner.expect(actual);
