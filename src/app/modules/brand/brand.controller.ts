/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { BrandService } from './brand.service';
import { externalizeImages, externalizeImagesList, stripExternalImageRefs } from '../images/images.transform';
import { publicApiBase } from '../../utils/publicApiBase';

// Public listing shows active brands only; admins can request everything with
// ?all=true so the admin manager can see/toggle hidden brands.
const getAllBrandsController = async (req: Request, res: Response) => {
  try {
    const isAdmin = (req as any).user?.role === 'admin';
    const includeInactive = isAdmin && req.query.all === 'true';
    res.status(200).json({ success: true, data: externalizeImagesList((await BrandService.getAllBrandsService({ includeInactive })) as any[], 'brand', publicApiBase(req)) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getBrandBySlugController = async (req: Request, res: Response) => {
  try {
    const brand = await BrandService.getBrandBySlugService(req.params.slug);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.status(200).json({ success: true, data: externalizeImages(brand as any, 'brand', publicApiBase(req)) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getBrandBranchesController = async (req: Request, res: Response) => {
  try {
    const result = await BrandService.getBrandBranchesService(req.params.slug);
    if (!result) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.status(200).json({
      success: true,
      data: {
        brand: externalizeImages((result as any).brand, 'brand', publicApiBase(req)),
        branches: externalizeImagesList((result as any).branches, 'branch', publicApiBase(req)),
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getBrandMenuController = async (req: Request, res: Response) => {
  try {
    const result = await BrandService.getBrandMenuService(req.params.slug);
    if (!result) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.status(200).json({
      success: true,
      data: {
        brand: externalizeImages((result as any).brand, 'brand', publicApiBase(req)),
        foods: externalizeImagesList((result as any).foods, 'food', publicApiBase(req)),
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getBrandByIdController = async (req: Request, res: Response) => {
  try {
    const brand = await BrandService.getBrandByIdService(req.params.id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.status(200).json({ success: true, data: externalizeImages(brand as any, 'brand', publicApiBase(req)) });
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
    // Drop logo/cover fields that came back as one of our own image urls —
    // otherwise saving an unrelated edit would overwrite the stored base64.
    stripExternalImageRefs(req.body, 'brand');
    const brand = await BrandService.updateBrandService(req.params.id, req.body);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.status(200).json({ success: true, message: 'Brand updated', data: externalizeImages(brand as any, 'brand', publicApiBase(req)) });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

// 🎯 Reorder Brands Controller (Live Server Sync)
const reorderBrandsController = async (req: Request, res: Response) => {
  try {
    const { brandIds } = req.body;
    await BrandService.reorderBrandsService(brandIds);
    res.status(200).json({ success: true, message: 'Brand order updated successfully' });
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
  getBrandBranchesController,
  getBrandMenuController,
  getBrandByIdController,
  createBrandController,
  updateBrandController,
  reorderBrandsController, // 👈 🎯 Export এ যোগ করা হয়েছে
  deleteBrandController,
};