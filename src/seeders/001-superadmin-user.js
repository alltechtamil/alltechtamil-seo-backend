'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the project root .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  async up(queryInterface, Sequelize) {
    const email = process.env.SUPERADMIN_EMAIL || 'admin@alltectamil.com';
    const password = process.env.SUPERADMIN_PASSWORD || 'Admin@123';

    // Dynamically retrieve authoritative security constant to avoid magic numbers
    const { SECURITY } = require('../../dist/config/constants');
    const passwordHash = await bcrypt.hash(password, SECURITY.SALT_ROUNDS);

    await queryInterface.bulkInsert(
      'users',
      [
        {
          id: uuidv4(),
          name: 'Super Admin',
          email: email,
          password_hash: passwordHash,
          role: 'superadmin',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    const email = process.env.SUPERADMIN_EMAIL || 'admin@alltectamil.com';
    await queryInterface.bulkDelete('users', { email: email }, {});
  },
};
