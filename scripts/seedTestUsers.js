/**
 * seedTestUsers.js
 * One-time script to seed 3 test user documents into Firestore.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PREREQUISITES
 * 1. Install Firebase Admin SDK: cd scripts && npm install firebase-admin
 * 2. Download your service account key from Firebase Console:
 *    → Project Settings → Service Accounts → Generate new private key → Save as
 *    `scripts/serviceAccountKey.json`  (this file is gitignored)
 * 3. Get each test user's Firebase UID:
 *    a. Open your SPeakUp app and log in with the @spjimr.org Google account
 *    b. In Firebase Console → Authentication → Users, find the UID
 *    c. Replace the REPLACE_WITH_REAL_UID placeholders below
 * 4. Run: node scripts/seedTestUsers.js
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ALTERNATIVE (no script): manually add documents in Firebase Console:
 *   Firestore → users (collection) → Add document → use UID as document ID
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const testUsers = [
  {
    // ── Test Student ──────────────────────────────────────────────────────────
    // Login with: pgp25.rohan@spjimr.org (or any student @spjimr.org account)
    uid: 'REPLACE_WITH_REAL_STUDENT_UID',
    email: 'pgp25.rohan@spjimr.org',
    firstName: 'Rohan',
    middleName: '',
    lastName: 'Mehta',
    name: 'Rohan Mehta',
    phone: '9876543210',
    role: 'student',
    program: 'PGDM Year 1',
    casefileId: 'SPJ-ABCD-1234',
    likes: ['Music', 'Cricket'],
    dislikes: ['Deadlines'],
  },
  {
    // ── Test Counselor ────────────────────────────────────────────────────────
    // Login with: dimple.wagle@spjimr.org
    uid: 'REPLACE_WITH_REAL_COUNSELOR_UID',
    email: 'dimple.wagle@spjimr.org',
    firstName: 'Dimple',
    middleName: '',
    lastName: 'Wagle',
    name: 'Dimple Wagle',
    phone: '9123456780',
    role: 'counselor',
    program: '',
    casefileId: '',
    likes: [],
    dislikes: [],
  },
  {
    // ── Test Admin ────────────────────────────────────────────────────────────
    // Login with: admin@spjimr.org
    uid: 'REPLACE_WITH_REAL_ADMIN_UID',
    email: 'admin@spjimr.org',
    firstName: 'Admin',
    middleName: '',
    lastName: 'SPJIMR',
    name: 'Admin SPJIMR',
    phone: '9000000000',
    role: 'admin',
    program: '',
    casefileId: '',
    likes: [],
    dislikes: [],
  },
];

(async () => {
  console.log('🌱 Seeding SPeakUp test users to Firestore...\n');

  for (const user of testUsers) {
    if (user.uid.startsWith('REPLACE_')) {
      console.warn(`⚠️  Skipping ${user.email} — UID not set. Please log in first and replace the UID.`);
      continue;
    }

    try {
      await db.collection('users').doc(user.uid).set({
        ...user,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅  Created: ${user.email} (${user.role})`);
    } catch (err) {
      console.error(`❌  Failed to create ${user.email}:`, err.message);
    }
  }

  console.log('\n✨ Done! Check Firestore Console → users collection.');
  process.exit(0);
})();
