// filepath: /config/database.js
import pg from 'pg';
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.NEXT_DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectModule: pg,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // This line allows self-signed certificates
        }

    },
    logging: false,
});

module.exports = sequelize;