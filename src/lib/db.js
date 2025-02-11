const { MONGODB_USERNAME, MONGODB_PASSWORD } = process.env;
export const MONGODB_URI = `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@map-nextjs.3htgjjf.mongodb.net/`