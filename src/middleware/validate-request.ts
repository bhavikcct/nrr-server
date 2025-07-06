import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

/**
 * Validates the request body against a given schema.
 *
 * @param schema - The schema to validate against.
 *
 * @returns A middleware function that validates the request body.
 * If the body is invalid, it will send a 400 response with the
 * validation errors. If the body is valid, it will call next() and
 * set req.body to the parsed data.
 */
export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        issues: result.error.format(),
      });
      return; 
    }

    req.body = result.data; 
    next();
  };
};
