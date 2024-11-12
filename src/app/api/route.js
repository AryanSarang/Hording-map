import { NextResponse } from "next/server";
import { MONGODB_URI } from '../../lib/db';
import mongoose from "mongoose";


export async function GET() {

    await mongoose.connect(MONGODB_URI);
    return NextResponse.json({ result: true });
}