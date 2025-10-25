import cors from '@koa/cors';
import Router from '@koa/router';
import type {Context, Next} from 'koa';
import Koa from 'koa';
import serve from 'koa-static';
import {bodyParser} from './bodyParser.js';
import type {
	HttpMethod,
	RouteDefinitions,
	RouteHandler,
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

		for (const path in routes) {
			const handlers = Array.isArray(routes[path])
				? routes[path].map((handler) => async (ctx: Context, next: Next) => {
						const result = await handler(ctx, next);
						if (result !== undefined && ctx.body === undefined)
							ctx.body = result;
					})
				: [
						async (ctx: Context, next: Next) => {
							const result = await (routes[path] as RouteHandler)(ctx, next);
							if (result !== undefined && ctx.body === undefined)
								ctx.body = result;
						},
					];
			router[method](path, ...handlers);
		}
	}

	app.use(router.routes()).use(router.allowedMethods());

	app.listen(options.port, async () => {
		console.log(`Server listening on http://localhost:${options.port}`);
		if (options.onStart) await options.onStart();
	});
}

export {bodyParser, cors, Koa, Router, serve};
