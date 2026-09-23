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
exports.SettingsController = void 0;
const settings_service_1 = require("./settings.service");
const getSettingsController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settings = yield settings_service_1.SettingsService.getSettingsService();
        res.status(200).json({ success: true, data: settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const updateSettingsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settings = yield settings_service_1.SettingsService.updateSettingsService(req.body);
        // ⚡ Broadcast real-time update to all connected customers and admin tabs
        const io = req.app.get('io');
        if (io) {
            io.emit('settings_updated', settings);
            io.emit('free_delivery_updated', settings);
        }
        res.status(200).json({ success: true, message: 'Settings saved', data: settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const resetSettingsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settings = yield settings_service_1.SettingsService.resetSettingsService();
        // ⚡ Broadcast real-time update to all connected customers and admin tabs
        const io = req.app.get('io');
        if (io) {
            io.emit('settings_updated', settings);
            io.emit('free_delivery_updated', settings);
        }
        res.status(200).json({ success: true, message: 'Settings reset', data: settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.SettingsController = {
    getSettingsController,
    updateSettingsController,
    resetSettingsController,
};
