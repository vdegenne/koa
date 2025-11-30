import net from 'net';

const origEmit = (net.Socket.prototype as any).emit;

(net.Socket.prototype as any).emit = function (event: any, ...args: any[]) {
	const err = args[0];

	if (
		event === 'error' &&
		(err.code === 'ECONNRESET' || err.code === 'EPIPE')
	) {
		return false;
	}

	// appel original
	return origEmit.apply(this, arguments);
};

export {default as range} from 'koa-range';
