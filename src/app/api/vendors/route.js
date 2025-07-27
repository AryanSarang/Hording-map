import sequelize from '../../../../config/database'; // Import sequelize instance
import Vendor from '../../../../models/Vendor';

export async function GET() {
    try {
        // Add this line to ensure the database is connected
        await sequelize.authenticate();

        const vendors = await Vendor.findAll({
            order: [['name', 'ASC']] // Order them alphabetically
        });
        return new Response(JSON.stringify(vendors), { status: 200 });
    } catch (error) {
        console.error("!!! API Error (GET /api/vendors):", error);
        return new Response(JSON.stringify({ message: "Failed to fetch vendors.", error: error.message }), { status: 500 });
    }
}