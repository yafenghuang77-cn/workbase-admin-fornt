import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname } from 'node:path';

const build = new URL('../workbase/', import.meta.url);
const index = readFileSync(new URL('index.html', build));
const base = '/workbase/';
const contentTypes = new Map([
  ['.css', 'text/css'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript'],
  ['.svg', 'image/svg+xml'],
]);

const readAsset = (url) => {
  try {
    return readFileSync(url);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return null;
  }
};

createServer((request, response) => {
  const pathname = request.url?.split('?')[0] ?? '';
  const target = pathname.slice(base.length);
  if (
    !pathname.startsWith(base) ||
    !/^[\w./~-]*$/u.test(target) ||
    target.split('/').includes('..') ||
    target.startsWith('/')
  ) {
    response.writeHead(404).end();
    return;
  }

  const extension = extname(target);
  const asset = extension ? readAsset(new URL(target, build)) : index;
  const gzip =
    !asset && /\bgzip\b/u.test(request.headers['accept-encoding'] ?? '')
      ? readAsset(new URL(`${target}.gz`, build))
      : null;
  const body = asset ?? gzip;
  if (!body) {
    response.writeHead(404).end();
    return;
  }

  response.setHeader(
    'Content-Type',
    contentTypes.get(extension || '.html') ?? 'application/octet-stream',
  );
  if (gzip) response.setHeader('Content-Encoding', 'gzip');
  response.writeHead(200).end(body);
}).listen(4174, '127.0.0.1');
