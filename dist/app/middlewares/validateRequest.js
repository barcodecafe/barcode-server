"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse({
                body: req.body,
                params: req.params,
                query: req.query,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.errors.map((e) => ({
                    field: e.path.filter((p) => p !== 'body').join('.'),
                    message: e.message,
                }));
                return res.status(400).json({
                    success: false,
                    message: 'Validation error: ' + errors.map((e) => `${e.field}: ${e.message}`).join(', '),
                    errors,
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Something went wrong during validation',
            });
        }
    };
};
exports.default = validateRequest;
