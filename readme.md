# TS Swagger 2 Fetch generator

CLI tool powered by node.js that (fetches and/or) transforms swagger definition files that you can easily incorporate into your TypeScript+React application.

## install

```bash
npm i -D ts-swagger-fetch
```

## configure

Config file is a json file that is expressed with this interface - `ConfigFile`.

```typescript
interface ConfigFile {
  swaggers: SwaggerFileDescriptor[];
}

interface SwaggerFileDescriptor {

  // your custom name (will be visible in logs)
  name: string;

  // swagger definition file path relative to config file
  file: string;

  // swagger definition remote location information
  remote: SwaggerRemoteFileDescriptor;

  // path relative to the config file
  output: string;

  // Object here will override (overshadow)
  // contents of the swagger definition file
  overrides?: Partial<Spec>;

  options?: {
    // should a factory function
    // allowing replacing window.fetch
    // be generated
    outputsFactory?: boolean;

    // Object properties
    // can specify (but may not to)
    // whether it will definitely be present
    // through a 'required' flag.
    // Some integrations do not output them.
    // This option doesn't check for the flag
    // to determine whether a field should be marked
    // as optional in the typescript output.
    propertiesAlwaysRequired?: boolean;
  }
}

interface SwaggerRemoteFileDescriptor {
  url: string;
  username?: string;
  password?: string;
}
```

## transform

```bash
  npx msf ./msfconfig.json
# ^ this will run it including node_modules in PATH
#      ^ this is a name of the CLI tool
#           ^ this is the path to your config file
```

## incorporate

### A) A fetch method

```typescript
import { pet } from './test/output/pet';

async function shoutOutPet(id: number) {
  const response = await pet('get /pet/{petId}', {
    path: {
      petId: 0,
    },
  });

  switch (response.status) {
    case 200: return alert(
      `Dog's name ${response.json?.name ?? ''}`
    );
    case 400: return alert('Fatal error!');
    case 404: return alert('Not found');
    default: return;
  }
}
```

### B) A factory function returning fetch method

```typescript
import { petFactory } from './test/output/pet';

const pet = petFactory(
  window.fetch
  /* ...but can be a custom function
  of the same interface */
);

async function shoutOutPet(id: number) {
  const response = await pet('get /pet/{petId}', {
    path: {
      petId: 0,
    },
  });

  switch (response.status) {
    case 200: return alert(
      `Dog's name ${response.json?.name ?? ''}`
    );
    case 400: return alert('Fatal error!');
    case 404: return alert('Not found');
    default: return;
  }
}
```
