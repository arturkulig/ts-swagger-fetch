import { SchemaDict } from './schema';
import { swaggerSchemaToTypeScript } from './swaggerSchemaToTypeScript';

export function swaggerSchemaDictToTypeScript(dict: SchemaDict): string[] {
  const tsDefs = [] as string[];

  for (const typeName of Object.keys(dict)) {
    tsDefs.push(
      exportInNamespace(
        typeName,
        swaggerSchemaToTypeScript(dict[typeName], typeName),
      ),
    );
  }

  return tsDefs;
}

function exportInNamespace(name: string, def: string): string {
  return `
    export ${def[0] === '{' ? `interface ${name} ` : `type ${name} = `} ${def}
  `;
}
