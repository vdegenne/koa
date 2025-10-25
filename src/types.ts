import type {Context, Middleware, Next} from 'koa';

export {Context, Next};

declare module 'koa' {
	interface Request {
		body?: any;
	}
}

// ---------------------- Basic Koa types ----------------------
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
export type RouteHandler = Middleware;

// Route definitions: object syntax only
export type RouteDefinitions = Record<string, RouteHandler | RouteHandler[]>;

// ---------------------- VKoa options ----------------------
export interface VKoaOptions {
	port: number;

	/** @default true */
	useBodyParser?: boolean;
	/** @default false */
	useCors?: boolean;
	/** Serve static folder path */
	staticDir?: string;

	get?: RouteDefinitions;
	post?: RouteDefinitions;
	put?: RouteDefinitions;
	patch?: RouteDefinitions;
	delete?: RouteDefinitions;

	middlewares?: Middleware[];

	/** Global error handler */
	onError?: (err: unknown, ctx: Context) => void;

	onStart?: () => void | Promise<void>;
}
