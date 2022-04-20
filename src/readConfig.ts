import * as fs from 'fs';
import { Spec } from './schema';

export interface ConfigFile {
  swaggers: SwaggerFileDescriptor[];
}

export interface SwaggerFileDescriptor {
  name: string;
  file: string;
  remote: SwaggerRemoteFileDescriptor;
  output: string;
  overrides: Partial<Spec>;
  options: SwaggerProcessingOptions;
}

export interface SwaggerProcessingOptions {
  outputsFactory: boolean;
  propertiesAlwaysRequired: boolean;
}

export interface SwaggerRemoteFileDescriptor {
  url: string;
  username?: string;
  password?: string;
}

export async function readConfig(
  configFilename: string,
): Promise<SwaggerFileDescriptor[]> {
  const content = await new Promise<string | Buffer>((resolve, reject) =>
    fs.readFile(configFilename, { encoding: 'utf-8' }, (err, data) => {
      if (!err) {
        resolve(data);
      } else {
        reject(err);
      }
    }),
  );
  const { swaggers } = JSON.parse(typeof content === 'string' ? content : '');
  return swaggers.map((swaggerConfig: SwaggerFileDescriptor) => ({
    name: String(swaggerConfig.name),
    file: String(swaggerConfig.file),
    remote: {
      url: String(swaggerConfig.remote.url),
      ...(swaggerConfig.remote.username
        ? { username: String(swaggerConfig.remote.username) }
        : undefined),
      ...(swaggerConfig.remote.password
        ? { password: String(swaggerConfig.remote.password) }
        : undefined),
    },
    overrides: swaggerConfig.overrides ?? {},
    options: {
      propertiesAlwaysRequired: Boolean(
        swaggerConfig.options?.propertiesAlwaysRequired ?? false,
      ),
      outputsFactory: Boolean(swaggerConfig.options?.outputsFactory ?? false),
    },
    output: String(swaggerConfig.output ?? './'),
  }));
}
