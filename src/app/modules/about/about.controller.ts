/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { AboutService } from './about.service';
import { externalizeImages, stripExternalImageRefs } from '../images/images.transform';
import { publicApiBase } from '../../utils/publicApiBase';

const nf = (res: Response) => res.status(404).json({ success: false, message: 'Item not found' });

const getAboutController = async (req: Request, res: Response) => {
  try {
    const doc = await AboutService.getAboutService();
    res.status(200).json({ success: true, data: externalizeImages(doc as any, 'about', publicApiBase(req)) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const updateCoreController = async (req: Request, res: Response) => {
  try {
    stripExternalImageRefs(req.body, 'about');
    const doc = await AboutService.updateAboutCoreService(req.body);
    res.status(200).json({ success: true, message: 'About updated', data: externalizeImages(doc as any, 'about', publicApiBase(req)) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const addTimelineController = async (req: Request, res: Response) => {
  try {
    res.status(201).json({ success: true, message: 'Timeline item added', data: await AboutService.addTimelineItemService(req.body) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const updateTimelineController = async (req: Request, res: Response) => {
  try {
    const data = await AboutService.updateTimelineItemService(req.params.id, req.body);
    if (!data) return nf(res);
    res.status(200).json({ success: true, message: 'Timeline item updated', data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const deleteTimelineController = async (req: Request, res: Response) => {
  try {
    const data = await AboutService.deleteTimelineItemService(req.params.id);
    if (!data) return nf(res);
    res.status(200).json({ success: true, message: 'Timeline item deleted', data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const addLeadershipController = async (req: Request, res: Response) => {
  try {
    const data = await AboutService.addLeadershipMemberService(req.body);
    res.status(201).json({ success: true, message: 'Leader added', data: externalizeImages(data as any, 'about', publicApiBase(req)) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const updateLeadershipController = async (req: Request, res: Response) => {
  try {
    if (req.body.image && typeof req.body.image === 'string' && req.body.image.includes('/api/images/')) {
      delete req.body.image;
    }
    const data = await AboutService.updateLeadershipMemberService(req.params.id, req.body);
    if (!data) return nf(res);
    res.status(200).json({ success: true, message: 'Leader updated', data: externalizeImages(data as any, 'about', publicApiBase(req)) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const deleteLeadershipController = async (req: Request, res: Response) => {
  try {
    const data = await AboutService.deleteLeadershipMemberService(req.params.id);
    if (!data) return nf(res);
    res.status(200).json({ success: true, message: 'Leader deleted', data: externalizeImages(data as any, 'about', publicApiBase(req)) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const AboutController = {
  getAboutController,
  updateCoreController,
  addTimelineController,
  updateTimelineController,
  deleteTimelineController,
  addLeadershipController,
  updateLeadershipController,
  deleteLeadershipController,
};
