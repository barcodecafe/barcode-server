"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiderRoutes = void 0;
const express_1 = __importDefault(require("express"));
const rider_controller_1 = require("./rider.controller");
const auth_1 = require("../../middlewares/auth");
const localUpload_1 = require("../../config/localUpload");
const router = express_1.default.Router();
// Public — dedicated rider signup (multipart: photo + license), auto-login
router.post('/register', localUpload_1.uploadRiderDocs, rider_controller_1.RiderController.registerController);
router.get('/', auth_1.authMiddleware, (0, auth_1.authorize)('admin', 'super_admin'), rider_controller_1.RiderController.getAllRidersController);
router.post('/manual-create', auth_1.authMiddleware, (0, auth_1.authorize)('admin', 'super_admin'), rider_controller_1.RiderController.createRiderManualController);
router.get('/:id', auth_1.authMiddleware, (0, auth_1.authorize)('admin', 'super_admin', 'rider'), rider_controller_1.RiderController.getRiderByIdController);
router.patch('/:id/status', auth_1.authMiddleware, (0, auth_1.authorize)('admin', 'super_admin', 'rider'), rider_controller_1.RiderController.updateRiderStatusController);
router.patch('/:id/profile', auth_1.authMiddleware, (0, auth_1.authorize)('admin', 'super_admin'), rider_controller_1.RiderController.updateRiderProfileController);
router.delete('/:id', auth_1.authMiddleware, (0, auth_1.authorize)('admin', 'super_admin'), rider_controller_1.RiderController.deleteRiderController);
exports.RiderRoutes = router;
