// src/app/docs/swagger.routes.ts
// Interactive Swagger UI HTML and JSON endpoints

import express, { Request, Response } from 'express';
import { swaggerSpec } from './swaggerSpec';

const router = express.Router();

// GET /api-docs/json  -> Raw OpenAPI JSON
router.get('/json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// GET /api-docs  -> Interactive Embedded Swagger UI
router.get('/', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Barcode Restaurant Group — API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.11.0/favicon-32x32.png" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #0f172a; color: #f8fafc; font-family: sans-serif; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { background: #ffffff; padding: 20px; border-radius: 12px; max-width: 1200px; margin: 30px auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header-banner { text-align: center; padding: 30px 20px 10px; }
    .header-banner h1 { margin: 0; color: #f59e0b; font-size: 28px; font-weight: 800; }
    .header-banner p { margin: 8px 0 0; color: #94a3b8; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header-banner">
    <h1>🍽️ Barcode Restaurant Group API</h1>
    <p>Interactive OpenAPI 3.0 Documentation & Live Testing Sandbox</p>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(swaggerSpec)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export const SwaggerRoutes = router;
