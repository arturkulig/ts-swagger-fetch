import { SchemaDict } from './schema';
import { swaggerSchemaToTypeScript } from './swaggerSchemaToTypeScript';
import { InterfaceType } from './InterfaceType';

export function swaggerSchemaDictToTypeScript(dict: SchemaDict) {
  return Object.entries(dict).map(
    ([name, value]): InterfaceType => ({
      name,
      ...swaggerSchemaToTypeScript(value, name),
    }),
  );
}
