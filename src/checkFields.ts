import type {RouterContext} from '@koa/router';

interface CheckFieldsOptions<T> {
	/* Koa context */
	ctx?: RouterContext;
	/* All fields */
	fields: (keyof T)[];
	/* Required fields */
	requireds: (keyof T)[];
	/**
	 * If true, new fields (the ones not listed in fields) will pass the check
	 * and will not be removed from the filtered body (returned type).
	 *
	 * @default false
	 */
	acceptNewFields: boolean;
	/**
	 * If the filtered body is empty, reject the request.
	 *
	 * @default true
	 */
	throwIfEmpty: boolean;
}

const defaults: Omit<CheckFieldsOptions<any>, 'ctx'> = {
	fields: [],
	requireds: [],
	acceptNewFields: false,
	throwIfEmpty: true,
};

export function checkFields<T>(options: Partial<CheckFieldsOptions<T>>) {
	const _options: CheckFieldsOptions<T> = {
		...(defaults as CheckFieldsOptions<T>),
		...options,
	};
	if (_options.ctx === undefined) {
		throw new Error('Context required');
	}
	const {ctx} = _options;
	const {body} = ctx.request as any;
	const bodyFields = Object.keys(body); // string[]

	let fields = _options.fields.map(String);
	if (_options.acceptNewFields) {
		fields.push(...bodyFields);
	}
	fields = [...new Set(fields)];

	const missingFields = _options.requireds
		.map(String)
		.filter((required) => !bodyFields.includes(required));
	if (missingFields.length > 0) {
		ctx.throw(400, `Missing required fields: ${missingFields.join(', ')}`);
	}

	const availableFields = bodyFields.filter((bodyField) =>
		fields.includes(bodyField),
	);

	if (availableFields.length === 0 && _options.throwIfEmpty) {
		ctx.throw(
			400,
			`At least one of the following fields must be provided: ${_options.fields.join(
				', ',
			)}`,
		);
	}

	return availableFields.reduce((obj, key) => {
		obj[key as keyof T] = body[key];
		return obj;
	}, {} as Partial<T>);
}
