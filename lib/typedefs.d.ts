import { SecureContext } from "tls";
import { ServerResponse } from "http";

type BodyMethods = {
  json(): Promise<any>;
  text(): Promise<string>;
  rawBody(): Promise<Buffer>;
  stream(): ReadableStream;
};

type FetchResponse = Promise<ServerResponse & BodyMethods> & BodyMethods;

declare class Gofer {
  constructor(
    config: { [name: string]: Gofer.Opts },
    serviceName: string,
    clientVersion?: string,
    clientName?: string
  );

  addOptionMapper(mapper: (opts: Gofer.Opts) => Gofer.Opts): void;

  clone(): Gofer;

  with(opts: Gofer.Opts): Gofer;

  fetch(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  get(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  post(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  put(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  del(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  head(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  delete(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  patch(path: string, opts?: Gofer.FetchOpts): FetchResponse;
  options(path: string, opts?: Gofer.FetchOpts): FetchResponse;
}

declare namespace Gofer {
  export function fetch(path: string, opts?: Gofer.FetchOpts): FetchResponse;

  export type Opts = {
    pathParams?: { [param: string]: string };
    timeout?: number;
    connectTimeout?: number;
    searchDomain?: string;
    keepAlive?: boolean;
    baseUrl?: string;
    headers?: { [name: string]: string };
    auth?: string | { username: string; password: string };
    qs?: { [name: string]: any };
    maxSockets?: number;
    minStatusCode?: number;
    maxStatusCode?: number;
    rejectUnauthorized?: boolean;
    secureContext?: SecureContext;
  };

  export type FetchOpts = Opts & {
    endpointName: string;
    json?: object;
    method?: "GET" | "PUT" | "POST" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
    body?: string | Buffer | ReadableStream;
    form?: { [name: string]: any };
  };
}

export = Gofer;
