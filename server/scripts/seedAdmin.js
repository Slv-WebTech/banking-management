// Promotes an already-registered user to the admin role.
// Usage: node scripts/seedAdmin.js user@example.com
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/seedAdmin.js <email>');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: 'admin' },
    { new: true }
  );

  if (!user) {
    console.error(`No user found with email ${email}. Register the account first, then run this script.`);
    process.exitCode = 1;
  } else {
    console.log(`${user.email} is now an admin.`);
  }

  await mongoose.disconnect();
}

main();
