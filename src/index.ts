import cors from '@koa/cors';
import Router from '@koa/router';
import type {Context, Middleware, Next} from 'koa';
import Koa from 'koa';
import serve from 'koa-static';

// Extend the Koa Request interface to include a 'body' property
declare module 'koa' {
	interface Request {
		body?: any;
	}
}
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
type RouteHandler = Router.Middleware;
type RouteDefinitions =
	| Array<[string, ...RouteHandler[]]> // array-of-arrays syntax
	| Record<string, RouteHandler | RouteHandler[]>; // object syntax

/**
 * Data will be available at `ctx.request.body`
 */
function bodyParser() {
	return async function (ctx: Context, next: Next): Promise<void> {
		if (
			['POST', 'PUT', 'PATCH', 'DELETE'].includes(ctx.method) &&
			ctx.is('application/json')
		) {
			const data = await new Promise<string>((resolve, reject) => {
				let raw = '';
				ctx.req.on('data', (chunk) => (raw += chunk));
				ctx.req.on('end', () => resolve(raw));
				ctx.req.on('error', (err) => reject(err));
			});

			try {
				ctx.request.body = JSON.parse(data);
			} catch {
				ctx.throw(400, 'Invalid JSON');
			}
		}

		await next();
	};
}

export {bodyParser, cors, Koa, Router, serve};

interface VKoaOptions {
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

export function config(options: VKoaOptions) {
	const app = new Koa();
	const router = new Router();

	// Default error handler
	app.use(async (ctx, next) => {
		try {
			await next();
		} catch (err) {
			if (options.onError) {
				options.onError(err, ctx);
			} else {
				ctx.status = ctx.status || 500;
				ctx.body = {error: (err as Error).message};
				console.error(err);
			}
		}
	});

	if (options.useBodyParser ?? true) {
		app.use(bodyParser());
	}
	if (options.useCors ?? false) {
		app.use(cors());
	}
	if (options.staticDir) {
		app.use(serve(options.staticDir));
	}
	if (options.middlewares) {
		for (const middleware of options.middlewares) {
			app.use(middleware);
		}
	}

	// Register routes
	const methods: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

	for (const method of methods) {
		const routes = options[method] as RouteDefinitions | undefined;
		if (!routes) continue;

		if (Array.isArray(routes)) {
			// existing array-of-arrays syntax
			for (const route of routes) {
				router[method](...route);
			}
		} else {
			// object syntax
			for (const path in routes) {
				const handlers = routes[path];
				// wrap single handler into array if needed
				const handlerArray = Array.isArray(handlers) ? handlers : [handlers];
				router[method](path, ...handlerArray);
			}
		}
	}

	app.use(router.routes()).use(router.allowedMethods());

	app.listen(options.port, async () => {
		console.log(`Server listening on http://localhost:${options.port}`);
		if (options.onStart) await options.onStart();
	});
}
