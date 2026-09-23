"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageController = void 0;
const images_service_1 = require("./images.service");
// GET /api/images/:type/:id?f=<field>
//
// Public, like the list endpoints that reference it. Cached hard: callers append
// ?v=<updatedAt>, so the URL itself changes whenever an admin replaces an image
// and a stale cached copy can never be served.
const getImageController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const field = String(req.query.f || 'image');
        const image = yield (0, images_service_1.getImageService)(req.params.type, req.params.id, field);
        if (!image) {
            return res.status(404).json({ success: false, message: 'Image not found' });
        }
        res.setHeader('Content-Type', image.contentType);
        res.setHeader('Content-Length', image.buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        return res.status(200).end(image.buffer);
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});
exports.ImageController = { getImageController };
