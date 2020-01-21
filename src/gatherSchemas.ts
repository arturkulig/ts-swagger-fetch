import { Spec, SchemaDict, Schema } from './schema';
import { findSchemaReferences } from './findSchemaReferences';
import { flatten } from './flatten';
import { Reference } from 'swagger-schema-official';
import { getInterfaceName } from './getInterfaceName';

export function gatherSchemas(
  spec: Spec,
  startingDefinitions: SchemaDict = {},
) {
  if (!spec.definitions) {
    return {} as SchemaDict;
  }

  let result: SchemaDict = startingDefinitions;
  while (true) {
    const refs = getRefs(result);
    const defs = getReferencedDefinitions(refs, spec);
    const candidate = { ...result, ...defs };

    if (Object.keys(candidate).length === Object.keys(result).length) {
      return candidate;
    }
    result = candidate;
  }
}

function getRefs(defs: SchemaDict) {
  return flatten(
    Object.keys(defs).map(key => {
      try {
        return findSchemaReferences(defs[key], []);
      } catch (e) {
        throw {
          message: `Error while getting refs for ${key}:\r\n${e.message}`,
        };
      }
    }),
  );
}

export function getReferencedDefinitions(names: string[], root: Spec) {
  if (names.length === 0) {
    return {} as SchemaDict;
  }
  return names.reduce((result, ref) => {
    const { name, schema } = getReferencedDefinition(ref, root);
    return { ...result, [getInterfaceName(name)]: schema };
  }, {} as SchemaDict);
}

export function isReferencedDefinition<T>(
  subject: T | Reference,
): subject is Reference {
  return '$ref' in subject;
}

export function getReferencedDefinition<T = Schema>(
  path: string,
  root: Spec,
): { name: string; schema: T } {
  let remainingPath = path.split('/').filter(chunk => chunk !== '#');
  const name = remainingPath.slice(-1)[0];
  let result: any = root;
  while (remainingPath.length) {
    if (result == null) {
      throw new Error(`Swagger file has no definition for ${path}`);
    }
    result = result[remainingPath.splice(0, 1)[0]];
  }
  return { name, schema: result };
}
