/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-ignore
import webpush from 'web-push';
import mongoose from 'mongoose';
import config from '../../config';
import { PushSubscription } from './notification.model';
import { IPushSubscriptionData } from './notification.interface';

// Initialize VAPID details
if (config.vapid.public_key && config.vapid.private_key) {
  try {
    webpush.setVapidDetails(
      config.vapid.mailto,
      config.vapid.public_key,
      config.vapid.private_key,
    );
  } catch (e) {
    console.warn('Failed to set VAPID details:', e);
  }
}

const getVapidPublicKey = () => {
  return config.vapid.public_key;
};

const HIGH_PRIORITY_PUSH_OPTIONS = {
  TTL: 60 * 60 * 24, // 24 hours
  urgency: 'high' as const,
  headers: {
    Urgency: 'high',
    Topic: 'order-alert',
  },
};

const subscribeUser = async (
  subscription: IPushSubscriptionData,
  role: string = 'admin',
  userId?: string | null,
) => {
  if (!subscription || !subscription.endpoint) {
    throw new Error('Invalid push subscription payload');
  }

  const normalizedRole = String(role || 'admin').toLowerCase().trim();
  let safeUserId: mongoose.Types.ObjectId | null = null;
  if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
    safeUserId = new mongoose.Types.ObjectId(String(userId));
  }

  const result = await PushSubscription.findOneAndUpdate(
    { 'subscription.endpoint': subscription.endpoint },
    {
      subscription,
      role: normalizedRole,
      userId: safeUserId,
    },
    { upsert: true, new: true },
  );

  return result;
};

const unsubscribeUser = async (endpoint: string) => {
  if (!endpoint) return null;
  return await PushSubscription.deleteOne({ 'subscription.endpoint': endpoint });
};

