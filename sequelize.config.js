'use strict';

/**
 * Sequelize CLI configuration wrapper.
 * Unwraps the TypeScript default-exported database configuration object for CLI consumption.
 */
const databaseModule = require('./dist/config/database');

module.exports = databaseModule.default || databaseModule;
