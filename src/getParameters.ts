import {
  Spec,
  Method,
  Parameter,
  ApiKeySecurity,
  BasicAuthenticationSecurity,
  Security,
} from './schema';
import { flatten } from './flatten';
import {
  isReferencedDefinition,
  getReferencedDefinition,
} from './gatherSchemas';
import { HeaderParameter, QueryParameter } from 'swagger-schema-official';

export function getParameters(swagger: Spec, dir: string, method: Method) {
  const path = swagger.paths[dir];
  const operation = swagger.paths[dir][method];
  if (!operation) {
    throw new Error('getParameters: operation is empty');
  }
  const { security: globalSecurity = [] } = swagger as {
    security?: Security[];
  };
  const { security = globalSecurity } = operation;
  const policies = flatten(
    security.map(subject => {
      const extPolicies = flatten(
        Object.keys(subject).map(requirement =>
          swagger.securityDefinitions &&
          swagger.securityDefinitions[requirement]
            ? [swagger.securityDefinitions[requirement]]
            : [],
        ),
      );
      return extPolicies.length ? extPolicies : [subject];
    }),
  );
  return new Array<Parameter>()
    .concat(
      (operation.parameters || []).map(p =>
        isReferencedDefinition(p)
          ? getReferencedDefinition<Parameter>(p.$ref, swagger).schema
          : p,
      ),
    )
    .concat(
      (path.parameters || []).map(p =>
        isReferencedDefinition(p)
          ? getReferencedDefinition<Parameter>(p.$ref, swagger).schema
          : p,
      ),
    )
    .concat(
      policies.filter(isApiKeySecurity).map(
        (security): Parameter =>
          ({
            header: {
              type: 'string',
              in: 'header',
              name: 'name' in security ? security.name : '',
            } as HeaderParameter,
            query: {
              type: 'string',
              in: 'query',
              name: 'name' in security ? security.name : '',
            } as QueryParameter,
          }['in' in security ? security.in : ('header' as 'header')]),
      ),
      policies.filter(isBasicAuth).map(param => ({
        type: 'string',
        in: 'header',
        name: 'Authorization',
      })),
    )
    .reduce(
      (r: Array<Parameter>, i: Parameter) =>
        r.find(p => p.name === i.name && p.in === i.in) ? r : r.concat(i),
      new Array<Parameter>(),
    );
}

function isBasicAuth(subject): subject is BasicAuthenticationSecurity {
  if (!subject || typeof subject !== 'object') {
    return false;
  }
  return subject.type === 'basic';
}

function isApiKeySecurity(subject): subject is ApiKeySecurity {
  if (!subject || typeof subject !== 'object') {
    return false;
  }
  return subject.type === 'apiKey';
}
