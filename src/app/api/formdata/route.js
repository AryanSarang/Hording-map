import Hording from '../../../../models/Hording';
import Vendor from '../../../../models/Vendor';
import sequelize from '../../../../config/database';
import { Sequelize } from 'sequelize';

export async function POST(req) {
    try {
        await sequelize.authenticate();
        console.log("Database connection authenticated successfully.");

        const body = await req.json();
        console.log("Received data:", body);
        let vendorId = null;
        if (body.vendorName && body.vendorName.trim() !== '') {
            const [vendor] = await Vendor.findOrCreate({
                where: { name: body.vendorName.trim() },
                defaults: { name: body.vendorName.trim() }
            });
            vendorId = vendor.id;
        }
        const numericFields = ['width', 'height', 'rate', 'ourRate', 'latitude', 'longitude'];

        numericFields.forEach(field => {
            if (body[field] === '') {
                body[field] = null;
            }
        });

        const newEntry = await Hording.create({
            ...body,
            vendorId,
        });

        return new Response(JSON.stringify(newEntry), { status: 201 });

    } catch (error) {
        console.error("!!! API Error:", error);

        let errorResponse = {
            message: "Failed to process request.",
            errorName: error.name,
        };

        if (error instanceof Sequelize.ValidationError) {
            errorResponse.message = "Validation failed. Please check your input.";
            errorResponse.validationErrors = error.errors.map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            return new Response(JSON.stringify(errorResponse), { status: 400 });
        }

        errorResponse.error = error.message;
        return new Response(JSON.stringify(errorResponse), { status: 500 });
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