/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { HeroService } from './hero.service';
import { externalizeImagesList, stripExternalImageRefs } from '../images/images.transform';
import { publicApiBase } from '../../utils/publicApiBase';

const getAllSlidesController = async (req: Request, res: Response) => {
  try {
    const slides = await HeroService.getAllSlidesService();
    res.status(200).json({ success: true, data: externalizeImagesList(slides as any[], 'hero', publicApiBase(req)) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSlideController = async (req: Request, res: Response) => {
  try {
    const slide = await HeroService.createSlideService(req.body);
    res.status(201).json({ success: true, message: 'Slide created', data: slide });
  } catch (error: any) {
    // atomic counter id-race দূর করেছে; তবু unique-index dup (E11000) কখনো এলে raw Mongo
    // message ফাঁস না করে পরিষ্কার 409
    const isDup = error?.code === 11000;
    const status = error.status || (isDup ? 409 : 500);
    const message = isDup ? 'A hero slide with that id already exists. Please retry.' : error.message;
    res.status(status).json({ success: false, message });
  }
};

const updateSlideController = async (req: Request, res: Response) => {
  try {
    // Drop the image field when it came back as one of our own image urls —
    // otherwise saving an unrelated edit would overwrite the stored base64.
    stripExternalImageRefs(req.body, 'hero');
    const slide = await HeroService.updateSlideService(req.params.id, req.body);
    if (!slide) return res.status(404).json({ success: false, message: 'Hero slide not found' });
    res.status(200).json({ success: true, message: 'Slide updated', data: slide });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSlideController = async (req: Request, res: Response) => {
  try {
    const slide = await HeroService.deleteSlideService(req.params.id);
    if (!slide) return res.status(404).json({ success: false, message: 'Hero slide not found' });
    res.status(200).json({ success: true, message: 'Slide deleted', data: slide });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const HeroController = {
  getAllSlidesController,
  createSlideController,
  updateSlideController,
  deleteSlideController,
};
