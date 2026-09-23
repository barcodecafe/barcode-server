"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
exports.default = handler;
const http_1 = __importDefault(require("http"));
const mongoose_1 = __importDefault(require("mongoose"));
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const ioredis_1 = __importDefault(require("ioredis"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./app/config"));
const order_model_1 = require("./app/modules/order/order.model");
const order_service_1 = require("./app/modules/order/order.service");
const branch_model_1 = require("./app/modules/branch/branch.model");
const feedback_model_1 = require("./app/modules/feedback/feedback.model");
const paymentReconciliation_worker_1 = require("./app/modules/payment/paymentReconciliation.worker");
const orderAlert_worker_1 = require("./app/modules/order/orderAlert.worker");
const auth_1 = require("./app/middlewares/auth");
// ─── Vercel Serverless: Cache connection ───
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}
function syncBranchRatings() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const branches = yield branch_model_1.Branch.find({});
            for (const b of branches) {
                const numId = Number(b.id);
                const conditions = [
                    { branchId: String(b.id) },
                    { branchName: b.name },
                ];
                if (Number.isFinite(numId))
                    conditions.push({ branchId: numId });
                if (b._id)
                    conditions.push({ branchId: String(b._id) });
                const feedbacks = yield feedback_model_1.Feedback.find({ $or: conditions });
                if (feedbacks && feedbacks.length > 0) {
                    const total = feedbacks.reduce((sum, f) => {
                        return sum + ((f.foodQuality || 5) + (f.serviceSpeed || 5) + (f.staffBehavior || 5)) / 3;
                    }, 0);
                    b.rating = Math.round((total / feedbacks.length) * 10) / 10;
                }
                else {
                    b.rating = 4.5;
                }
                yield b.save();
            }
        }
        catch (e) {
            // Non-critical background sync
        }
    });
}
function syncLegacyPaidOrders() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield order_model_1.Order.updateMany({
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
            }, {
                $set: { paymentStatus: 'Paid' },
            });
            if (res.modifiedCount > 0) {
                // eslint-disable-next-line no-console
                console.log(`✅ Auto-synced ${res.modifiedCount} legacy online orders to PAID`);
            }
        }
        catch (e) {
            // Non-critical background sync
        }
    });
}
function connectDB() {
    return __awaiter(this, void 0, void 0, function* () {
        if (cached.conn)
            return cached.conn;
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
            cached.promise = mongoose_1.default
                .connect(config_1.default.database_url, opts)
                .then((m) => __awaiter(this, void 0, void 0, function* () {
                // eslint-disable-next-line no-console
                console.log('🗄️ Database connected successfully');
                syncLegacyPaidOrders();
                syncBranchRatings();
                return m;
            }));
        }
        try {
            cached.conn = yield cached.promise;
        }
        catch (e) {
            cached.promise = null;
            throw e;
        }
        return cached.conn;
    });
}
// ─── Express App-কে HTTP Server-এ র‍্যাপ করা ───
const server = http_1.default.createServer(app_1.default);
// ─── Socket.io Initialization ───
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
});
// ⚡ Multi-core Cluster Adapter for Socket.IO when Redis is configured
if (config_1.default.redis_url) {
    try {
        const redisOptions = {
            maxRetriesPerRequest: 1,
            connectTimeout: 3000,
            lazyConnect: false,
            retryStrategy: (times) => {
                if (times > 3)
                    return null; // Stop retrying if Redis is unreachable
                return Math.min(times * 150, 1500);
            },
        };
        const pubClient = new ioredis_1.default(config_1.default.redis_url, redisOptions);
        pubClient.on('error', (err) => {
            console.warn('⚠️ Redis pubClient warning:', (err === null || err === void 0 ? void 0 : err.message) || err);
        });
        const subClient = pubClient.duplicate();
        subClient.on('error', (err) => {
            console.warn('⚠️ Redis subClient warning:', (err === null || err === void 0 ? void 0 : err.message) || err);
        });
        exports.io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
    }
    catch (err) {
        console.warn('⚠️ Socket.IO Redis adapter failed to attach:', (err === null || err === void 0 ? void 0 : err.message) || err);
    }
}
app_1.default.set('io', exports.io);
// 🔒 Socket.io Authentication Handshake Middleware
exports.io.use((socket, next) => {
    var _a, _b;
    try {
        const rawToken = ((_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.token) || ((_b = socket.handshake.headers) === null || _b === void 0 ? void 0 : _b.authorization);
        if (rawToken) {
            const token = String(rawToken).startsWith('Bearer ')
                ? String(rawToken).split(' ')[1]
                : String(rawToken);
            const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.access_secret);
            socket.data.user = decoded;
        }
        else {
            socket.data.user = null;
        }
    }
    catch (_c) {
        socket.data.user = null;
    }
    next();
});
// ⚡ Socket Connections & Real-time Events Listener
exports.io.on('connection', (socket) => {
    const user = socket.data.user;
    const role = String((user === null || user === void 0 ? void 0 : user.role) || '').toLowerCase();
    const userId = String((user === null || user === void 0 ? void 0 : user._id) || '').trim();
    // Room partitioning by role and identity
    if ((0, auth_1.isAdminRole)(role)) {
        socket.join('admins');
    }
    if (role === 'rider' && userId) {
        socket.join(`rider:${userId}`);
    }
    if (userId) {
        socket.join(`user:${userId}`);
    }
    socket.on('join_order_room', (orderId) => {
        if (orderId && typeof orderId === 'string') {
            socket.join(`order:${orderId}`);
        }
    });
    // 🔔 0. ক্লায়েন্ট/এডমিন কানেক্ট হলে ইনস্ট্যান্ট পেন্ডিং কাউন্ট রিকোয়েস্ট হ্যান্ডলার
    socket.on('get_pending_count', () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const pendingCount = yield order_service_1.OrderService.getPendingCountService();
            socket.emit('pending_count_updated', {
                count: pendingCount,
                pendingCount,
                data: pendingCount
            });
        }
        catch (err) {
            // ignore
        }
    }));
    // 🛒 1. নতুন অর্ডার প্লেস হলে (Targeted & Broadcast)
    socket.on('create_order', (newOrder) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const isOnlineUnpaid = ((newOrder === null || newOrder === void 0 ? void 0 : newOrder.paymentMethod) || 'cod') !== 'cod' && (newOrder === null || newOrder === void 0 ? void 0 : newOrder.paymentStatus) !== 'Paid';
        const isAwaiting = (newOrder === null || newOrder === void 0 ? void 0 : newOrder.status) === 'Awaiting Payment';
        if (!isOnlineUnpaid && !isAwaiting) {
            exports.io.to('admins').emit('order_created', newOrder);
            exports.io.to('admins').emit('admin_new_order', newOrder);
            if (newOrder === null || newOrder === void 0 ? void 0 : newOrder.riderId) {
                exports.io.to(`rider:${newOrder.riderId}`).emit('rider_new_delivery', newOrder);
            }
        }
        if ((_a = newOrder === null || newOrder === void 0 ? void 0 : newOrder.user) === null || _a === void 0 ? void 0 : _a.id) {
            exports.io.to(`user:${newOrder.user.id}`).emit('order_created', newOrder);
        }
        try {
            const pendingCount = yield order_service_1.OrderService.getPendingCountService();
            exports.io.to('admins').emit('pending_count_updated', {
                count: pendingCount,
                pendingCount,
                data: pendingCount
            });
        }
        catch (err) {
            // ignore
        }
    }));
    // 🚴 2. রাইডার অ্যাসাইন
    socket.on('rider_order_assigned', (data) => {
        exports.io.to('admins').emit('rider_order_assigned', data);
        exports.io.to('admins').emit('order_assigned', data);
        if (data === null || data === void 0 ? void 0 : data.riderId) {
            exports.io.to(`rider:${data.riderId}`).emit('rider_order_assigned', data);
            exports.io.to(`rider:${data.riderId}`).emit('order_assigned', data);
        }
        if ((data === null || data === void 0 ? void 0 : data.orderId) || (data === null || data === void 0 ? void 0 : data.id)) {
            exports.io.to(`order:${data.orderId || data.id}`).emit('order_updated', data);
        }
    });
    socket.on('order_assigned', (data) => {
        exports.io.to('admins').emit('order_assigned', data);
        if (data === null || data === void 0 ? void 0 : data.riderId) {
            exports.io.to(`rider:${data.riderId}`).emit('order_assigned', data);
        }
        if ((data === null || data === void 0 ? void 0 : data.orderId) || (data === null || data === void 0 ? void 0 : data.id)) {
            exports.io.to(`order:${data.orderId || data.id}`).emit('order_updated', data);
        }
    });
    // 🔄 3. অর্ডারের স্ট্যাটাস চেঞ্জ
    socket.on('order_status_updated', (data) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        exports.io.to('admins').emit('order_status_updated', data);
        if ((_a = data === null || data === void 0 ? void 0 : data.order) === null || _a === void 0 ? void 0 : _a.riderId) {
            exports.io.to(`rider:${data.order.riderId}`).emit('order_status_updated', data);
        }
        if ((_c = (_b = data === null || data === void 0 ? void 0 : data.order) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.id) {
            exports.io.to(`user:${data.order.user.id}`).emit('order_status_updated', data);
        }
        if ((data === null || data === void 0 ? void 0 : data.orderId) || ((_d = data === null || data === void 0 ? void 0 : data.order) === null || _d === void 0 ? void 0 : _d._id)) {
            exports.io.to(`order:${data.orderId || data.order._id}`).emit('order_status_updated', data);
        }
        try {
            const pendingCount = yield order_service_1.OrderService.getPendingCountService();
            exports.io.to('admins').emit('pending_count_updated', {
                count: pendingCount,
                pendingCount,
                data: pendingCount
            });
        }
        catch (err) {
            // ignore
        }
    }));
    // 📝 4. ডাটা আপডেট
    socket.on('order_updated', (data) => {
        var _a;
        exports.io.to('admins').emit('order_updated', data);
        if (data === null || data === void 0 ? void 0 : data.riderId) {
            exports.io.to(`rider:${data.riderId}`).emit('order_updated', data);
        }
        if ((_a = data === null || data === void 0 ? void 0 : data.user) === null || _a === void 0 ? void 0 : _a.id) {
            exports.io.to(`user:${data.user.id}`).emit('order_updated', data);
        }
        if ((data === null || data === void 0 ? void 0 : data._id) || (data === null || data === void 0 ? void 0 : data.id)) {
            exports.io.to(`order:${data._id || data.id}`).emit('order_updated', data);
        }
    });
    // 🚴 5. রাইডার অর্ডারের স্ট্যাটাস আপডেট ব্রডকাস্ট
    socket.on('rider_order_updated', (data) => {
        exports.io.to('admins').emit('rider_order_updated', data);
        if (data === null || data === void 0 ? void 0 : data.riderId) {
            exports.io.to(`rider:${data.riderId}`).emit('rider_order_updated', data);
        }
        if ((data === null || data === void 0 ? void 0 : data._id) || (data === null || data === void 0 ? void 0 : data.id)) {
            exports.io.to(`order:${data._id || data.id}`).emit('order_updated', data);
        }
    });
    // 💬 6. চ্যাট মেসেজ (Only to order room and admins)
    socket.on('send_message', (data) => {
        exports.io.to('admins').emit('new_chat_message', data);
        if (data === null || data === void 0 ? void 0 : data.orderId) {
            exports.io.to(`order:${data.orderId}`).emit('new_chat_message', data);
        }
    });
    // 💰 7. রাইডার ক্যাশ সেটেলমেন্ট সাবমিট
    socket.on('rider_cash_submitted', (data) => {
        exports.io.to('admins').emit('rider_cash_submitted', data);
        if (data === null || data === void 0 ? void 0 : data.riderId) {
            exports.io.to(`rider:${data.riderId}`).emit('order_updated', data);
        }
    });
    // 💰 8. এডমিন ক্যাশ সেটেলমেন্ট কনফার্ম
    socket.on('rider_cash_settled', (data) => {
        exports.io.to('admins').emit('rider_cash_settled', data);
        if (data === null || data === void 0 ? void 0 : data.riderId) {
            exports.io.to(`rider:${data.riderId}`).emit('rider_cash_settled', data);
        }
    });
    socket.on('disconnect', () => {
        // disconnected
    });
});
const PORT = config_1.default.port || 5000;
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield connectDB();
            server.listen(PORT, () => {
                // eslint-disable-next-line no-console
                console.log(`🚀 Server is running on http://localhost:${PORT}`);
                // 🔄 Start background payment reconciliation worker (every 10 min)
                (0, paymentReconciliation_worker_1.startPaymentReconciliationCron)(10);
                // 🚨 Start repeating unaccepted order alert worker (every 3s high-urgency push + socket)
                (0, orderAlert_worker_1.startOrderAlertWorker)(exports.io, 3);
            });
        }
        catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    });
}
startServer();
function handler(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        yield connectDB();
        return (0, app_1.default)(req, res);
    });
}
