import {
  Parameter,
  Response,
  PathParameter,
  BodyParameter,
  QueryParameter,
  FormDataParameter,
} from 'swagger-schema-official';
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
import { InterfaceType } from './InterfaceType';
import { flatten } from './flatten';
import { getResponseMIMEType } from './getMIMEType';
import { SwaggerProcessingOptions } from './readConfig';

export function getOperationTypes(
  swagger: Spec,
  dir: string,
  method: Method,
  processingOptions: SwaggerProcessingOptions,
): InterfaceType[] {
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
      ...(pathParameters.length ? ['path'] : []),
      ...(bodyParameters.length ? ['body'] : []),
      ...(queryParameters.length ? ['query'] : []),
      ...(formDataParameters.length ? ['form'] : []),
    ],
    properties: {
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
        ? { form: parameters2ObjDef(formDataParameters) }
        : {}),
    },
  };

  const { responses = {} } = operation;
  const responseMimeType = getResponseMIMEType(operation);
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
    fetcherSchemas[capitalize(`${opName}${response.kind}ResponseContent`)] =
      response.schema && responseMimeType === 'application/json'
        ? response.schema
        : {};
  });

  const definitions = gatherSchemas(swagger, fetcherSchemas);

  return [
    ...swaggerSchemaDictToTypeScript(definitions, processingOptions),

    ...flatten(
      responsesList.map((response): InterfaceType[] => {
        return [
          {
            name: `${OpName}${response.kind}Response`,
            comment: response.description,
            content: `{
            status: ${response.codeType},
            text: string,
            arrayBuffer: ArrayBuffer,
            json: ${OpName}${response.kind}ResponseContent
          }`,
          },
        ];
      }),
    ),

    {
      name: `${OpName}Responses`,
      content: `${responsesList
        .map(({ kind }) => `${OpName}${kind}Response`)
        .join(' | ')}`,
    },
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
