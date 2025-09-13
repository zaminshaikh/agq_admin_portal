#!/usr/bin/env node

/**
 * Admin SDK Script to Set Admin Permissions
 * 
 * Usage: node set-admin-permissions.js <uid> <permission>
 * 
 * Examples:
 *   node set-admin-permissions.js Q8zqHinlLpN6peztBCrJX1CwEdB2 admin
 *   node set-admin-permissions.js Q8zqHinlLpN6peztBCrJX1CwEdB2 write
 *   node set-admin-permissions.js Q8zqHinlLpN6peztBCrJX1CwEdB2 read
 *   node set-admin-permissions.js Q8zqHinlLpN6peztBCrJX1CwEdB2 none
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./team-shaikh-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const validPermissions = ['none', 'read', 'write', 'admin'];

async function setAdminPermissions(uid, permission) {
  try {
    console.log(`\n🔧 Setting admin permissions for UID: ${uid}`);
    console.log(`📋 Permission level: ${permission}`);
    
    // Validate permission
    if (!validPermissions.includes(permission)) {
      throw new Error(`Invalid permission: ${permission}. Valid options: ${validPermissions.join(', ')}`);
    }

    // Verify user exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUser(uid);
      console.log(`✅ User found: ${userRecord.email || 'No email'}`);
    } catch (error) {
      throw new Error(`User with UID ${uid} not found in Firebase Auth: ${error}`);
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, {
      adminPermissions: permission
    });

    console.log(`✅ Custom claims updated successfully`);

    // Update or create admin document in Firestore
    const adminDoc = {
      id: uid,
      name: userRecord.displayName || userRecord.email?.split('@')[0] || 'Unknown',
      email: userRecord.email || 'No email',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'Admin SDK Script'
    };

    // Check if admin document exists
    const adminDocRef = admin.firestore().collection('admins').doc(uid);
    const existingDoc = await adminDocRef.get();

    if (existingDoc.exists) {
      // Update existing document
      await adminDocRef.update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'Admin SDK Script'
      });
      console.log(`✅ Admin document updated in Firestore`);
    } else {
      // Create new document
      adminDoc.createdAt = admin.firestore.FieldValue.serverTimestamp();
      adminDoc.createdBy = 'Admin SDK Script';
      await adminDocRef.set(adminDoc);
      console.log(`✅ Admin document created in Firestore`);
    }

    // Verify the changes
    const updatedUserRecord = await admin.auth().getUser(uid);
    const currentPermissions = updatedUserRecord.customClaims?.adminPermissions;
    
    console.log(`\n🎉 Success! Admin permissions set:`);
    console.log(`   UID: ${uid}`);
    console.log(`   Email: ${userRecord.email || 'No email'}`);
    console.log(`   Permission: ${currentPermissions}`);
    console.log(`   Status: ${currentPermissions === 'none' ? 'No Access' : 'Active'}`);

    if (permission === 'admin') {
      console.log(`\n⚡ This user now has FULL ADMIN ACCESS including:`);
      console.log(`   • User management`);
      console.log(`   • All data read/write permissions`);
      console.log(`   • Access to Admin Management panel`);
    } else if (permission === 'write') {
      console.log(`\n📝 This user now has WRITE ACCESS including:`);
      console.log(`   • Read and write data permissions`);
      console.log(`   • Cannot manage other admins`);
    } else if (permission === 'read') {
      console.log(`\n👁️  This user now has READ-ONLY ACCESS`);
      console.log(`   • Can view data but cannot make changes`);
    } else if (permission === 'none') {
      console.log(`\n🚫 This user has NO ACCESS to the portal`);
    }

  } catch (error) {
    console.error(`\n❌ Error setting admin permissions:`, error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log(`
🔧 Admin Permissions Manager

Usage: node set-admin-permissions.js <uid> <permission>

Arguments:
  uid         Firebase Auth UID of the user
  permission  Permission level: none, read, write, admin

Examples:
  node set-admin-permissions.js Q8zqHinlLpN6peztBCrJX1CwEdB2 admin
  node set-admin-permissions.js Q8zqHinlLpN6peztBCrJX1CwEdB2 write
  node set-admin-permissions.js Q8zqHinlLpN6peztBCrJX1CwEdB2 read
  node set-admin-permissions.js Q8zqHinlLpN6peztBCrJX1CwEdB2 none

Permission Levels:
  none   - No access to the portal
  read   - View-only access to all data
  write  - Can create and edit data (includes read)
  admin  - Full access including user management
`);
  process.exit(1);
}

const [uid, permission] = args;

// Run the function
setAdminPermissions(uid, permission)
  .then(() => {
    console.log(`\n✨ Script completed successfully`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n💥 Script failed:`, error);
    process.exit(1);
  });
