import { access, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

const origin = 'https://portfolio-check.invalid/';
const external = ref => /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref);

function targetFor(root, page, ref) {
  const pageUrl = new URL(relative(root, page).replaceAll('\\', '/'), origin);
  const url = new URL(ref, pageUrl);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  return { file: resolve(root, '.' + pathname), fragment: decodeURIComponent(url.hash.slice(1)) };
}

// Shared by the production checker and regression tests. Never swallow unreadable targets.
export async function checkLocalLinks(root, page, html) {
  const errors = [];
  const name = relative(root, page).replaceAll('\\', '/');
  const checked = new Set();
  for (const [, ref] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    if (external(ref) || ref.startsWith('#')) continue;
    try {
      const { file } = targetFor(root, page, ref);
      if (!checked.has(file)) await access(file);
      checked.add(file);
    } catch {
      errors.push(name + ': missing local resource ' + ref);
    }
  }
  for (const [, ref] of html.matchAll(/\bhref="([^"]*#[^"]+)"/g)) {
    if (external(ref)) continue;
    try {
      const { file, fragment } = targetFor(root, page, ref);
      if (!fragment) continue;
      const target = await readFile(file, 'utf8');
      if (!target.includes('id="' + fragment + '"') && !target.includes("id='" + fragment + "'")) {
        errors.push(name + ': missing anchor ' + ref);
      }
    } catch {
      errors.push(name + ': unreadable anchor target ' + ref);
    }
  }
  return errors;
}
