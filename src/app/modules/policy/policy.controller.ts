import { Request, Response } from 'express';
import { PolicyService } from './policy.service';

const getPolicyController = async (req: Request, res: Response) => {
  try {
    const data = await PolicyService.getPolicyService(req.params.type);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePolicyHeaderController = async (req: Request, res: Response) => {
  try {
    const data = await PolicyService.updatePolicyHeaderService(
      req.params.type,
      req.body
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Policy header updated successfully',
      data,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addPolicySectionController = async (req: Request, res: Response) => {
  try {
    const data = await PolicyService.addPolicySectionService(
      req.params.type,
      req.body
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }
    res.status(201).json({
      success: true,
      message: 'Section added successfully',
      data,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePolicySectionController = async (req: Request, res: Response) => {
  try {
    const data = await PolicyService.updatePolicySectionService(
      req.params.type,
      req.params.sectionId,
      req.body
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Section or policy not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Section updated successfully',
      data,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deletePolicySectionController = async (req: Request, res: Response) => {
  try {
    const data = await PolicyService.deletePolicySectionService(
      req.params.type,
      req.params.sectionId
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Section or policy not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Section deleted successfully',
      data,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const reorderPolicySectionsController = async (req: Request, res: Response) => {
  try {
    const data = await PolicyService.reorderPolicySectionsService(
      req.params.type,
      req.body.sectionIds
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Sections reordered successfully',
      data,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const PolicyController = {
  getPolicyController,
  updatePolicyHeaderController,
  addPolicySectionController,
  updatePolicySectionController,
  deletePolicySectionController,
  reorderPolicySectionsController,
};
