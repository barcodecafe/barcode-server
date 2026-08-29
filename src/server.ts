import http from 'http';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import app from './app';
import config from './app/config';
import { Order } from './app/modules/order/order.model';
import { OrderService } from './app/modules/order/order.service';
import { Branch } from './app/modules/branch/branch.model';
import { Feedback } from './app/modules/feedback/feedback.model';
import { startPaymentReconciliationCron } from './app/modules/payment/paymentReconciliation.worker';

// ─── Vercel Serverless: Cache connection ───
let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function syncBranchRatings() {
  try {
    // 🎯 Auto-map recent unassigned customer feedbacks from phone to Muradpur branch if requested
    await Feedback.updateMany(
      {
        phone: { $regex: '1571354254' },
        $or: [{ branchId: null }, { branchId: '' }, { branchName: 'General / Online Delivery' }],
      },
      {
        $set: { branchId: 3, branchName: 'Barcode Food Junction Muradpur' },
      }
    );

    const branches = await Branch.find({});
    for (const b of branches) {
      const numId = Number(b.id);
      const conditions: any[] = [
        { branchId: String(b.id) },
        { branchName: b.name },
      ];
      if (Number.isFinite(numId)) conditions.push({ branchId: numId });
      if (b._id) conditions.push({ branchId: String(b._id) });

      const feedbacks = await Feedback.find({ $or: conditions });
      if (feedbacks && feedbacks.length > 0) {
        const total = feedbacks.reduce((sum, f) => {
          return sum + ((f.foodQuality || 5) + (f.serviceSpeed || 5) + (f.staffBehavior || 5)) / 3;
        }, 0);
        b.rating = Math.round((total / feedbacks.length) * 10) / 10;
      } else {
        b.rating = 4.5;
      }
      await b.save();
    }
  } catch (e) {
    // Non-critical background sync
  }
}

