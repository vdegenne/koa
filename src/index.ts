import cors from '@koa/cors';
import Router from '@koa/router';
import Koa from 'koa';
import mount from 'koa-mount';
import serve from 'koa-static';
import {FieldsGuard} from './FieldsGuard.js';
import {bodyParser} from './middlewares/bodyParser.js';
import type {
	HttpMethod,
	Middleware,
	Next,
	RequestContext,
	RouteDefinitions,
	VKoaOptions,
} from './types.js';

const methods: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

// TODO: accept an array of configs instead of one
export function config<ApiShape = any>(options: VKoaOptions<ApiShape>) {
	const app = new Koa();
	const router = new Router();

	// app.use(async (ctx, next) => {
	// 	try {
	// 		await next();
	// 	} catch (err) {
	// 		if (options.onError) options.onError(err, ctx);
	// 		else {
	// 			ctx.status = ctx.status || 500;
	// 			ctx.body = {error: (err as Error).message};
	// 			console.error(err);
	// 		}
	// 	}
	// });

	if (options.useBodyParser ?? true) app.use(bodyParser());
	if (options.useCors ?? false) app.use(cors());
	if (options.statics && Array.isArray(options.statics)) {
		for (const folder of options.statics) {
			if (typeof folder === 'string') {
				app.use(serve(folder));
			} else if (folder.prefix && folder.location) {
				app.use(mount(folder.prefix, serve(folder.location)));
			}
		}
	}
	if (options.middlewares)
		for (const m of options.middlewares) {
			if (!m) return;
			if (options.apiVersion) {
				app.use(mount(`/${options.apiVersion}`, m));
			} else {
				app.use(m);
			}
		}

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
				(middleware) => async (ctx: RequestContext, next: Next) => {
					const guardManager = new FieldsGuard({ctx});
					const guard = guardManager.check.bind(guardManager);
					const params = ctx.params;
					const result = await middleware({ctx, next, guard, params});
					if (result !== undefined && ctx.body === undefined) ctx.body = result;
					if (ctx.body === undefined) {
						// TODO: not sure about that
						// ctx.body = '';
					}
					// await next();
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
