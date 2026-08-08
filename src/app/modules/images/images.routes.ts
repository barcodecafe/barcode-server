import express from 'express';
import { ImageController } from './images.controller';

const router = express.Router();

// Public — these are the same images the list endpoints used to inline.
router.get('/:type/:id', ImageController.getImageController);

export const ImageRoutes = router;
