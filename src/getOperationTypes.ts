import { Spec, Schema, Method, SchemaDict } from './schema';
import { swaggerSchemaDictToTypeScript } from './swaggerSchemaDictToTypeScript';
import { capitalize } from './capitalize';
import { getOperationName } from './getOperationName';
import { getParameters } from './getParameters';
import {
  gatherSchemas,
  getReferencedDefinition,
  isReferencedDefinition,
} from './gatherSchemas';
import {
  Parameter,
  Response,
  PathParameter,
  BodyParameter,
  QueryParameter,
  FormDataParameter,
} from 'swagger-schema-official';

export function getOperationTypes(
  swagger: Spec,
  dir: string,
  method: Method,
): string[] {
  const operation = swagger.paths[dir][method];
  if (!operation) {
    throw new Error('createTypes: operation is empty');
  }

  const parameters = getParameters(swagger, dir, method);
  const opName = getOperationName(operation);
  const OpName = capitalize(opName);

  const pathParameters = parameters.filter(
    (p): p is PathParameter => p.in === 'path',
  );
  const bodyParameters = parameters.filter(
    (p): p is BodyParameter => p.in === 'body',
  );
  const queryParameters = parameters.filter(
    (p): p is QueryParameter => p.in === 'query',
  );
  const formDataParameters = parameters.filter(
    (p): p is FormDataParameter => p.in === 'formData',
  );

  const fetcherSchemas: SchemaDict = {};
  fetcherSchemas[`${OpName}Request`] = {
    type: 'object',
    required: [
      // 'command',
      ...(pathParameters.length ? ['path'] : []),
      ...(bodyParameters.length ? ['body'] : []),
      ...(queryParameters.length ? ['query'] : []),
      ...(formDataParameters.length ? ['formData'] : []),
    ],
    properties: {
      // command: { type: 'string', enum: [`${method} ${dir}`] },
      ...(pathParameters.length
        ? { path: parameters2ObjDef(pathParameters) }
        : {}),
      ...(bodyParameters.length && bodyParameters[0].schema
        ? { body: bodyParameters[0].schema }
        : {}),
      ...(queryParameters.length
        ? { query: parameters2ObjDef(queryParameters) }
        : {}),
      ...(formDataParameters.length
        ? { formData: parameters2ObjDef(formDataParameters) }
        : {}),
    },
  };

  const { responses = {} } = operation;
  const responsesList = responses
    ? Object.keys(responses).map(kind => {
        const responseCode = parseInt(kind, 10);
        const codeType = isNaN(responseCode) ? 'any' : responseCode.toString();
        const operationDesc = responses[kind];
        const operationSchema = isReferencedDefinition(operationDesc)
          ? getReferencedDefinition<Response>(operationDesc.$ref, swagger)
              .schema
          : operationDesc;
        const defaultObjectSchema: Schema = { type: 'object' };
        const { schema = defaultObjectSchema, description } = operationSchema;
        return {
          kind,
          codeType,
          schema,
          description,
        };
      })
    : [];

  responsesList.forEach(response => {
    if (!response.schema) {
      return;
    }
    fetcherSchemas[capitalize(`${opName}${response.kind}ResponseContent`)] =
      response.schema;
  });

  const definitions = gatherSchemas(swagger, fetcherSchemas);

  return [
    ...swaggerSchemaDictToTypeScript(definitions),

    ...responsesList.map(response => {
      return `${
        response.description
          ? `// ${response.description}
`
          : ''
      }export interface ${OpName}${response.kind}Response {
        status: ${response.codeType},
        text: string,
        json?: ${OpName}${response.kind}ResponseContent
      }`;
    }),

    `export type ${OpName}Responses = ${responsesList
      .map(({ kind }) => `${OpName}${kind}Response`)
      .join(' | ')}`,
  ];
}

function parameters2ObjDef(parameters: Parameter[]): Schema {
  return {
    type: 'object',
    required: parameters.filter(p => p.required).map(p => p.name),
    properties: Object.fromEntries(
      parameters.map(p => [p.name, `schema` in p ? p.schema : p]),
    ) as Schema['properties'],
  };
}
