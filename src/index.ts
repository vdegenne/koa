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

/**
 * Data will be available at `ctx.request.body`
 */
function bodyParser() {
	return async function (ctx: Context, next: Next): Promise<void> {
		if (
			(ctx.method === 'POST' ||
				ctx.method === 'PUT' ||
				ctx.method === 'PATCH' ||
				ctx.method === 'DELETE') &&
			ctx.is('application/json')
		) {
			const data = await new Promise<string>((resolve, reject) => {
				let raw = '';
				ctx.req.on('data', (chunk) => {
					raw += chunk;
				});
				ctx.req.on('end', () => {
					resolve(raw);
				});
				ctx.req.on('error', (err) => {
					reject(err);
				});
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

	get?: Array<[string, ...Router.Middleware[]]>;
	post?: Array<[string, ...Router.Middleware[]]>;

	middlewares?: Middleware[];

	onStart?: () => void;
}

export function config(options: VKoaOptions) {
	const app = new Koa();
	const router = new Router();

	if (options.useBodyParser === undefined) {
		options.useBodyParser = true;
	}
	if (options.useBodyParser) {
		app.use(bodyParser());
	}
	if (options.useCors === undefined) {
		options.useCors = false;
	}
	if (options.useCors) {
		app.use(cors());
	}

	app.use(bodyParser());

	if (options.middlewares) {
		for (const middleware of options.middlewares) {
			app.use(middleware);
		}
	}

	if (options.get) {
		for (const route of options.get) {
			router.get(...route);
		}
	}

	if (options.post) {
		for (const route of options.post) {
			router.post(...route);
		}
	}

	app.use(router.routes()).use(router.allowedMethods());

	app.listen(options.port, () => {
		console.log(`Server listening on http://localhost:${options.port}`);
		if (options.onStart) options.onStart();
	});
}
