// scripts/cleanup_e2e.js
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import Job from '../src/models/job.model.js';
import Application from '../src/models/application.model.js';
import Thread from '../src/models/thread.model.js';
import Message from '../src/models/message.model.js';
import Notification from '../src/models/notification.model.js';

const uri = process.env.MONGO_URI || process.env.MONGO_URL;
if (!uri) { console.error('No MONGO_URI'); process.exit(1); }

const EMAIL_PREFIXES = ['client', 'model', 'admin']; // همونی که در e2e استفاده کردیم

(async () => {
  await mongoose.connect(uri);
  console.log('Connected');

  const users = await User.find({
    email: { $regex: `^(${EMAIL_PREFIXES.join('|')})\\d+@example\\.com$`, $options: 'i' }
  }).select('_id email clientId').lean();

  const userIds = users.map(u => u._id);
  const clientIds = users.map(u => u.clientId).filter(Boolean);

  const jobs = await Job.find({ clientId: { $in: clientIds } }).select('_id').lean();
  const jobIds = jobs.map(j => j._id);

  const apps = await Application.find({ jobId: { $in: jobIds } }).select('_id').lean();
  const appIds = apps.map(a => a._id);

  const threads = await Thread.find({ applicationId: { $in: appIds } }).select('_id').lean();
  const threadIds = threads.map(t => t._id);

  console.log('Will delete:',
    '\n users:', users.length,
    '\n jobs:', jobs.length,
    '\n apps:', apps.length,
    '\n threads:', threads.length,
    '\n + related messages/notifications');

  await Promise.all([
    Message.deleteMany({ threadId: { $in: threadIds } }),
    Notification.deleteMany({ userId: { $in: userIds } }),
  ]);
  await Thread.deleteMany({ _id: { $in: threadIds } });
  await Application.deleteMany({ _id: { $in: appIds } });
  await Job.deleteMany({ _id: { $in: jobIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  console.log('Cleanup done ✅');
  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
