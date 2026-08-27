// src/app/docs/swaggerSpec.ts
// OpenAPI 3.0.0 Specification for Barcode Cafe Restaurant Group Backend API

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Barcode Restaurant Group API',
    version: '1.0.0',
    description:
      'Official RESTful Backend API Documentation for Barcode Restaurant Group & Cafe (Multi-Brand, Multi-Branch, Real-Time Socket.IO, SSLCommerz Payment Gateway & Rider Fleet Management System).',
    contact: {
      name: 'Barcode Tech Team',
      email: 'barcode.bd@gmail.com',
      url: 'https://www.barcoderestaurantgroup.com',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Primary API Gateway',
    },
    {
      url: 'http://localhost:5000/api',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token (obtained from /auth/login or /auth/register)',
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  tags: [
    { name: 'Auth', description: 'User, Admin & Rider Authentication & Password Recovery' },
    { name: 'Foods', description: 'Dishes, Categories, Variations, Add-ons & Menu Management' },
    { name: 'Orders', description: 'Order Creation, Status Lifecycle, Rider Assignment & Live Chat' },
    { name: 'Payments', description: 'SSLCommerz Payment Integration & IPN Webhook Verification' },
    { name: 'Branches', description: 'Restaurant Branches & Geo-locations' },
    { name: 'Brands', description: 'Restaurant Group Brand Portfolios' },
    { name: 'Coupons', description: 'Promotional Codes, Discounts & Loyalty Validation' },
    { name: 'Users', description: 'Customer Profiles, Favorites & Loyalty Balances' },
    { name: 'Riders', description: 'Rider Overview, Fleet Status & Cash Settlement' },
    { name: 'Analytics', description: 'Administrative Reports, Sales & Dashboard Analytics' },
    { name: 'System', description: 'Server Health & Diagnostics' },
  ],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate user / admin / rider',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  phone: { type: 'string', example: '01712345678' },
                  email: { type: 'string', example: 'admin@barcoderestaurantgroup.com' },
                  password: { type: 'string', example: 'Admin1234@' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authentication successful. Returns user and JWT access token.' },
          401: { description: 'Invalid mobile number/email or password.' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new customer account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'phone', 'password'],
                properties: {
                  name: { type: 'string', example: 'John Doe' },
                  phone: { type: 'string', example: '01712345678' },
                  email: { type: 'string', example: 'john@example.com' },
                  password: { type: 'string', example: 'Password123@' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Account registered successfully.' },
          409: { description: 'Phone number or email already exists.' },
        },
      },
    },
    '/foods': {
      get: {
        tags: ['Foods'],
        summary: 'Get all menu dishes (Cached via Redis)',
        responses: {
          200: { description: 'Returns catalogue of all dishes with categories and variations.' },
        },
      },
      post: {
        tags: ['Foods'],
        summary: 'Create new dish (Admin only)',
        security: [{ BearerAuth: [] }],
        responses: {
          201: { description: 'Food item created.' },
          403: { description: 'Forbidden. Admin role required.' },
        },
      },
    },
    '/foods/popular': {
      get: {
        tags: ['Foods'],
        summary: 'Get most popular & best-selling dishes',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 6 } },
        ],
        responses: {
          200: { description: 'Returns top ordered dishes.' },
        },
      },
    },
    '/foods/search': {
      get: {
        tags: ['Foods'],
        summary: 'Search dishes by name, category or keyword',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Returns matching dish list.' },
        },
      },
    },
    '/orders': {
      get: {
        tags: ['Orders'],
        summary: 'List user or admin orders (Lean projected)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Returns paginated orders.' },
        },
      },
      post: {
        tags: ['Orders'],
        summary: 'Create a new order (COD or Online Payment)',
        security: [{ BearerAuth: [] }],
        responses: {
          201: { description: 'Order created successfully and socket notifications dispatched.' },
        },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get order details by ID',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Returns full order document including chatHistory.' },
          404: { description: 'Order not found.' },
        },
      },
    },
    '/orders/{id}/status': {
      patch: {
        tags: ['Orders'],
        summary: 'Update order lifecycle status (Admin / Kitchen)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: [
                      'Placed',
                      'Accepted',
                      'Preparing',
                      'Ready to Pick',
                      'Out for Delivery',
                      'Delivered',
                      'Rejected',
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated and socket emitted to admin, rider and customer rooms.' },
        },
      },
    },
    '/orders/{id}/messages': {
      post: {
        tags: ['Orders'],
        summary: 'Send live chat message on order',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text'],
                properties: {
                  text: { type: 'string', example: 'Please include extra napkins.' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Message stored and socket emitted to order room.' },
        },
      },
    },
    '/payments/initiate-online-payment': {
      post: {
        tags: ['Payments'],
        summary: 'Initialize SSLCommerz payment gateway session',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderId'],
                properties: {
                  orderId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Returns SSLCommerz GatewayUrl redirect.' },
        },
      },
    },
    '/branches': {
      get: {
        tags: ['Branches'],
        summary: 'List all restaurant branches',
        responses: {
          200: { description: 'Returns branch list sorted by display order.' },
        },
      },
    },
    '/coupons/validate': {
      post: {
        tags: ['Coupons'],
        summary: 'Validate coupon code against order subtotal',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'subtotal'],
                properties: {
                  code: { type: 'string', example: 'BARCODE10' },
                  subtotal: { type: 'number', example: 800 },
                  phone: { type: 'string', example: '01712345678' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Returns coupon discount amount.' },
          400: { description: 'Coupon invalid, expired or minimum order requirement not met.' },
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get authenticated user profile and loyalty points',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Returns user profile document.' },
        },
      },
    },
    '/analytics/dashboard': {
      get: {
        tags: ['Analytics'],
        summary: 'Get high-level business analytics & revenue metrics',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Returns revenue, orders count, and popular items analytics.' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Server liveness probe & health status',
        responses: {
          200: { description: 'Server is healthy.' },
        },
      },
    },
  },
};
