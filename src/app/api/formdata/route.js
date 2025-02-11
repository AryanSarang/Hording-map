import Hording from '../../../../models/Hording';
import sequelize from '../../../../config/database';

export async function POST(req) {
    await sequelize.authenticate();
    console.log(req);
    const { latitude, longitude, mediaType, landmark, width, height, type, visibility, rate, customers, traffic, condition, hordingType, vendorName, pocName, ourRate, propertyCode, offers, description, slotTime, loopTime, displayHours, imageUrls } = await req.json();
    try {
        const formData = await Hording.create({ latitude, longitude, mediaType, landmark, width, height, type, visibility, rate, customers, traffic, condition, hordingType, vendorName, pocName, ourRate, propertyCode, offers, description, slotTime, loopTime, displayHours, imageUrls });
        return new Response(JSON.stringify(formData), { status: 201 });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
}

export async function GET() {
    await sequelize.authenticate();

    try {
        const formData = await Hording.findAll();
        return new Response(JSON.stringify(formData), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
}