import { Signale } from 'signale';
import { Spec, Path } from './schema';
import { getOperationName } from './getOperationName';
import { getOperationTypes } from './getOperationTypes';
import { capitalize } from './capitalize';
import { SwaggerFileDescriptor } from './readConfig';

export function* processSpec(
  swaggerConfig: SwaggerFileDescriptor,
  swagger: Spec,
  signale: Signale,
) {
  signale.scope(swagger.basePath).start();

  const operationNames = new Array<string>();

  for (const dir of Object.keys(swagger.paths)) {
    signale.scope(swagger.basePath, dir).start();
    for (const method of Object.keys(swagger.paths[dir]) as Array<keyof Path>) {
      try {
        if (
          method === 'get' ||
          method === 'put' ||
          method === 'post' ||
          method === 'delete' ||
          method === 'head' ||
          method === 'options'
        ) {
          const operation = swagger.paths[dir][method];

          if (!operation) {
            signale
              .scope(swagger.basePath, dir, method)
              .warn('is not an operation');
            return;
          }

          const opName = getOperationName(operation);
          const OpName = capitalize(opName);

          yield getOperationTypes(swagger, dir, method).join('\r\n');

          operationNames.push(
            `"${method} ${dir}": { req: ${OpName}Request, res: ${OpName}Responses },`,
          );

          signale.scope(swagger.basePath, dir, method).complete(opName);
        } else {
          signale
            .scope(swagger.basePath, dir, method)
            .warn(`Method ${method} of ${dir} is not supported`);
        }
      } catch (e) {
        signale.scope(swagger.basePath, dir, method).fatal(e);
        process.exitCode = 1;
      }
    }
  }

  const { name, factory = false } = swaggerConfig;

  yield `
    export interface ${name}ReqResRepo {
      ${operationNames.join('\r\n')}
    }`;

  if (!factory) {
    yield `
      export function ${name}<T extends keyof ${name}ReqResRepo>
      (command: T, request: ${name}ReqResRepo[T]['req'], init?: RequestInit):
      Promise<${name}ReqResRepo[T]['res']>
      {
        return swagFetch(
          "${swagger.host}${swagger.basePath}",
          command,
          request,
          init
        );
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
                    return swagFetch(
                      "${swagger.host}${swagger.basePath}",
                      command,
                      request,
                      init,
                      fetch
                    );
                  }
      }
  `;
  }

  signale.scope(swagger.basePath).complete(``);
}
