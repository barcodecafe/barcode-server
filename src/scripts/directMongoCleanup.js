const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://151.158.101.246:27017/barcode';

async function runDirectCleanup() {
  try {
    console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB successfully.');

    const usersCollection = mongoose.connection.collection('users');

    // 1. Find all users in collection
    const allUsers = await usersCollection.find({}).toArray();
    console.log(`\nFound total ${allUsers.length} user documents in 'users' collection.`);

    const preserved = allUsers.filter((u) =>
      ['super_admin', 'superadmin', 'admin'].includes(u.role)
    );
    const toDelete = allUsers.filter(
      (u) => !['super_admin', 'superadmin', 'admin'].includes(u.role)
    );

    console.log('\n👑 PRESERVED ACCOUNTS:');
    preserved.forEach((u, i) => {
      console.log(`${i + 1}. [${u.role}] Name: "${u.name}", Email: "${u.email}", Phone: "${u.phone}"`);
    });

    console.log(`\n🗑️ USERS TO DELETE (${toDelete.length}):`);
    toDelete.forEach((u, i) => {
      console.log(`${i + 1}. [${u.role || 'no-role'}] Name: "${u.name}", Email: "${u.email}", Phone: "${u.phone}"`);
    });

    if (toDelete.length > 0) {
      const deleteResult = await usersCollection.deleteMany({
        role: { $nin: ['super_admin', 'superadmin', 'admin'] },
      });
      console.log(`\n✅ Successfully deleted ${deleteResult.deletedCount} user documents from MongoDB.`);
    } else {
      console.log('\n✅ No non-admin users found to delete.');
    }

    const remainingCount = await usersCollection.countDocuments({});
    console.log(`✨ Remaining documents in 'users' collection: ${remainingCount}`);

  } catch (err) {
    console.error('Error during cleanup:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

runDirectCleanup();
