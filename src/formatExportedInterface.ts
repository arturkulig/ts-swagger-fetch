import { InterfaceType } from './InterfaceType';

export function formatExportedInterface(interfaceType: InterfaceType): string {
  return `
      export ${
        interfaceType.content[0] === '{'
          ? `interface ${interfaceType.name} `
          : `type ${interfaceType.name} = `
      } ${interfaceType.content}
    `;
}
