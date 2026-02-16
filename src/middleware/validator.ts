import { Request, Response, NextFunction } from 'express';

/**
 * Validation rule definition
 */
interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

/**
 * Validation error detail
 */
interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate request body against rules
 * @param rules - Array of validation rules
 */
export const validate = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = [];
    const body = req.body;

    for (const rule of rules) {
      const value = body[rule.field];

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: rule.field,
          message: `${rule.field} is required`,
        });
        continue;
      }

      // Skip further validation if field is not required and not provided
      if (!rule.required && (value === undefined || value === null)) {
        continue;
      }

      // Check data type
      if (rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be of type ${rule.type}, got ${actualType}`,
          });
          continue;
        }
      }

      // Check minimum value/length
      if (rule.min !== undefined) {
        if (typeof value === 'number' && value < rule.min) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be at least ${rule.min}`,
          });
        } else if (typeof value === 'string' && value.length < rule.min) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be at least ${rule.min} characters`,
          });
        }
      }

      // Check maximum value/length
      if (rule.max !== undefined) {
        if (typeof value === 'number' && value > rule.max) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be at most ${rule.max}`,
          });
        } else if (typeof value === 'string' && value.length > rule.max) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be at most ${rule.max} characters`,
          });
        }
      }

      // Check pattern
      if (rule.pattern && typeof value === 'string') {
        if (!rule.pattern.test(value)) {
          errors.push({
            field: rule.field,
            message: `${rule.field} format is invalid`,
          });
        }
      }

      // Custom validation
      if (rule.custom) {
        const result = rule.custom(value);
        if (result !== true) {
          errors.push({
            field: rule.field,
            message: typeof result === 'string' ? result : `${rule.field} is invalid`,
          });
        }
      }
    }

    // Return errors if any
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
      return;
    }

    next();
  };
};

/**
 * Common validation rules
 */
export const commonRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email format',
  },
  uuid: {
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    message: 'Invalid UUID format',
  },
  positiveNumber: (value: any) => {
    return typeof value === 'number' && value >= 0 ? true : 'Must be a positive number';
  },
  nonEmptyString: (value: any) => {
    return typeof value === 'string' && value.trim().length > 0 ? true : 'Must be a non-empty string';
  },
};
