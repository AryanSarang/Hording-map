const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Vendor = require('./Vendor');


const Hording = sequelize.define('Hording', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    // --- Location Fields ---
    latitude: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    longitude: {
        type: DataTypes.FLOAT,
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
    address: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    landmark: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // --- Hoarding Specification Fields ---
    mediaType: {
        type: DataTypes.ENUM('hording', 'busShelter', 'other'),
        allowNull: true,
    },
    width: {
        type: DataTypes.INTEGER, // Changed to INTEGER as requested
        allowNull: true,
    },
    height: {
        type: DataTypes.INTEGER, // Changed to INTEGER as requested
        allowNull: true,
    },
    hordingType: {
        type: DataTypes.ENUM('frontLit', 'backLit', 'led'),
        allowNull: true,
    },
    visibility: {
        type: DataTypes.ENUM('prime', 'high', 'medium', 'low'),
        allowNull: true,
    },
    quality: {
        type: DataTypes.ENUM('supreme', 'great', 'good', 'average'),
        allowNull: true,
    },
    // --- Commercial Fields ---
    rate: {
        type: DataTypes.INTEGER, // Changed to INTEGER as requested
        allowNull: true,
    },
    ourRate: {
        type: DataTypes.INTEGER, // Changed to INTEGER as requested
        allowNull: true,
    },
    paymentTerms: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    minimumBookingDuration: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    // --- Vendor and Client Fields ---
    vendorName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    pocName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    previousClientele: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    // --- LED Specific Fields ---
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
    // --- Metadata and Other ---
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
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'pending'),
        defaultValue: 'pending',
        allowNull: false,
    }
}, {
    timestamps: true,
});


Hording.belongsTo(Vendor, { as: 'vendor', foreignKey: 'vendorId' });
Vendor.hasMany(Hording, { as: 'hordings', foreignKey: 'vendorId' });
module.exports = Hording;