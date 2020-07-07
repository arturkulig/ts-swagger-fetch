import { Signale } from 'signale';
import { Spec, Path } from './schema';
import { getOperationName } from './getOperationName';
import { getOperationTypes } from './getOperationTypes';
import { capitalize } from './capitalize';
import { SwaggerFileDescriptor } from './readConfig';
import { InterfaceType } from './InterfaceType';
import { formatExportedInterface } from './formatExportedInterface';

export function* processSpec(
  swaggerConfig: SwaggerFileDescriptor,
  swagger: Spec,
  signale: Signale,
): Iterable<string> {
  const basePath = swagger.basePath || '';
  signale.scope(basePath).start();

  const supportTypeDefinitions: Record<string, InterfaceType> = {};
  const operationDefinitions = new Array<string>();

  for (const dir of Object.keys(swagger.paths)) {
    signale.scope(basePath, dir).start();
    for (const method of Object.keys(swagger.paths[dir]) as Array<keyof Path>) {
      try {
        if (
          method === 'get' ||
          method === 'put' ||
          method === 'post' ||
          method === 'delete' ||
          method === 'head' ||
          method === 'options' ||
          method === 'patch'
        ) {
          const operation = swagger.paths[dir][method];

          if (!operation) {
            signale.scope(basePath, dir, method).warn('is not an operation');
            return;
          }

          const opName = getOperationName(operation);
          const OpName = capitalize(opName);

          for (const supportType of getOperationTypes(swagger, dir, method)) {
            supportTypeDefinitions[supportType.name] = supportType;
          }

          operationDefinitions.push(
            `"${method} ${dir}": { req: ${OpName}Request, res: ${OpName}Responses },`,
          );

          signale.scope(basePath, dir, method).complete(opName);
        } else {
          signale
            .scope(basePath, dir, method)
            .warn(`Method ${method} of ${dir} is not supported`);
        }
      } catch (e) {
        signale.scope(basePath, dir, method).fatal(e);
        process.exitCode = 1;
      }
    }
  }

  for (const supportType of Object.values(supportTypeDefinitions)) {
    yield formatExportedInterface(supportType);
  }

  const { name, factory = false } = swaggerConfig;

  yield `
    export interface ${name}ReqResRepo {
      ${operationDefinitions.join('\r\n')}
    }`;

  const swaggerProtocol =
    !swagger.schemes || !swagger.schemes.length
      ? null
      : swagger.schemes.includes('https')
      ? 'https'
      : swagger.schemes[0];

  const swaggerHost =
    'host' in swagger ? swagger.host : new URL(swaggerConfig.remote.url).host;

  const protocolAndHost = [
    swaggerProtocol && swaggerHost ? `${swaggerProtocol}:` : '',
    swaggerHost ? `//${swaggerHost}` : '',
  ].join('');

  if (!factory) {
    yield `
      export function ${name}<T extends keyof ${name}ReqResRepo>
      (command: T, request: ${name}ReqResRepo[T]['req'], init?: RequestInit):
      Promise<${name}ReqResRepo[T]['res']>
      {
        return swagFetch(
          "${protocolAndHost}${basePath}",
          command,
          request,
          init
        ) as any;
      }
      `;
  }

  if (factory) {
    yield `
      export function ${name}Factory
      (fetch = window.fetch)
      {
        return  function ${name}<T extends keyof ${name}ReqResRepo>
                (command: T, request: ${name}ReqResRepo[T]['req'], init?: RequestInit):
                Promise<${name}ReqResRepo[T]['res']>
                {
                  return (swagFetch(
                    "${protocolAndHost}${basePath}",
                    command,
                    request,
                    init,
                    fetch
                  ) as any) as Promise<${name}ReqResRepo[T]['res']>;
                }
      }
  `;
  }

  signale.scope(basePath).complete(``);
}
