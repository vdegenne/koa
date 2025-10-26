import type {Context, Next} from '../types.js';

export function bodyParser() {
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
				(ctx.request as any).body = JSON.parse(data);
			} catch {
				ctx.throw(400, 'Invalid JSON');
			}
		}
		await next();
	};
}
