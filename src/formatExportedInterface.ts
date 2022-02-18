import { InterfaceType } from './InterfaceType';

export function formatExportedInterface(interfaceType: InterfaceType): string {
  return [
    ...(interfaceType.comment ? [`/** ${interfaceType.comment} */`] : []),
    `export ${
      interfaceType.content.match(/^\{[^}]*\}$/)
        ? `interface ${interfaceType.name} `
        : `type ${interfaceType.name} = `
    } ${interfaceType.content}`,
    '',
  ].join('\n');
}
