import { SecureContext } from 'tls';
import { IncomingMessage } from 'http';

type BodyMethods = {
  json(): Promise<any>;
  text(): Promise<string>;
  rawBody(): Promise<Buffer>;
  stream(): ReadableStream;
};

type FetchResponse = Promise<IncomingMessage & BodyMethods> & BodyMethods;

type Fetch = (path: string, opts?: Gofer.FetchOpts, cb?: any) => FetchResponse;

type EndpointFnReturn =
  | ((...args: any[]) => FetchResponse)
  | {
    [key: string]: (...args: any[]) => FetchResponse;
  };

export type EndpointFn = (fetch: Fetch) => EndpointFnReturn;

declare class Gofer {
  constructor(
    config: { [name: string]: Gofer.Opts },
    serviceName: string,
    clientVersion?: string,
    clientName?: string
  );

  addOptionMapper(mapper: (opts: Gofer.Opts) => Gofer.Opts): void;
  getMergedOptions(
    defaults?: Gofer.FetchOpts,
    options?: Gofer.FetchOpts
  ): Gofer.FetchOpts;
  registerEndpoint(name: string, endpointFn: EndpointFn): this;
  registerEndpoints(endpoints: { [name: string]: EndpointFn }): this;

  clone(): this;

  with(opts: Gofer.Opts): this;

  fetch: Fetch;
  get(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  post(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  put(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  del(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  head(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  delete(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  patch(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  options(path: string, opts?: Gofer.FetchOpts): FetchResponse;

  defaults: Gofer.Opts;
}

declare namespace Gofer {
  export function fetch(
    path: string,
    opts?: Gofer.FetchOpts & { pathParams?: { [param: string]: string } }
  ): FetchResponse;

  export type Opts = {
    pathParams?: { [param: string]: string | undefined };
    timeout?: number;
    connectTimeout?: number;
    searchDomain?: string;
    keepAlive?: boolean;
    baseUrl?: string;
    headers?: { [name: string]: string };
    auth?: string | { username: string; password: string };
    qs?: { [name: string]: any } | URLSearchParams;
    maxSockets?: number;
    minStatusCode?: number;
    maxStatusCode?: number;
    rejectUnauthorized?: boolean;
    secureContext?: SecureContext;
    captureAsyncStack?: boolean;
    userAgent?: string;
    [opt: string]: any;
  };

  export type FetchOpts = Opts & {
    endpointName?: string;
    json?: any;
    method?: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
    body?: string | Buffer | ReadableStream;
    form?: { [name: string]: any };
  };
}

export = Gofer;
