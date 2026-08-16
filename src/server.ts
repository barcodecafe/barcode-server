import http from 'http';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import config from './app/config';
import { OrderService } from './app/modules/order/order.service';

// ─── Vercel Serverless: Cache connection ───
let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
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
      maxPoolSize: 20,
      maxIdleTimeMS: 60000,
    };
    cached.promise = mongoose
      .connect(config.database_url as string, opts)
      .then((m) => {
        // eslint-disable-next-line no-console
        console.log('🗄️ Database connected successfully');
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

app.set('io', io);

// ⚡ Socket Connections & Real-time Events Listener
io.on('connection', (socket) => {

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

  // 🛒 1. নতুন অর্ডার প্লেস হলে
  socket.on('create_order', async (newOrder) => {
    io.emit('order_created', newOrder);
    io.emit('admin_new_order', newOrder);
    io.emit('rider_new_delivery', newOrder);

    try {
      const pendingCount = await OrderService.getPendingCountService();
      io.emit('pending_count_updated', { 
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
    io.emit('rider_order_assigned', data);
    io.emit('order_assigned', data);
    io.emit('order_updated', data);
  });

  socket.on('order_assigned', (data) => {
    io.emit('order_assigned', data);
    io.emit('rider_order_assigned', data);
    io.emit('order_updated', data);
  });

  // 🔄 3. অর্ডারের স্ট্যাটাস চেঞ্জ
  socket.on('order_status_updated', async (data) => {
    io.emit('order_status_updated', data);
    io.emit('order_updated', data);

    try {
      const pendingCount = await OrderService.getPendingCountService();
      io.emit('pending_count_updated', { 
        count: pendingCount, 
        pendingCount, 
        data: pendingCount 
      });
    } catch (err) {
      // ignore
    }
  });

  // 📝 4. ডাটা আপডেট (এডমিন ও রাইডার স্ট্যাটাস ওভাররাইডের জন্য)
  socket.on('order_updated', (data) => {
    io.emit('order_updated', data);
    io.emit('rider_order_updated', data);
  });

  // 🚴 5. রাইডার অর্ডারের স্ট্যাটাস আপডেট ব্রডকাস্ট
  socket.on('rider_order_updated', (data) => {
    io.emit('rider_order_updated', data);
    io.emit('order_updated', data);
  });

  // 💬 6. চ্যাট মেসেজ
  socket.on('send_message', (data) => {
    io.emit('new_chat_message', data);
  });

  // 💰 7. রাইডার ক্যাশ সেটেলমেন্ট সাবমিট (Admin Notification)
  socket.on('rider_cash_submitted', (data) => {
    io.emit('rider_cash_submitted', data);
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