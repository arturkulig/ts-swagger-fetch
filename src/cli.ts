#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as prettier from 'prettier';
import * as commander from 'commander';
import { Signale } from 'signale';
import { readConfig } from './readConfig';
import { getSwaggerFiles } from './getSwaggerFiles';
import { processSpec } from './processSpec';

const signale = new Signale({
  types: {
    correct: {
      badge: '✔️',
      color: 'green',
      label: 'correct',
    },
  },
});

commander
  .version(require('../package.json').version)
  .arguments('<file>')
  .action(async configFilename => {
    const configDirname: string = path.dirname(configFilename);
    const config = await readConfig(configFilename);

    try {
      process.umask(0);
      fs.mkdirSync(path.resolve(configDirname, config.output), 0o777);
    } catch (e) {
      null;
    }

    const swaggers = getSwaggerFiles(
      config.swaggers,
      configDirname,
      signale.scope('config'),
    );

    for await (const { config: swaggerConfig, spec } of swaggers) {
      const outputDir = path.resolve(
        configDirname,
        config.output ? config.output : '',
      );
      const { name } = swaggerConfig;
      const specSignale = signale.scope(name);

      const fileName = path.resolve(outputDir, `${name}.ts`);
      const output = new Array<string>();
      output.push('// tslint:disable');
      output.push(
        fs.readFileSync(path.resolve(__dirname, '../src/swagFetch.ts'), {
          encoding: 'utf-8',
        }),
      );
      const fileSignale = signale.scope(name, fileName);
      const prettierConfig = await prettier.resolveConfig(fileName);

      for (const contents of processSpec(swaggerConfig, spec, specSignale)) {
        output.push(contents);
      }

      let formattedOutput;
      try {
        formattedOutput = prettier.format(output.join('\r\n'), {
          parser: 'typescript',
          ...prettierConfig,
        });
      } catch (e) {
        fileSignale.error('Failed formatting');
        console.error(e.message);
        fs.writeFileSync(fileName, output.join('\r\n'), { encoding: 'utf-8' });
        process.exitCode = 1;
        return;
      }
      fs.writeFileSync(fileName, formattedOutput, { encoding: 'utf-8' });
    }
  });

commander.parse(process.argv);
