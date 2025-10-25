import cors from '@koa/cors';
import Router from '@koa/router';
import Koa from 'koa';
import serve from 'koa-static';
import {bodyParser} from './bodyParser.js';
import type {
	Context,
	HttpMethod,
	Middleware,
	Next,
	RouteDefinitions,
	VKoaOptions,
} from './types.js';

export function config<ApiShape = any>(options: VKoaOptions<ApiShape>) {
	const app = new Koa();
	const router = new Router();

	app.use(async (ctx, next) => {
		try {
			await next();
		} catch (err) {
			if (options.onError) options.onError(err, ctx);
			else {
				ctx.status = ctx.status || 500;
				ctx.body = {error: (err as Error).message};
				console.error(err);
			}
		}
	});

	if (options.useBodyParser ?? true) app.use(bodyParser());
	if (options.useCors ?? false) app.use(cors());
	if (options.staticDir) app.use(serve(options.staticDir));
	if (options.middlewares) for (const m of options.middlewares) app.use(m);

	const methods: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];
	for (const method of methods) {
		const routes = options[method] as RouteDefinitions | undefined;
		if (!routes) continue;

		for (let path in routes) {
			const middlewareOrMiddlewares = routes[path];

			if (!path.startsWith('/')) path = '/' + path;

			// Prefix with apiVersion if provided
			if (options.apiVersion) path = `/${options.apiVersion}${path}`;

			const middlewares = Array.isArray(middlewareOrMiddlewares)
				? (middlewareOrMiddlewares as Middleware[])
				: [middlewareOrMiddlewares as Middleware];

			const wrappedMiddlewares = middlewares.map(
				(middleware) => async (ctx: Context, next: Next) => {
					const result = await middleware(ctx, next);
					if (result !== undefined && ctx.body === undefined) ctx.body = result;
				},
			);
			router[method](path, ...wrappedMiddlewares);
		}
	}

	app.use(router.routes()).use(router.allowedMethods());

	app.listen(options.port, async () => {
		console.log(`Server listening on http://localhost:${options.port}`);
		if (options.onStart) await options.onStart();
	});
}

export {bodyParser, cors, Koa, Router, serve};
