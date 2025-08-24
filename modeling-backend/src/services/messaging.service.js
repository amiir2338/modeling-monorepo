// src/services/messaging.service.js
import mongoose from 'mongoose';
import Thread from '../models/thread.model.js';
import Message from '../models/message.model.js';
import Application from '../models/application.model.js';
import Job from '../models/job.model.js';
import User from '../models/user.model.js';

const { Types } = mongoose;

/** طرفین گفتگو را از روی Application پیدا می‌کند (ownerUserId و modelUserId) */
export async function resolveParticipantsByApplication(applicationId) {
  const app = await Application.findById(applicationId)
    .select('jobId modelUserId modelId')
    .lean();
  if (!app) throw new Error('Application not found');

  const job = await Job.findById(app.jobId).select('clientId title').lean();
  if (!job) throw new Error('Job not found');

  // نگاشت clientId پروفایل → userId مالک
  const owner = await User.findOne({ clientId: job.clientId }).select('_id').lean();
  if (!owner?._id) throw new Error('Job owner user not found');

  const modelUserId = app.modelUserId ?? app.modelId;
  if (!modelUserId) throw new Error('Application missing model user id');

  const participants = [String(owner._id), String(modelUserId)];
  const uniq = [...new Set(participants)];
  if (uniq.length !== 2) throw new Error('Participants resolution failed');

  return {
    app,
    job,
    ownerUserId: owner._id,
    modelUserId,
    participants: uniq.map((x) => new Types.ObjectId(x)),
  };
}

/** Thread را از روی applicationId برمی‌گرداند یا می‌سازد */
export async function getOrCreateThreadByApplication(applicationId) {
  const { participants } = await resolveParticipantsByApplication(applicationId);

  let thread = await Thread.findOne({ applicationId }).lean();
  if (thread) return thread;

  thread = await Thread.create({
    applicationId,
    participants,
    lastMessage: null,
    lastMessageAt: null,
    unreadBy: [],
  });
  return thread.toObject();
}

/** اطمینان از اینکه user عضوی از Thread است */
export function ensureUserInThread(thread, userId) {
  const ok = (thread?.participants || []).some((p) => String(p) === String(userId));
  if (!ok) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
}

/** طرف مقابل در Thread را برمی‌گرداند */
export function otherParticipantId(thread, userId) {
  const other = (thread.participants || []).find((p) => String(p) !== String(userId));
  return other ? new Types.ObjectId(other) : null;
}

/** ارسال پیام + آپدیت Thread (lastMessage, unreadBy) */
export async function sendMessage({ senderId, applicationId, threadId, text = '', attachments = [] }) {
  // Thread را پیدا/بساز
  let thread = threadId
    ? await Thread.findById(threadId)
    : await Thread.findOne({ applicationId });

  if (!thread) {
    const { participants } = await resolveParticipantsByApplication(applicationId);
    thread = await Thread.create({ applicationId, participants, unreadBy: [] });
  }

  ensureUserInThread(thread, senderId);
  const toUserId = otherParticipantId(thread, senderId);

  // پیام را ذخیره کن
  const msg = await Message.create({
    threadId: thread._id,
    applicationId: thread.applicationId,
    senderId,
    toUserId,          // هم‌ساز با مدل فعلی شما (alias recipientId هم کار می‌کند)
    text,
    attachments,
    // readBy: sender به صورت خودکار در pre('save') مدل Message اضافه می‌شود
  });

  // آپدیت Thread
  const now = new Date();
  const unreadBy = (thread.unreadBy || []).map(String).filter((u) => u !== String(senderId));
  if (toUserId && !unreadBy.includes(String(toUserId))) unreadBy.push(String(toUserId));

  await Thread.updateOne(
    { _id: thread._id },
    {
      $set: {
        lastMessage: { senderId, text: text?.slice(0, 5000) || (attachments?.length ? '[attachment]' : ''), at: now },
        lastMessageAt: now,
        unreadBy,
      },
    }
  );

  return { message: msg, threadId: thread._id };
}

/** مارک‌کردن خوانده‌شدن یک پیام و پاک‌کردن user از unreadBy Thread */
export async function markMessageRead(messageId, userId) {
  const m = await Message.findById(messageId);
  if (!m) throw new Error('Message not found');

  const thread = await Thread.findById(m.threadId);
  if (!thread) throw new Error('Thread not found');

  ensureUserInThread(thread, userId);

  await Message.updateOne({ _id: m._id }, { $addToSet: { readBy: userId } });
  await Thread.updateOne({ _id: thread._id }, { $pull: { unreadBy: userId } });

  const updated = await Message.findById(m._id).lean();
  return { ok: true, data: updated };
}

/** مارک‌کردن خوانده‌شدن تمام پیام‌های یک Thread توسط user */
export async function markThreadRead(threadId, userId) {
  const thread = await Thread.findById(threadId);
  if (!thread) throw new Error('Thread not found');
  ensureUserInThread(thread, userId);

  await Message.updateMany(
    { threadId: thread._id, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );
  await Thread.updateOne({ _id: thread._id }, { $pull: { unreadBy: userId } });

  return { ok: true };
}

/** لیست پیام‌های یک Thread (pagination) */
export async function listMessages({ threadId, applicationId, userId, page = 1, limit = 20 }) {
  let thread = null;
  if (threadId) thread = await Thread.findById(threadId).lean();
  else if (applicationId) thread = await Thread.findOne({ applicationId }).lean();

  if (!thread) return { data: [], page, limit, total: 0 };

  ensureUserInThread(thread, userId);

  const _page = Math.max(1, Number(page));
  const _limit = Math.max(1, Number(limit));
  const skip = (_page - 1) * _limit;

  const [items, total] = await Promise.all([
    Message.find({ threadId: thread._id }).sort({ createdAt: -1 }).skip(skip).limit(_limit).lean(),
    Message.countDocuments({ threadId: thread._id }),
  ]);

  return { data: items, page: _page, limit: _limit, total, thread };
}

/** لیست Threadهای کاربر (unread فلگ می‌خورد) */
export async function listThreads({ userId, page = 1, limit = 20 }) {
  const _page = Math.max(1, Number(page));
  const _limit = Math.max(1, Number(limit));
  const skip = (_page - 1) * _limit;

  const q = { participants: userId };
  const [items, total] = await Promise.all([
    Thread.find(q).sort({ lastMessageAt: -1 }).skip(skip).limit(_limit).lean(),
    Thread.countDocuments(q),
  ]);

  const withUnread = items.map((t) => ({
    ...t,
    unread: (t.unreadBy || []).map(String).includes(String(userId)),
  }));

  return { data: withUnread, page: _page, limit: _limit, total };
}

/** شمارش Threadهای خوانده‌نشدهٔ کاربر */
export async function unreadThreadCount(userId) {
  const cnt = await Thread.countDocuments({ participants: userId, unreadBy: userId });
  return cnt;
}

export default {
  resolveParticipantsByApplication,
  getOrCreateThreadByApplication,
  ensureUserInThread,
  otherParticipantId,
  sendMessage,
  markMessageRead,
  markThreadRead,
  listMessages,
  listThreads,
  unreadThreadCount,
};
