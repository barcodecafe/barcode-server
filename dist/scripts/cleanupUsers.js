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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../app/config"));
const user_model_1 = require("../app/modules/user/user.model");
function cleanupUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Connecting to database...');
            yield mongoose_1.default.connect(config_1.default.database_url);
            console.log('Connected to database successfully.');
            // 1. Find all users to keep (Super Admin and Sub-Admin)
            const preservedRoles = ['super_admin', 'superadmin', 'admin'];
            const usersToKeep = yield user_model_1.User.find({ role: { $in: preservedRoles } }).lean();
            console.log('\n👑 PRESERVED ADMIN ACCOUNTS (Will NOT be deleted):');
            console.log('----------------------------------------------------');
            usersToKeep.forEach((u, i) => {
                console.log(`${i + 1}. [${u.role.toUpperCase()}] Name: "${u.name}", Email: "${u.email || 'N/A'}", Phone: "${u.phone || 'N/A'}"`);
            });
            if (usersToKeep.length === 0) {
                console.error('\n⚠️ WARNING: No Super Admin or Sub-Admin found! Aborting deletion to prevent database lock-out.');
                yield mongoose_1.default.disconnect();
                return;
            }
            // 2. Count & list users to delete
            const usersToDelete = yield user_model_1.User.find({ role: { $nin: preservedRoles } }).lean();
            console.log(`\n🗑️ TOTAL USERS TO DELETE: ${usersToDelete.length}`);
            console.log('----------------------------------------------------');
            usersToDelete.forEach((u, i) => {
                console.log(`${i + 1}. [${u.role}] Name: "${u.name}", Email: "${u.email || 'N/A'}", Phone: "${u.phone || 'N/A'}"`);
            });
            if (usersToDelete.length === 0) {
                console.log('\n✅ No other users found to delete. Database is already clean.');
                yield mongoose_1.default.disconnect();
                return;
            }
            // 3. Execute delete
            const deleteResult = yield user_model_1.User.deleteMany({ role: { $nin: preservedRoles } });
            console.log(`\n🎉 Successfully deleted ${deleteResult.deletedCount} user accounts.`);
            console.log(`✨ Remaining active users in database: ${usersToKeep.length} (Super Admins & Sub-Admins only).`);
        }
        catch (error) {
            console.error('Error during cleanup:', error);
        }
        finally {
            yield mongoose_1.default.disconnect();
            console.log('Disconnected from database.');
        }
    });
}
cleanupUsers();
