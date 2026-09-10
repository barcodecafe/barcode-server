/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-ignore
import webpush from 'web-push';
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

const subscribeUser = async (
  subscription: IPushSubscriptionData,
  role: string = 'admin',
  userId?: string | null,
) => {
  if (!subscription || !subscription.endpoint) {
    throw new Error('Invalid push subscription payload');
  }

  const result = await PushSubscription.findOneAndUpdate(
    { 'subscription.endpoint': subscription.endpoint },
    {
      subscription,
      role: role || 'admin',
      userId: userId ? userId : null,
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
      role: { $in: ['admin', 'super_admin', 'superadmin', 'manager', 'restaurant_manager'] },
    }).lean();

    if (!adminSubscriptions || adminSubscriptions.length === 0) return;

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
    });

    const sendPromises = adminSubscriptions.map(async (subDoc) => {
      try {
        await webpush.sendNotification(subDoc.subscription as any, payload);
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

export const NotificationService = {
  getVapidPublicKey,
  subscribeUser,
  unsubscribeUser,
  sendNewOrderPush,
};
