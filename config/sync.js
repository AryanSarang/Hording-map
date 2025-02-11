// filepath: /config/sync.js
const sequelize = require('./database');
const FormData = require('../models/Hording');

const syncDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        await sequelize.sync({ force: true }); // Use { force: true } only in development
        console.log('Database synchronized.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

syncDatabase();