interface SwagRequest {
  path?: any;
  query?: any;
  body?: any;
  form?: any;
  headers?: Record<string, string>;
}

async function swagFetch(
  host: string,
  command: string,
  request: SwagRequest,
  init: RequestInit = {},
  fetch = window.fetch,
): Promise<{
  readonly status: number;
  readonly json: unknown;
  readonly text: string;
  readonly arrayBuffer: ArrayBuffer;
}> {
  const headers = { ...(request.headers || {}) };
  const [method, ...pathNameParts] = command.split(' ');
  let pathname = pathNameParts.join(' ');
  for (const paramK of Object.keys(request.path || {})) {
    pathname = pathname.replace(`{${paramK}}`, request.path[paramK]);
  }
  const url = new URL(`${host}${pathname}`, window.location.toString());
  for (const queryK of Object.keys(request.query || {})) {
    url.searchParams.append(queryK, request.query[queryK]);
  }

  let body: BodyInit | null = null;
  if (request.body) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(request.body);
  } else if (request.form) {
    body = new FormData();
    for (const formK of Object.keys(request.form)) {
      body.append(formK, request.form[formK]);
    }
  }

  const response = await fetch(url.href, {
    method,
    body,
    headers,
    ...init,
  });

  if (response.headers.get('content-type')?.startsWith('application/json')) {
    const json = await response.json();
    return {
      status: response.status,
      json,
      get text() {
        return JSON.stringify(json);
      },
      get arrayBuffer() {
        return new TextEncoder().encode(JSON.stringify(json));
      },
    };
  }

  const arrayBuffer = await response.arrayBuffer();

  return {
    status: response.status,
    get json() {
      return JSON.parse(new TextDecoder().decode(arrayBuffer));
    },
    get text() {
      return new TextDecoder().decode(arrayBuffer);
    },
    arrayBuffer,
  };
}
