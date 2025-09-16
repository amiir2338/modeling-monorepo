// scripts/seed.js
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import Client from '../src/models/client.model.js';
import Job from '../src/models/job.model.js';
import bcrypt from 'bcryptjs';

let MONGO_URL = process.env.MONGO_URL || null;

async function ensureMongo() {
  if (MONGO_URL) return MONGO_URL;
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const m = await MongoMemoryServer.create();
    MONGO_URL = m.getUri();
    console.log('🧪 Started in-memory MongoDB for seeding at', MONGO_URL);
    return MONGO_URL;
  } catch (e) {
    // fallback to localhost default
    MONGO_URL = 'mongodb://localhost:27017/modeling_db';
    return MONGO_URL;
  }
}
async function run() {
  const url = await ensureMongo();
  await mongoose.connect(url);
  console.log("Connected to MongoDB for seeding");
  await User.deleteMany({}); await Client.deleteMany({}); await Job.deleteMany({});
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const clientPass = process.env.CLIENT_PASSWORD || 'client123';
  const modelPass = process.env.MODEL_PASSWORD || 'model123';
  const adminHash = await bcrypt.hash(adminPass, 10);
  const clientHash = await bcrypt.hash(clientPass, 10);
  const modelHash = await bcrypt.hash(modelPass, 10);
  const admin = await User.create({ email: "admin@example.com", password: adminHash, role: "admin", isActive: true });
  const clientUser = await User.create({ email: "client@example.com", password: clientHash, role: "client", isActive: true });
  const client = await Client.create({ userId: clientUser._id, name: "Sample Client" });
  const job = await Job.create({
    title: "Sample Modeling Job",
    // budget must be a Number according to schema
    budget: 500,
    city: "Tehran",
    description: "Test job",
    requirements: ["Photoshoot", "Portfolio"],
    status: "approved",
    clientId: client._id,
  });
  const modelUser = await User.create({ email: "model@example.com", password: modelHash, role: "model", isActive: true });
  console.log("Seed complete");
  await mongoose.disconnect();
}
run().catch(e=>{ console.error(e); process.exit(1); });
