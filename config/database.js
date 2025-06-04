const pg = require('pg'); // Changed to 'require'
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.NEXT_DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectModule: pg,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // This line is correct and necessary
        }
    },
    logging: false,
});

module.exports = sequelize;