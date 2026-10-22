import { PipeTransform, Injectable } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/app-error.js';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value ?? {});
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation failed', error.format());
      }
      throw new ValidationError('Validation failed');
    }
  }
}
