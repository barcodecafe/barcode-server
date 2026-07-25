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
        console.log('🗄️  Database connected successfully');
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
    origin: '*', // Production-এ আপনার ফ্রন্টএন্ড ডোমেন নাম দিন (e.g. 'https://myrestaurant.com')
    methods: ['GET', 'POST'],
  },
});

// Express app instance-এ 'io' সেট করে রাখা যেন Controller/Service থেকে access করা যায়
app.set('io', io);

// ⚡ Socket Connections & Events Listener
io.on('connection', (socket) => {
  // console.log('⚡ Socket connected:', socket.id);

  // কাস্টমার Checkout.jsx থেকে 'create_order' emit করলে তা হ্যান্ডেল করা
  socket.on('create_order', (newOrder) => {
    // ১. অ্যাডমিন প্যানেলে রিয়েল-টাইম সংকেত পাঠানো
    io.emit('admin_new_order', newOrder);
    
    // ২. রাইডার ড্যাশবোর্ডে নতুন ডেলিভারি সংকেত পাঠানো
    io.emit('rider_new_delivery', newOrder);
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