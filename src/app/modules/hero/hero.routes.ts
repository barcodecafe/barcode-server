import express from 'express';
import { HeroController } from './hero.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { createHeroValidationSchema, updateHeroValidationSchema } from './hero.validation';

const router = express.Router();
const adminOnly = [authMiddleware, authorize('admin')];

router.get('/', HeroController.getAllSlidesController); // public
router.post('/', ...adminOnly, validateRequest(createHeroValidationSchema), HeroController.createSlideController);
router.patch('/:id', ...adminOnly, validateRequest(updateHeroValidationSchema), HeroController.updateSlideController);
router.put('/:id', ...adminOnly, validateRequest(updateHeroValidationSchema), HeroController.updateSlideController);
router.delete('/:id', ...adminOnly, HeroController.deleteSlideController);

export const HeroRoutes = router;
