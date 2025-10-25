import type {Endpoint} from '@vdegenne/mini-rest';
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
// Generic version of RouteDefinitions
export type TypedRouteDefinitions<
	T extends Record<string, Endpoint<any, any>>,
> = {
	[K in keyof T]: (
		ctx: Context & {request: {body: T[K]['request']}},
		next: Next,
	) => T[K]['response'] | Promise<T[K]['response']>;
};

// Generic VKoa options
export interface VKoaOptions<ApiShape = any> {
	port: number;

	useBodyParser?: boolean;
	useCors?: boolean;
	staticDir?: string;

	// Constrain inferred type to Endpoint map
	get?: ApiShape extends {
		get: infer G extends Record<string, Endpoint<any, any>>;
	}
		? TypedRouteDefinitions<G>
		: undefined;
	post?: ApiShape extends {
		post: infer P extends Record<string, Endpoint<any, any>>;
	}
		? TypedRouteDefinitions<P>
		: undefined;
	put?: ApiShape extends {
		put: infer P extends Record<string, Endpoint<any, any>>;
	}
		? TypedRouteDefinitions<P>
		: undefined;
	patch?: ApiShape extends {
		patch: infer P extends Record<string, Endpoint<any, any>>;
	}
		? TypedRouteDefinitions<P>
		: undefined;
	delete?: ApiShape extends {
		delete: infer D extends Record<string, Endpoint<any, any>>;
	}
		? TypedRouteDefinitions<D>
		: undefined;

	middlewares?: Middleware[];
	onError?: (err: unknown, ctx: Context) => void;
	onStart?: () => void | Promise<void>;
}
