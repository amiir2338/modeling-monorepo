// scripts/seed.js
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import Client from '../src/models/client.model.js';
import Job from '../src/models/job.model.js';
import bcrypt from 'bcrypt';
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/modeling_db';
async function run() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to MongoDB for seeding");
  await User.deleteMany({}); await Client.deleteMany({}); await Job.deleteMany({});
  const pass = await bcrypt.hash("123456", 10);
  const admin = await User.create({ email: "admin@example.com", password: pass, role: "admin", isActive: true });
  const clientUser = await User.create({ email: "client@example.com", password: pass, role: "client", isActive: true });
  const client = await Client.create({ userId: clientUser._id, name: "Sample Client" });
  const job = await Job.create({ title:"Sample Modeling Job", budget:"500$", city:"Tehran", description:"Test job", requirements:["Photoshoot","Portfolio"], status:"approved", clientId: client._id });
  const modelUser = await User.create({ email: "model@example.com", password: pass, role: "model", isActive: true });
  console.log("Seed complete");
  await mongoose.disconnect();
}
run().catch(e=>{ console.error(e); process.exit(1); });
