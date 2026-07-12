import express from 'express';
import { FavoritesController } from './favorites.controller';
import { authMiddleware } from '../../middlewares/auth';

// mounted at /api/users/me/favorites (auth — নিজের favorites)
const router = express.Router();

router.get('/', authMiddleware, FavoritesController.getController);
router.post('/', authMiddleware, FavoritesController.addController);
router.delete('/:foodId', authMiddleware, FavoritesController.removeController);

export const FavoritesRoutes = router;
