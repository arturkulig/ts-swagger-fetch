import { Schema } from './schema';
import { getInterfaceName } from './getInterfaceName';

export function swaggerSchemaToTypeScript(
  def: Schema,
  dir: string,
): { content: string; comment: string | undefined } {
  if ('$ref' in def && typeof def.$ref === 'string') {
    const [, name = null] = /#\/definitions\/([^/]+)/.exec(def.$ref) || [];
    if (name) {
      return {
        content: getInterfaceName(name),
        comment: def.description,
      };
    }
    throw new Error(`${def.$ref} is unrecognized reference`);
  }
  if ('type' in def) {
    if (def.enum instanceof Array) {
      return {
        content: def.enum
          .map(v => {
            if (typeof v === 'string') {
              return JSON.stringify(v);
            }
            if (typeof v === 'number') {
              return JSON.stringify(v);
            }
            return null;
          })
          .filter(<T>(item: T | null | undefined): item is T => item != null)
          .join(' | '),
        comment: def.description,
      };
    }
    if (def.type === 'boolean') {
      return { content: 'boolean', comment: def.description };
    }
    if (def.type === 'number' || def.type === 'integer') {
      return { content: 'number', comment: def.description };
    }
    if (def.type === 'string') {
      return { content: 'string', comment: def.description };
    }
    if (def.type === 'array') {
      const { items } = def;
      if (!items) {
        return {
          content: 'any[]',
          comment: def.description,
        };
      }
      if (items instanceof Array) {
        return {
          content: `Array<
          ${items
            .map((item, i) => swaggerSchemaToTypeScript(item, `${dir}[${i}]`))
            .map(
              type =>
                `${type.content} ${
                  type.comment ? ` /* ${type.comment} */` : ''
                }`,
            )
            .join(' | ')}
          >`,
          comment: def.description,
        };
      }
      const itemsDefinition = swaggerSchemaToTypeScript(items, `${dir}[]`);
      return {
        content: `Array<${itemsDefinition.content}${
          itemsDefinition.comment ? ` /* ${itemsDefinition.comment} */` : ''
        }>`,
        comment: def.description,
      };
    }
    if (def.type === 'object') {
      const { properties, required, additionalProperties } = def;
      if (!properties && !additionalProperties) {
        return { content: 'Record<string, any>', comment: def.description };
      }
      const definitions = [
        ...(properties
          ? [
              `{
          ${Object.keys(properties)
            .map(p => {
              const isRequired = required && required.indexOf(p) >= 0;
              const propDefinition = swaggerSchemaToTypeScript(
                properties[p],
                `${dir}.${p}`,
              );
              return `${
                propDefinition.comment
                  ? `/** ${propDefinition.comment} */\n`
                  : ''
              }'${p}'${isRequired ? '' : '?'}: ${propDefinition.content},`;
            })
            .join('\n')}
        }`,
            ]
          : []),
        ...(typeof additionalProperties === 'object' &&
        typeof additionalProperties.$ref === 'string'
          ? [additionalProperties.$ref.split('/').slice(-1)[0]]
          : []),
      ];

      return {
        content: definitions.length
          ? definitions.join(' & ')
          : 'Record<string, any>',
        comment: def.description,
      };
    }
    if (def.type === 'file') {
      return { content: 'Blob', comment: def.description };
    }
  }
  return { content: 'void', comment: def.description };
}
