// filepath: src/app/api/formdata/route.js

import Hording from '../../../../models/Hording';
import sequelize from '../../../../config/database'; // Make sure this path is correct
import { Sequelize } from 'sequelize'; // Import Sequelize for instanceof check

export async function POST(req) {
    try {
        await sequelize.authenticate();
        console.log("Database connection authenticated successfully.");

        const body = await req.json();
        console.log("Received data:", body);

        // Directly pass the body to Hording.create()
        // Sequelize will map the properties from the body to the model's fields.
        const newEntry = await Hording.create(body);

        return new Response(JSON.stringify(newEntry), { status: 201 });

    } catch (error) {
        console.error("!!! API Error:", error);

        let errorResponse = {
            message: "Failed to process request.",
            errorName: error.name,
        };

        // Check if it's a Sequelize validation error to provide more specific feedback
        if (error instanceof Sequelize.ValidationError) {
            errorResponse.message = "Validation failed. Please check your input.";
            // Extract specific field errors
            errorResponse.validationErrors = error.errors.map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            return new Response(JSON.stringify(errorResponse), { status: 400 }); // Bad Request
        }

        // For other types of errors
        errorResponse.error = error.message;
        return new Response(JSON.stringify(errorResponse), { status: 500 }); // Internal Server Error
    }
}

// Keeping the GET route with similar error handling
export async function GET(req) {
    try {
        await sequelize.authenticate();
        const allHordings = await Hording.findAll();
        return new Response(JSON.stringify(allHordings), { status: 200 });
    } catch (error) {
        console.error("!!! API Error (GET):", error);
        return new Response(JSON.stringify({
            message: "Failed to fetch data.",
            error: error.message,
            errorName: error.name,
        }), { status: 500 });
    }
}