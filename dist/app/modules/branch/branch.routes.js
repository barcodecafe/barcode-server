"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchRoutes = void 0;
const express_1 = __importDefault(require("express"));
const branch_controller_1 = require("./branch.controller");
const auth_1 = require("../../middlewares/auth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const branch_validation_1 = require("./branch.validation");
const router = express_1.default.Router();
const adminOnly = [auth_1.authMiddleware, (0, auth_1.authorize)('admin')];
// ⚠️ Dynamic /:id এর আগে static /search এবং /reorder বসানো আবশ্যক
router.get('/', branch_controller_1.BranchController.getAllBranchesController); // + ?limit=
router.get('/search', branch_controller_1.BranchController.searchBranchesController); // + ?q=
// 🎯 Reorder Route (অবশ্যই /:id এর আগে থাকতে হবে)
router.put('/reorder', ...adminOnly, (0, validateRequest_1.default)(branch_validation_1.reorderBranchesValidationSchema), branch_controller_1.BranchController.reorderBranchesController);
router.get('/:id', branch_controller_1.BranchController.getBranchByIdController);
router.get('/:branchId/menu', branch_controller_1.BranchController.getBranchMenuController);
// Admin CRUD
router.post('/', ...adminOnly, (0, validateRequest_1.default)(branch_validation_1.createBranchValidationSchema), branch_controller_1.BranchController.createBranchController);
router.patch('/:id', ...adminOnly, (0, validateRequest_1.default)(branch_validation_1.updateBranchValidationSchema), branch_controller_1.BranchController.updateBranchController);
router.put('/:id', ...adminOnly, (0, validateRequest_1.default)(branch_validation_1.updateBranchValidationSchema), branch_controller_1.BranchController.updateBranchController);
router.delete('/:id', ...adminOnly, branch_controller_1.BranchController.deleteBranchController);
exports.BranchRoutes = router;
