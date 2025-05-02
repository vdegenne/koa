import Router from '@koa/router';
import type {Context, Next} from 'koa';
import Koa from 'koa';

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
		if (ctx.method === 'POST' && ctx.is('application/json')) {
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

export {Koa, Router, bodyParser};
