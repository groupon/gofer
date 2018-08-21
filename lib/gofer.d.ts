import { IncomingMessage } from 'http';
import { Readable } from 'stream';

export type HTTPMethod = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';

export interface GoferOptions {
  // Uppercase HTTP method, defaults to `GET`.
  method?: HTTPMethod;
  // URL defaults for protocol, host, port, and pathname.
  baseUrl?: string;
  // Additional query string parameters to be added to the url.
  qs?: { [key: string]: any };
  // A string, buffer, or stream to be used as the request body.
  body?: string | Buffer | ReadableStream;
  // A value to be sent as a urlencoded request body.
  form?: any;
  // A value to be sent as a JSON-encoded request body.
  json?: any;
  // An object with `user`/`password` properties to be used as Basic auth header
  // or a string of the format `user:password`.
  auth?: string | { user: string, password: string };
  // How long to wait for a successful TCP connection after acquiring a socket.
  connectTimeout?: number;
  // How long to wait for response headers. Also controls the socket read timeout.
  timeout?: number;
  // How long to wait in total for the response to arrive completely.
  completionTimeout?: number;
  // Object with params that will be inserted into `{placeholder}`s in the URL.
  pathParams?: { [key: string]: any };
  // How many connections/sockets in parallel are allowed.
  maxSockets?: number;
  // Same as [node's own `rejectUnauthorized`](https://nodejs.org/api/tls.html#tls_new_tls_tlssocket_socket_options).
  rejectUnauthorized?: boolean;
  // Works just like node's own `headers` option.
  headers?: { [key: string]: string | string[] };

  serviceName?: string;
  endpointName?: string;
  methodName?: string;
}

export interface GoferConfig<OptionsType> {
  globalDefaults?: OptionsType;
}

export interface Response<T> extends IncomingMessage {
  json(): Promise<T>;
  text(): Promise<string>,
  rawBody(): Promise<Buffer>,
  stream(): Readable;
}

export interface FetchResult<T> extends Promise<Response<T>> {
  json(): Promise<T>;
  text(): Promise<string>,
  rawBody(): Promise<Buffer>,
}

declare class Gofer<ClientType extends Gofer<ClientType>, OptionsType extends GoferOptions = GoferOptions> {
  constructor(config?: GoferConfig<OptionsType>, serviceName?: string, clientVersion?: string, clientName?: string);

  fetch<T>(uri: string, options?: OptionsType): FetchResult<T>;

  clone(): ClientType;

  with(options: OptionsType): ClientType;
}

declare function fetch<T>(uri: string, options?: GoferOptions): FetchResult<T>;

export { Gofer, fetch };
