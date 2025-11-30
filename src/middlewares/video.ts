import mount from 'koa-mount';
import mime from 'mime';
import fs from 'node:fs';
import pathlib from 'node:path';
import type {Context, Next} from '../types.js';

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

// TODO: make this an option in the future
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mkv'];

export function video(baseDirs: string | string[]) {
	if (!Array.isArray(baseDirs)) {
		baseDirs = [baseDirs];
	}
	return async function (ctx: Context, next: Next) {
		const requestedFilename = decodeURIComponent(ctx.path);

		// Check extension
		const ext = pathlib.extname(requestedFilename).toLowerCase();
		if (!VIDEO_EXTENSIONS.includes(ext)) return next();

		// Find the file in the base directories
		let filePath: string | null = null;
		for (const dir of baseDirs) {
			const fullPath = pathlib.join(dir, requestedFilename);
			if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
				filePath = fullPath;
				break;
			}
		}

		if (!filePath) {
			ctx.throw(404, 'Video not found');
		}

		const stat = fs.statSync(filePath);
		const fileSize = stat.size;
		const range = ctx.headers.range;
		const contentType = mime.getType(filePath) || 'application/octet-stream';

		if (!range) {
			const stream = fs.createReadStream(filePath);
			ctx.status = 200;
			ctx.set('Content-Length', fileSize.toString());
			ctx.set('Content-Type', contentType);
			ctx.body = stream;
			return;
		}

		// Handle range request
		const parts = range.replace(/bytes=/, '').split('-');
		const start = parseInt(parts[0], 10);
		const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
		if (isNaN(start) || start < 0 || start >= fileSize || end >= fileSize) {
			ctx.status = 416;
			ctx.set('Content-Range', `bytes */${fileSize}`);
			return;
		}

		const chunkSize = end - start + 1;
		const stream = fs.createReadStream(filePath, {start, end});
		ctx.status = 206;
		ctx.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
		ctx.set('Accept-Ranges', 'bytes');
		ctx.set('Content-Length', chunkSize.toString());
		ctx.set('Content-Type', contentType);

		ctx.body = stream;
	} as any;
}
