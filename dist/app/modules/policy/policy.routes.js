"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyRoutes = void 0;
const express_1 = __importDefault(require("express"));
const policy_controller_1 = require("./policy.controller");
const auth_1 = require("../../middlewares/auth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const policy_validation_1 = require("./policy.validation");
const router = express_1.default.Router();
const adminOnly = [auth_1.authMiddleware, (0, auth_1.authorize)('admin')];
// Public read policy (auto-seeded)
router.get('/:type', policy_controller_1.PolicyController.getPolicyController);
// Admin operations
router.put('/:type', ...adminOnly, (0, validateRequest_1.default)(policy_validation_1.updatePolicyHeaderValidationSchema), policy_controller_1.PolicyController.updatePolicyHeaderController);
router.post('/:type/sections', ...adminOnly, (0, validateRequest_1.default)(policy_validation_1.addPolicySectionValidationSchema), policy_controller_1.PolicyController.addPolicySectionController);
router.put('/:type/sections/:sectionId', ...adminOnly, (0, validateRequest_1.default)(policy_validation_1.updatePolicySectionValidationSchema), policy_controller_1.PolicyController.updatePolicySectionController);
router.delete('/:type/sections/:sectionId', ...adminOnly, policy_controller_1.PolicyController.deletePolicySectionController);
router.put('/:type/reorder', ...adminOnly, (0, validateRequest_1.default)(policy_validation_1.reorderPolicySectionsValidationSchema), policy_controller_1.PolicyController.reorderPolicySectionsController);
exports.PolicyRoutes = router;
