import { Schema } from './schema';
import { getInterfaceName } from './getInterfaceName';
import { SwaggerProcessingOptions } from './readConfig';

export function swaggerSchemaToTypeScript(
  definition: Schema,
  dir: string,
  processingOptions: SwaggerProcessingOptions,
): { content: string; comment: string | undefined } {
  if ('$ref' in definition && typeof definition.$ref === 'string') {
    const [, name = null] =
      /#\/definitions\/([^/]+)/.exec(definition.$ref) || [];
    if (name) {
      return {
        content: getInterfaceName(name),
        comment: definition.description,
      };
    }
    throw new Error(`${definition.$ref} is unrecognized reference`);
  }
  if ('type' in definition) {
    if (definition.enum instanceof Array) {
      return {
        content: definition.enum
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
        comment: definition.description,
      };
    }
    if (definition.type === 'boolean') {
      return { content: 'boolean', comment: definition.description };
    }
    if (definition.type === 'number' || definition.type === 'integer') {
      return { content: 'number', comment: definition.description };
    }
    if (definition.type === 'string') {
      return { content: 'string', comment: definition.description };
    }
    if (definition.type === 'array') {
      const { items } = definition;
      if (!items) {
        return {
          content: 'any[]',
          comment: definition.description,
        };
      }
      if (items instanceof Array) {
        return {
          content: `Array<
          ${items
            .map((item, i) =>
              swaggerSchemaToTypeScript(
                item,
                `${dir}[${i}]`,
                processingOptions,
              ),
            )
            .map(
              type =>
                `${type.content} ${
                  type.comment ? ` /* ${type.comment} */` : ''
                }`,
            )
            .join(' | ')}
          >`,
          comment: definition.description,
        };
      }
      const itemsDefinition = swaggerSchemaToTypeScript(
        items,
        `${dir}[]`,
        processingOptions,
      );
      return {
        content: `Array<${itemsDefinition.content}${
          itemsDefinition.comment ? ` /* ${itemsDefinition.comment} */` : ''
        }>`,
        comment: definition.description,
      };
    }
    if (definition.type === 'object') {
      const { properties, required, additionalProperties } = definition;
      if (!properties && !additionalProperties) {
        return {
          content: 'Record<string, any>',
          comment: definition.description,
        };
      }
      const definitions = [
        ...(properties
          ? [
              `{
          ${Object.keys(properties)
            .map(p => {
              const isRequired =
                processingOptions.propertiesAlwaysRequired ||
                (required && required.indexOf(p) >= 0);
              const propDefinition = swaggerSchemaToTypeScript(
                properties[p],
                `${dir}.${p}`,
                processingOptions,
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
        comment: definition.description,
      };
    }
    if (definition.type === 'file') {
      return { content: 'Blob', comment: definition.description };
    }
  }
  return { content: 'void', comment: definition.description };
}
