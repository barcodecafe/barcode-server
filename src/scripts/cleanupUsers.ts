import mongoose from 'mongoose';
import config from '../app/config';
import { User } from '../app/modules/user/user.model';

async function cleanupUsers() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(config.database_url as string);
    console.log('Connected to database successfully.');

    // 1. Find all users to keep (Super Admin and Sub-Admin)
    const preservedRoles = ['super_admin', 'superadmin', 'admin'];
    const usersToKeep = await User.find({ role: { $in: preservedRoles } }).lean();

    console.log('\n👑 PRESERVED ADMIN ACCOUNTS (Will NOT be deleted):');
    console.log('----------------------------------------------------');
    usersToKeep.forEach((u, i) => {
      console.log(`${i + 1}. [${u.role.toUpperCase()}] Name: "${u.name}", Email: "${u.email || 'N/A'}", Phone: "${u.phone || 'N/A'}"`);
    });

    if (usersToKeep.length === 0) {
      console.error('\n⚠️ WARNING: No Super Admin or Sub-Admin found! Aborting deletion to prevent database lock-out.');
      await mongoose.disconnect();
      return;
    }

    // 2. Count & list users to delete
    const usersToDelete = await User.find({ role: { $nin: preservedRoles } }).lean();
    console.log(`\n🗑️ TOTAL USERS TO DELETE: ${usersToDelete.length}`);
    console.log('----------------------------------------------------');
    usersToDelete.forEach((u, i) => {
      console.log(`${i + 1}. [${u.role}] Name: "${u.name}", Email: "${u.email || 'N/A'}", Phone: "${u.phone || 'N/A'}"`);
    });

    if (usersToDelete.length === 0) {
      console.log('\n✅ No other users found to delete. Database is already clean.');
      await mongoose.disconnect();
      return;
    }

    // 3. Execute delete
    const deleteResult = await User.deleteMany({ role: { $nin: preservedRoles } });
    console.log(`\n🎉 Successfully deleted ${deleteResult.deletedCount} user accounts.`);
    console.log(`✨ Remaining active users in database: ${usersToKeep.length} (Super Admins & Sub-Admins only).`);

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

cleanupUsers();