async function syncLegacyPaidOrders() {
  try {
    const res = await Order.updateMany(
      {
        paymentStatus: { $ne: 'Paid' },
        $or: [
          {
            paymentMethod: { $nin: ['cod', 'COD', 'Cash on Delivery', 'cash on delivery'] },
            status: { $in: ['Delivered', 'Accepted', 'Preparing', 'Ready to Pick', 'Out for Delivery'] },
          },
          {
            transactionId: { $exists: true, $ne: '' },
          },
        ],
      },
      {
        $set: { paymentStatus: 'Paid' },
      },
    );
    if (res.modifiedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`✅ Auto-synced ${res.modifiedCount} legacy online orders to PAID`);
    }
  } catch (e) {
    // Non-critical background sync
  }
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      bufferTimeoutMS: 15000,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 50,
      minPoolSize: 10,
      maxIdleTimeMS: 60000,
    };
    cached.promise = mongoose
      .connect(config.database_url as string, opts)
      .then(async (m) => {
        // eslint-disable-next-line no-console
        console.log('🗄️ Database connected successfully');
        syncLegacyPaidOrders();
        syncBranchRatings();
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}

// ─── Express App-কে HTTP Server-এ র‍্যাপ করা ───
const server = http.createServer(app);

// ─── Socket.io Initialization ───
export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

// ⚡ Multi-core Cluster Adapter for Socket.IO when Redis is configured
if (config.redis_url) {
  try {
    const redisOptions: any = {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: false,
      retryStrategy: (times: number) => {
        if (times > 3) return null; // Stop retrying if Redis is unreachable
        return Math.min(times * 150, 1500);
      },
    };

    const pubClient = new Redis(config.redis_url, redisOptions);
    pubClient.on('error', (err) => {
      console.warn('⚠️ Redis pubClient warning:', err?.message || err);
    });

    const subClient = pubClient.duplicate();
    subClient.on('error', (err) => {
      console.warn('⚠️ Redis subClient warning:', err?.message || err);
    });

    io.adapter(createAdapter(pubClient, subClient));
  } catch (err: any) {
    console.warn('⚠️ Socket.IO Redis adapter failed to attach:', err?.message || err);
  }
}

app.set('io', io);

// 🔒 Socket.io Authentication Handshake Middleware
io.use((socket, next) => {
  try {
    const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (rawToken) {
      const token = String(rawToken).startsWith('Bearer ')
        ? String(rawToken).split(' ')[1]
        : String(rawToken);
      const decoded = jwt.verify(token, config.jwt.access_secret) as {
        _id: string;
        role: string;
        email?: string;
      };
      socket.data.user = decoded;
    } else {
      socket.data.user = null;
    }
  } catch {
    socket.data.user = null;
  }
  next();
});

// ⚡ Socket Connections & Real-time Events Listener
io.on('connection', (socket) => {
  const user = socket.data.user;
  const role = String(user?.role || '').toLowerCase();
  const userId = String(user?._id || '').trim();

  // Room partitioning by role and identity
  if (['admin', 'super_admin', 'superadmin'].includes(role)) {
    socket.join('admins');
  }
  if (role === 'rider' && userId) {
    socket.join(`rider:${userId}`);
  }
  if (userId) {
    socket.join(`user:${userId}`);
  }

  socket.on('join_order_room', (orderId: string) => {
    if (orderId && typeof orderId === 'string') {
      socket.join(`order:${orderId}`);
    }
  });

  // 🔔 0. ক্লায়েন্ট/এডমিন কানেক্ট হলে ইনস্ট্যান্ট পেন্ডিং কাউন্ট রিকোয়েস্ট হ্যান্ডলার
  socket.on('get_pending_count', async () => {
    try {
      const pendingCount = await OrderService.getPendingCountService();
      socket.emit('pending_count_updated', { 
        count: pendingCount, 
        pendingCount, 
        data: pendingCount 
      });
    } catch (err) {
      // ignore
    }
  });

  // 🛒 1. নতুন অর্ডার প্লেস হলে (Targeted & Broadcast)
  socket.on('create_order', async (newOrder) => {
    io.to('admins').emit('order_created', newOrder);
    io.to('admins').emit('admin_new_order', newOrder);
    if (newOrder?.riderId) {
      io.to(`rider:${newOrder.riderId}`).emit('rider_new_delivery', newOrder);
    }
    if (newOrder?.user?.id) {
      io.to(`user:${newOrder.user.id}`).emit('order_created', newOrder);
    }

    try {
      const pendingCount = await OrderService.getPendingCountService();
      io.to('admins').emit('pending_count_updated', { 
        count: pendingCount, 
        pendingCount, 
        data: pendingCount 
      });
    } catch (err) {
      // ignore
    }
  });

  // 🚴 2. রাইডার অ্যাসাইন
  socket.on('rider_order_assigned', (data) => {
    io.to('admins').emit('rider_order_assigned', data);
    io.to('admins').emit('order_assigned', data);
    if (data?.riderId) {
      io.to(`rider:${data.riderId}`).emit('rider_order_assigned', data);
      io.to(`rider:${data.riderId}`).emit('order_assigned', data);
    }
    if (data?.orderId || data?.id) {
      io.to(`order:${data.orderId || data.id}`).emit('order_updated', data);
    }
  });

  socket.on('order_assigned', (data) => {
    io.to('admins').emit('order_assigned', data);
    if (data?.riderId) {
      io.to(`rider:${data.riderId}`).emit('order_assigned', data);
    }
    if (data?.orderId || data?.id) {
      io.to(`order:${data.orderId || data.id}`).emit('order_updated', data);
    }
  });

  // 🔄 3. অর্ডারের স্ট্যাটাস চেঞ্জ
  socket.on('order_status_updated', async (data) => {
    io.to('admins').emit('order_status_updated', data);
    if (data?.order?.riderId) {
      io.to(`rider:${data.order.riderId}`).emit('order_status_updated', data);
    }
    if (data?.order?.user?.id) {
      io.to(`user:${data.order.user.id}`).emit('order_status_updated', data);
    }
    if (data?.orderId || data?.order?._id) {
      io.to(`order:${data.orderId || data.order._id}`).emit('order_status_updated', data);
    }

    try {
      const pendingCount = await OrderService.getPendingCountService();
      io.to('admins').emit('pending_count_updated', { 
        count: pendingCount, 
        pendingCount, 
        data: pendingCount 
      });
    } catch (err) {
      // ignore
    }
  });

  // 📝 4. ডাটা আপডেট
  socket.on('order_updated', (data) => {
    io.to('admins').emit('order_updated', data);
    if (data?.riderId) {
      io.to(`rider:${data.riderId}`).emit('order_updated', data);
    }
    if (data?.user?.id) {
      io.to(`user:${data.user.id}`).emit('order_updated', data);
    }
    if (data?._id || data?.id) {
      io.to(`order:${data._id || data.id}`).emit('order_updated', data);
    }
  });

  // 🚴 5. রাইডার অর্ডারের স্ট্যাটাস আপডেট ব্রডকাস্ট
  socket.on('rider_order_updated', (data) => {
    io.to('admins').emit('rider_order_updated', data);
    if (data?.riderId) {
      io.to(`rider:${data.riderId}`).emit('rider_order_updated', data);
    }
    if (data?._id || data?.id) {
      io.to(`order:${data._id || data.id}`).emit('order_updated', data);
    }
  });

  // 💬 6. চ্যাট মেসেজ (Only to order room and admins)
  socket.on('send_message', (data) => {
    io.to('admins').emit('new_chat_message', data);
    if (data?.orderId) {
      io.to(`order:${data.orderId}`).emit('new_chat_message', data);
    }
  });

  // 💰 7. রাইডার ক্যাশ সেটেলমেন্ট সাবমিট
  socket.on('rider_cash_submitted', (data) => {
    io.to('admins').emit('rider_cash_submitted', data);
    if (data?.riderId) {
      io.to(`rider:${data.riderId}`).emit('order_updated', data);
    }
  });

  // 💰 8. এডমিন ক্যাশ সেটেলমেন্ট কনফার্ম
  socket.on('rider_cash_settled', (data) => {
    io.to('admins').emit('rider_cash_settled', data);
    if (data?.riderId) {
      io.to(`rider:${data.riderId}`).emit('rider_cash_settled', data);
    }
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

const PORT = config.port || 5000;

async function startServer() {
  try {
    await connectDB();
    server.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      // 🔄 Start background payment reconciliation worker (every 10 min)
      startPaymentReconciliationCron(10);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default async function handler(req: any, res: any) {
  await connectDB();
  return app(req, res);
}