const sendNewOrderPush = async (order: any) => {
  if (!config.vapid.public_key || !config.vapid.private_key) {
    return;
  }

  try {
    const adminSubscriptions = await PushSubscription.find({
      role: {
        $in: [
          'admin',
          'super_admin',
          'superadmin',
          'manager',
          'restaurant_manager',
          'Admin',
          'Super_Admin',
          'SuperAdmin',
        ],
      },
    }).lean();

    if (!adminSubscriptions || adminSubscriptions.length === 0) {
      console.log('No active admin push subscriptions registered.');
      return;
    }

    const shortId = String(order.displayId || order.id || order._id || 'New').slice(-6).toUpperCase();
    const customerName = order.customerName || order.customer?.name || order.user?.name || 'Customer';
    const totalAmount = Number(order.totalAmount || order.total || order.grandTotal || 0).toFixed(0);
    const orderType = order.orderType === 'pickup' ? 'Self-Pickup' : 'Home Delivery';

    const payload = JSON.stringify({
      title: `🔔 New Order #${shortId} Received!`,
      body: `৳${totalAmount} • ${customerName} (${orderType})\nClick to view and manage order details.`,
      url: '/admin/orders',
      orderId: String(order._id || order.id || ''),
      tag: `order-${shortId}`,
      vibrate: [600, 250, 600, 250, 800],
    });

    const sendPromises = adminSubscriptions.map(async (subDoc) => {
      try {
        await webpush.sendNotification(
          subDoc.subscription as any,
          payload,
          HIGH_PRIORITY_PUSH_OPTIONS,
        );
      } catch (err: any) {
        // If subscription is expired or invalid (410 Gone / 404 Not Found), delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: subDoc._id });
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.warn('Failed to dispatch Web Push Notification:', error);
  }
};

const sendRiderOrderPush = async (order: any, riderId: string) => {
  if (!config.vapid.public_key || !config.vapid.private_key || !riderId) {
    return;
  }

  try {
    const rawRiderId = String(riderId).trim();
    const objectId = mongoose.Types.ObjectId.isValid(rawRiderId)
      ? new mongoose.Types.ObjectId(rawRiderId)
      : null;

    let riderSubscriptions = await PushSubscription.find({
      $or: [
        ...(objectId ? [{ userId: objectId }] : []),
        { userId: rawRiderId as any },
      ],
    }).lean();

    // Fallback: If no direct subscription mapped by userId, notify all active rider subscriptions
    if (!riderSubscriptions || riderSubscriptions.length === 0) {
      riderSubscriptions = await PushSubscription.find({
        role: { $in: ['rider', 'Rider'] },
      }).lean();
    }

    if (!riderSubscriptions || riderSubscriptions.length === 0) {
      console.log('No active rider push subscriptions registered for rider:', riderId);
      return;
    }

    const shortId = String(order.displayId || order.id || order._id || 'New').slice(-6).toUpperCase();
    const customerName = order.customerName || order.customer?.name || order.user?.name || 'Customer';
    const totalAmount = Number(order.totalAmount || order.total || order.grandTotal || 0).toFixed(0);

    const payload = JSON.stringify({
      title: `🚴 New Delivery Assigned #${shortId}!`,
      body: `৳${totalAmount} • ${customerName}\nClick to view and accept delivery.`,
      url: '/rider/orders',
      orderId: String(order._id || order.id || ''),
      tag: `rider-order-${shortId}`,
      vibrate: [600, 250, 600, 250, 800],
    });

    const sendPromises = riderSubscriptions.map(async (subDoc) => {
      try {
        await webpush.sendNotification(
          subDoc.subscription as any,
          payload,
          HIGH_PRIORITY_PUSH_OPTIONS,
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: subDoc._id });
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.warn('Failed to dispatch Rider Web Push Notification:', error);
  }
};

const sendTestPush = async (role: string = 'admin', userId?: string | null) => {
  if (!config.vapid.public_key || !config.vapid.private_key) {
    throw new Error('VAPID keys not configured on server');
  }

  const rawUserId = userId ? String(userId).trim() : null;
  const objectId = rawUserId && mongoose.Types.ObjectId.isValid(rawUserId)
    ? new mongoose.Types.ObjectId(rawUserId)
    : null;

  const normalizedRole = String(role || 'admin').toLowerCase().trim();

  let subscriptions = await PushSubscription.find({
    $or: [
      ...(objectId ? [{ userId: objectId }] : []),
      ...(rawUserId ? [{ userId: rawUserId as any }] : []),
      { role: normalizedRole },
    ],
  }).lean();

  if (!subscriptions || subscriptions.length === 0) {
    // If none found for specific query, return any active subscription
    subscriptions = await PushSubscription.find().sort({ updatedAt: -1 }).limit(10).lean();
  }

  if (!subscriptions || subscriptions.length === 0) {
    throw new Error('No push subscriptions found. Please enable notifications on this device first.');
  }

  const isRider = normalizedRole === 'rider';
  const payload = JSON.stringify({
    title: isRider ? '🚴 Rider Mobile Alert Connected!' : '🔔 Admin Mobile Alert Connected!',
    body: 'Your phone is connected! Notifications and vibration will work when screen is locked or in other apps.',
    url: isRider ? '/rider/orders' : '/admin/orders',
    tag: `test-${Date.now()}`,
    vibrate: [600, 250, 600, 250, 800],
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (subDoc) => {
      try {
        await webpush.sendNotification(
          subDoc.subscription as any,
          payload,
          HIGH_PRIORITY_PUSH_OPTIONS,
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: subDoc._id });
        }
        throw err;
      }
    }),
  );

  const sentCount = results.filter((r) => r.status === 'fulfilled').length;
  return { success: sentCount > 0, sentCount, total: subscriptions.length };
};

export const NotificationService = {
  getVapidPublicKey,
  subscribeUser,
  unsubscribeUser,
  sendNewOrderPush,
  sendRiderOrderPush,
  sendTestPush,
};
