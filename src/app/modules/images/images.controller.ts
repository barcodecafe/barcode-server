/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { getImageService } from './images.service';

// GET /api/images/:type/:id?f=<field>
//
// Public, like the list endpoints that reference it. Cached hard: callers append
// ?v=<updatedAt>, so the URL itself changes whenever an admin replaces an image
// and a stale cached copy can never be served.
const getImageController = async (req: Request, res: Response) => {
  try {
    const field = String(req.query.f || 'image');
    const image = await getImageService(req.params.type, req.params.id, field);

    if (!image) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    res.setHeader('Content-Type', image.contentType);
    res.setHeader('Content-Length', image.buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.status(200).end(image.buffer);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const ImageController = { getImageController };
