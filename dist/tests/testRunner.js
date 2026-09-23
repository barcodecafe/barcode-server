"use strict";
// src/tests/testRunner.ts
// Lightweight, zero-dependency TypeScript Test Suite Runner
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect = exports.it = exports.describe = exports.runner = exports.TestRunner = void 0;
class TestRunner {
    constructor() {
        this.total = 0;
        this.passed = 0;
        this.failed = 0;
        this.currentSuite = '';
    }
    describe(suiteName, fn) {
        this.currentSuite = suiteName;
        console.log(`\n📦 \x1b[1m\x1b[34m[TEST SUITE]\x1b[0m \x1b[1m${suiteName}\x1b[0m`);
        fn();
    }
    it(testName, fn) {
        this.total++;
        try {
            fn();
            this.passed++;
            console.log(`  ✅ \x1b[32mPASS:\x1b[0m ${testName}`);
        }
        catch (err) {
            this.failed++;
            console.log(`  ❌ \x1b[31mFAIL:\x1b[0m ${testName}`);
            console.log(`     \x1b[31mError: ${(err === null || err === void 0 ? void 0 : err.message) || err}\x1b[0m`);
        }
    }
    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
                }
            },
            toEqual: (expected) => {
                const actualStr = JSON.stringify(actual);
                const expectedStr = JSON.stringify(expected);
                if (actualStr !== expectedStr) {
                    throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
                }
            },
            toBeCloseTo: (expected, delta = 0.01) => {
                if (Math.abs(actual - expected) > delta) {
                    throw new Error(`Expected ${expected} ± ${delta} but got ${actual}`);
                }
            },
            toBeGreaterThan: (expected) => {
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
            toContain: (item) => {
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
exports.TestRunner = TestRunner;
exports.runner = new TestRunner();
const describe = (name, fn) => exports.runner.describe(name, fn);
exports.describe = describe;
const it = (name, fn) => exports.runner.it(name, fn);
exports.it = it;
const expect = (actual) => exports.runner.expect(actual);
exports.expect = expect;
