import type {Context} from 'koa';
import {RequestContext} from './types.js';

interface GlobalOptions<T> {
	fields: (keyof T)[];
	/**
	 * @default false
	 */
	allowAlien: boolean;
	ctx: RequestContext | undefined;
}

interface PostOptions<T, K extends keyof T> {
	required: K[];
}

type RequiredAndOptionalWithAlien<
	T,
	K extends keyof T,
	AllowAlien extends boolean,
> = Pick<T, K> &
	Partial<Omit<T, K>> &
	(AllowAlien extends true ? Record<string, unknown> : {});

export class FieldsGuard<T> {
	#options: GlobalOptions<T>;

	constructor(options: Partial<GlobalOptions<T>>) {
		this.#options = {
			fields: [],
			allowAlien: false,
			ctx: undefined,
			...options,
		};
	}

	check<K extends keyof T, AllowAlien extends boolean = false>(
		options: PostOptions<T, K> &
			Partial<GlobalOptions<T>> & {allowAlien?: AllowAlien},
	): RequiredAndOptionalWithAlien<T, K, AllowAlien> {
		const context = options.ctx ?? this.#options.ctx;
		if (context === undefined) {
			throw new Error('Context required');
		}
		const {required} = options;
		const body = context.request.body as Record<string, unknown>;

		for (const key of required) {
			if (!(key in body)) {
				context.throw(400, `Missing required field: ${String(key)}`);
			}
		}

		const fields = options.fields ?? this.#options.fields;
		const allowAlien = options.allowAlien ?? this.#options.allowAlien;

		const result: Record<string, unknown> = {};

		for (const key in body) {
			if ((fields as string[]).includes(key) || allowAlien) {
				result[key] = body[key];
			} else {
				context.throw(400, `Invalid field: ${key}`);
			}
		}

		// ensure all declared fields that exist in body are included
		for (const key of fields) {
			if (key in body) result[key as string] = body[key as string];
		}

		return result as RequiredAndOptionalWithAlien<T, K, AllowAlien>;
	}
}
