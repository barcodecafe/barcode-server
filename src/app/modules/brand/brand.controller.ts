/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { BrandService } from './brand.service';

// Public listing shows active brands only; admins can request everything with
// ?all=true so the admin manager can see/toggle hidden brands.
const getAllBrandsController = async (req: Request, res: Response) => {
  try {
    const isAdmin = (req as any).user?.role === 'admin';
    const includeInactive = isAdmin && req.query.all === 'true';
    res.status(200).json({ success: true, data: await BrandService.getAllBrandsService({ includeInactive }) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getBrandBySlugController = async (req: Request, res: Response) => {
  try {
    const brand = await BrandService.getBrandBySlugService(req.params.slug);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.status(200).json({ success: true, data: brand });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getBrandByIdController = async (req: Request, res: Response) => {
  try {
    const brand = await BrandService.getBrandByIdService(req.params.id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.status(200).json({ success: true, data: brand });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const createBrandController = async (req: Request, res: Response) => {
  try {
    const brand = await BrandService.createBrandService(req.body);
    res.status(201).json({ success: true, message: 'Brand created', data: brand });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const updateBrandController = async (req: Request, res: Response) => {
  try {
    const brand = await BrandService.updateBrandService(req.params.id, req.body);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.status(200).json({ success: true, message: 'Brand updated', data: brand });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const deleteBrandController = async (req: Request, res: Response) => {
  try {
    const brand = await BrandService.deleteBrandService(req.params.id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.status(200).json({ success: true, message: 'Brand deleted', data: brand });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

export const BrandController = {
  getAllBrandsController,
  getBrandBySlugController,
  getBrandByIdController,
  createBrandController,
  updateBrandController,
  deleteBrandController,
};
