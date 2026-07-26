import http from 'http';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import config from './app/config';

// ─── Vercel Serverless: Cache connection across warm invocations ───
let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
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
    origin: '*', // Production-এ আপনার ফ্রন্টএন্ড ডোমেন নাম দিন (e.g. 'https://barcoderestaurantgroup.com')
    methods: ['GET', 'POST'],
  },
});

// Express app instance-এ 'io' সেট করে রাখা যেন Controller/Service থেকে access করা যায়
app.set('io', io);

// ⚡ Socket Connections & Real-time Events Listener
io.on('connection', (socket) => {
  // console.log('⚡ Socket connected:', socket.id);

  // 🛒 1. কাস্টমার থেকে নতুন অর্ডার প্লেস হলে
  socket.on('create_order', (newOrder) => {
    io.emit('order_created', newOrder);
    io.emit('admin_new_order', newOrder);
    io.emit('rider_new_delivery', newOrder);
  });

  // 🚴 2. অ্যাডমিন রাইডার অ্যাসাইন করলে (Rider Notification + Sound Alert Trigger)
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

  // 🔄 3. অর্ডারের স্ট্যাটাস চেঞ্জ হলে (Pending, Preparing, Out for Delivery, Delivered)
  socket.on('order_status_updated', (data) => {
    io.emit('order_status_updated', data);
    io.emit('order_updated', data);
  });

  // 📝 4. যেকোনো অর্ডার ডাটা আপডেট হলে
  socket.on('order_updated', (data) => {
    io.emit('order_updated', data);
  });

  // 💬 5. কাস্টমার-অ্যাডমিন-রাইডার রিয়েল-টাইম চ্যাট মেসেজ
  socket.on('send_message', (data) => {
    io.emit('new_chat_message', data);
  });

  socket.on('disconnect', () => {
    // console.log('❌ Socket disconnected:', socket.id);
  });
});

const PORT = config.port || 5000;

async function startServer() {
  try {
    await connectDB();
    // ⚠️ app.listen-এর বদলে HTTP server.listen ব্যবহার করতে হবে
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

// For Vercel serverless
export default async function handler(req: any, res: any) {
  await connectDB();
  return app(req, res);
}