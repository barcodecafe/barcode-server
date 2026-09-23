"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiderApplicationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const riderApplication_controller_1 = require("./riderApplication.controller");
const auth_1 = require("../../middlewares/auth");
const localUpload_1 = require("../../config/localUpload");
const router = express_1.default.Router();
const adminOnly = [auth_1.authMiddleware, (0, auth_1.authorize)('admin')];
// আবেদন জমা — লগইন লাগবে; multipart (photo image + license PDF)
router.post('/', auth_1.authMiddleware, localUpload_1.uploadRiderDocs, riderApplication_controller_1.RiderApplicationController.submitController);
// Admin
router.get('/', ...adminOnly, riderApplication_controller_1.RiderApplicationController.listController);
router.post('/:id/approve', ...adminOnly, riderApplication_controller_1.RiderApplicationController.approveController);
router.post('/:id/reject', ...adminOnly, riderApplication_controller_1.RiderApplicationController.rejectController);
router.patch('/:id', ...adminOnly, riderApplication_controller_1.RiderApplicationController.updateController);
router.put('/:id', ...adminOnly, riderApplication_controller_1.RiderApplicationController.updateController);
router.delete('/:id', ...adminOnly, riderApplication_controller_1.RiderApplicationController.deleteController);
router.get('/:id/documents', ...adminOnly, riderApplication_controller_1.RiderApplicationController.documentsController);
router.get('/:id/documents/:type', ...adminOnly, riderApplication_controller_1.RiderApplicationController.downloadController);
exports.RiderApplicationRoutes = router;
