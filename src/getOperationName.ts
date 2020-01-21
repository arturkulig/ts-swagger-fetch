import { Operation } from './schema';
import { decapitalize } from './decapitalize';

export function getOperationName(operation: Operation) {
  if (typeof operation.operationId !== 'string') {
    throw new Error(`Operation without an operationId occurred`);
  }
  return decapitalize(operation.operationId);
}
