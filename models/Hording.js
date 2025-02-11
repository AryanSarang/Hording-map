const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Hording = sequelize.define('Hording', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    latitude: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    longitude: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    mediaType: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    landmark: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    width: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    height: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    visibility: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    rate: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    customers: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    traffic: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    condition: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    hordingType: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    vendorName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    pocName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ourRate: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    propertyCode: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    offers: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    slotTime: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    loopTime: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    displayHours: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    imageUrls: {
        type: DataTypes.ARRAY(DataTypes.STRING), // Assuming imageUrls is an array of strings
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
});

module.exports = Hording;