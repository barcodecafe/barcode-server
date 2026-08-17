import { Request, Response } from 'express';
import { CategoryService } from './category.service';

const getAllCategoriesController = async (_req: Request, res: Response) => {
  try {
    const result = await CategoryService.getAllCategoriesService();
    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve categories',
    });
  }
};

const getCategoryByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await CategoryService.getCategoryByIdService(id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Category retrieved successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve category',
    });
  }
};

const createCategoryController = async (req: Request, res: Response) => {
  try {
    const result = await CategoryService.createCategoryService(req.body);
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create category',
    });
  }
};

const updateCategoryController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await CategoryService.updateCategoryService(id, req.body);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update category',
    });
  }
};

const deleteCategoryController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleteFoods = req.query.deleteFoods === 'true';
    const result = await CategoryService.deleteCategoryService(id, deleteFoods);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete category',
    });
  }
};

const reorderCategoriesController = async (req: Request, res: Response) => {
  try {
    const { categories } = req.body;
    const result = await CategoryService.reorderCategoriesService(categories);
    res.status(200).json({
      success: true,
      message: 'Categories reordered successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reorder categories',
    });
  }
};

export const CategoryController = {
  getAllCategoriesController,
  getCategoryByIdController,
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
  reorderCategoriesController,
};
