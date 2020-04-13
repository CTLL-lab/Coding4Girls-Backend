import { validationResult } from 'express-validator/check';
import { ErrorResponse } from '../models/response';

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = new ErrorResponse('VALUE_MISSING');
    result.data = errors.array();
    return res.status(422).json(result);
  }
  next();
}
