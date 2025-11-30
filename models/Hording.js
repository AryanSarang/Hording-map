const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Vendor = require('./Vendor');

const Hording = sequelize.define('Hording', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    latitude: {
        type: DataTypes.DOUBLE,
        allowNull: true,
    },
    longitude: {
        type: DataTypes.DOUBLE,
        allowNull: true,
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    zone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    landmark: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    roadName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    roadFrom: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    roadTo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    positionWRTRoad: {
        type: DataTypes.ENUM('LHS', 'RHS'),
        allowNull: true,
    },
    trafficType: {
        type: DataTypes.ENUM('Morning', 'Evening'),
        allowNull: true,
    },
    screenNumber: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },

    mediaType: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    screenPlacement: {
        type: DataTypes.ENUM('Residential', 'Commercial', 'RailwayStation', 'Cafe', 'Pub', 'Club', 'Restaurant'),
        allowNull: true,
    },
    width: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    height: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    hordingType: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    visibility: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    rate: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    ourRate: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    paymentTerms: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    minimumBookingDuration: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    pocName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    previousClientele: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    screenSize: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    pocNumber: {
        type: DataTypes.STRING,
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
    imageUrls: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
    },
    dwellTime: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    compliance: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    timestamps: true,
});

Hording.belongsTo(Vendor, { as: 'vendor', foreignKey: 'vendorId' });
Vendor.hasMany(Hording, { as: 'hordings', foreignKey: 'vendorId' });

module.exports = Hording;
