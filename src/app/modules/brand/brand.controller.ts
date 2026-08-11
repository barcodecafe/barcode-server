/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { BrandService } from './brand.service';
import { externalizeImages, externalizeImagesList, stripExternalImageRefs } from '../images/images.transform';
import { publicApiBase } from '../../utils/publicApiBase';

// Public listing shows active brands only; admins can request everything with
const getAllBrandsController = async (req: Request, res: Response) => {
  try {
    const isAdmin = (req as any).user?.role === 'admin';
    const includeInactive = isAdmin && req.query.all === 'true';
    
    const rawBrands = (await BrandService.getAllBrandsService({ includeInactive })) as any[];
    
    // 🎯 Ensure Backend Array Sorting by Order property before sending
    const sortedBrands = [...rawBrands].sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : 9999;
      const orderB = typeof b.order === 'number' ? b.order : 9999;
      return orderA - orderB;
    });

    res.status(200).json({ 
      success: true, 
      data: externalizeImagesList(sortedBrands, 'brand', publicApiBase(req)) 
    });
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

// 🎯 FIX: Reorder Brands Controller (Handles both brandIds and orderedIds flexibly)
const reorderBrandsController = async (req: Request, res: Response) => {
  try {
    const ids = req.body.brandIds || req.body.orderedIds || req.body.ids;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid array of brand IDs provided.' 
      });
    }

    await BrandService.reorderBrandsService(ids);
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
  reorderBrandsController,
  deleteBrandController,
};