"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCounter = exports.getNextId = exports.Counter = void 0;
const mongoose_1 = require("mongoose");
const counterSchema = new mongoose_1.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});
exports.Counter = (0, mongoose_1.model)('Counter', counterSchema);
// পরবর্তী id — findOneAndUpdate $inc atomic, তাই concurrent create-এও collision হয় না
const getNextId = (name) => __awaiter(void 0, void 0, void 0, function* () {
    const c = yield exports.Counter.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { new: true, upsert: true });
    return c.seq;
});
exports.getNextId = getNextId;
// seed-এর পর counter কে current max-এ সেট করা (নাহলে প্রথম create বিদ্যমান id-র সাথে সংঘর্ষ করবে)
const setCounter = (name, value) => __awaiter(void 0, void 0, void 0, function* () {
    yield exports.Counter.findByIdAndUpdate(name, { seq: value }, { upsert: true });
});
exports.setCounter = setCounter;
