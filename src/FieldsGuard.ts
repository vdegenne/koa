import type {Context} from 'koa';

interface GlobalOptions<T> {
	fields?: (keyof T)[];
	/**
	 * @default false
	 */
	allowAlien?: boolean;
}

interface PostOptions<T, K extends keyof T> {
	ctx: Context;
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
	#options: Required<GlobalOptions<T>>;

	constructor(options: Partial<GlobalOptions<T>> = {}) {
		this.#options = {
			fields: [],
			allowAlien: false,
			...options,
		};
	}

	post<K extends keyof T, AllowAlien extends boolean = false>(
		options: PostOptions<T, K> &
			Partial<GlobalOptions<T>> & {allowAlien?: AllowAlien},
	): RequiredAndOptionalWithAlien<T, K, AllowAlien> {
		const {ctx, required} = options;
		const body = (ctx.request as any).body as Record<string, unknown>;

		for (const key of required) {
			if (!(key in body)) {
				ctx.throw(400, `Missing required field: ${String(key)}`);
			}
		}

		const fields = options.fields ?? this.#options.fields;
		const allowAlien = options.allowAlien ?? this.#options.allowAlien;

		const result: Record<string, unknown> = {};

		for (const key in body) {
			if ((fields as string[]).includes(key) || allowAlien) {
				result[key] = body[key];
			} else {
				ctx.throw(400, `Invalid field: ${key}`);
			}
		}

		// ensure all declared fields that exist in body are included
		for (const key of fields) {
			if (key in body) result[key as string] = body[key as string];
		}

		return result as RequiredAndOptionalWithAlien<T, K, AllowAlien>;
	}
}
