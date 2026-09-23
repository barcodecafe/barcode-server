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
exports.PolicyController = void 0;
const policy_service_1 = require("./policy.service");
const getPolicyController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield policy_service_1.PolicyService.getPolicyService(req.params.type);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Policy not found' });
        }
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const updatePolicyHeaderController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield policy_service_1.PolicyService.updatePolicyHeaderService(req.params.type, req.body);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Policy not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Policy header updated successfully',
            data,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const addPolicySectionController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield policy_service_1.PolicyService.addPolicySectionService(req.params.type, req.body);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Policy not found' });
        }
        res.status(201).json({
            success: true,
            message: 'Section added successfully',
            data,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const updatePolicySectionController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield policy_service_1.PolicyService.updatePolicySectionService(req.params.type, req.params.sectionId, req.body);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Section or policy not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Section updated successfully',
            data,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const deletePolicySectionController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield policy_service_1.PolicyService.deletePolicySectionService(req.params.type, req.params.sectionId);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Section or policy not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Section deleted successfully',
            data,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const reorderPolicySectionsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield policy_service_1.PolicyService.reorderPolicySectionsService(req.params.type, req.body.sectionIds);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Policy not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Sections reordered successfully',
            data,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.PolicyController = {
    getPolicyController,
    updatePolicyHeaderController,
    addPolicySectionController,
    updatePolicySectionController,
    deletePolicySectionController,
    reorderPolicySectionsController,
};
