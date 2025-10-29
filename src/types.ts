import type {Logger} from '@vdegenne/debug';
import type {Endpoint} from '@vdegenne/mini-rest';
import type {Context, Middleware as KoaMiddleware, Next} from 'koa';
import type {FieldsGuard} from './FieldsGuard.js';

// declare module 'koa' {
// 	interface Request<T = any> {
// 		body?: T;
// 	}
// }

export {Context, Next};

export type RequestContext<Req = any> = Context & {request: {body: Req}};

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

// Route definitions: object syntax only
export type RouteDefinitions = Record<string, Middleware | Middleware[]>;

export type Middleware<Req = any, Res = any> = (opts: {
	ctx: RequestContext<Req>;
	next: Next;
	guard: FieldsGuard<Req>['check'];
	params: Record<string, string>;
}) => Res | undefined | Promise<Res | undefined>;

export type TypedRouteDefinitions<
	T extends Record<string, Endpoint<any, any>>,
> = {
	[K in keyof T]: Middleware<T[K]['request'], T[K]['response']>;
};

interface StaticMount {
	prefix: string;
	location: string;
}

// Generic VKoa options
export interface VKoaOptions<ApiShape = any> {
	/**
	 * Api version, will get prepended to all routes defined
	 */
	apiVersion?: string;

	port: number;

	/** @default true */
	useBodyParser?: boolean;
	useCors?: boolean;
	statics?: (string | StaticMount)[];

	debug?: boolean;
	logger?: Logger;

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

	middlewares?: KoaMiddleware[];
	onError?: (err: unknown, ctx: Context) => void;
	onStart?: () => void | Promise<void>;
}
