import { SchemaDict } from './schema';
import { swaggerSchemaToTypeScript } from './swaggerSchemaToTypeScript';
import { InterfaceType } from './InterfaceType';
import { SwaggerProcessingOptions } from './readConfig';

export function swaggerSchemaDictToTypeScript(
  dict: SchemaDict,
  processingOptions: SwaggerProcessingOptions,
) {
  return Object.entries(dict).map(
    ([name, value]): InterfaceType => ({
      name,
      ...swaggerSchemaToTypeScript(value, name, processingOptions),
    }),
  );
}
