/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { NotificationService } from './notification.service';

const getVapidPublicKey = async (_req: Request, res: Response) => {
  const publicKey = NotificationService.getVapidPublicKey();
  res.status(200).json({
    success: true,
    message: 'VAPID public key fetched',
    data: { publicKey },
  });
};

const subscribe = async (req: Request, res: Response) => {
  try {
    const { subscription, role, userId } = req.body;
    const actor = (req as any).user;
    const effectiveUserId = userId || actor?._id || actor?.id || null;
    const effectiveRole = role || actor?.role || 'admin';

    const result = await NotificationService.subscribeUser(
      subscription,
      effectiveRole,
      effectiveUserId,
    );

    res.status(200).json({
      success: true,
      message: 'Subscribed to push notifications successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Subscription failed',
    });
  }
};

const unsubscribe = async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    await NotificationService.unsubscribeUser(endpoint);
    res.status(200).json({
      success: true,
      message: 'Unsubscribed successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Unsubscribe failed',
    });
  }
};

const sendTestPush = async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.body;
    const actor = (req as any).user;
    const effectiveUserId = userId || actor?._id || actor?.id || null;
    const effectiveRole = role || actor?.role || 'admin';

    const result = await NotificationService.sendTestPush(effectiveRole, effectiveUserId);
    res.status(200).json({
      success: true,
      message: 'Test push notification sent successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test push notification',
    });
  }
};

export const NotificationController = {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  sendTestPush,
};
