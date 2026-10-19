import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { checkLocalLinks } from './site-links.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'omar-site-links-'));
  t.after(async () => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert(basename(root).startsWith('omar-site-links-'));
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(join(root, 'ar', 'projects'), { recursive: true });
  await writeFile(join(root, 'index.html'), '<main id="work">English work</main>');
  await writeFile(join(root, 'ar', 'index.html'), '<main id="work">أعمالي</main>');
  return { root, page: join(root, 'ar', 'projects', 'sales.html') };
}

test('nested Arabic pages resolve root-relative fragments within the published site', async t => {
  const { root, page } = await fixture(t);
  assert.deepEqual(await checkLocalLinks(root, page, '<a href="/ar/index.html#work">أعمالي</a><a href="/?lang=en#work">Work</a>'), []);
});

test('a nonexistent root-relative fragment is reported instead of silently passing', async t => {
  const { root, page } = await fixture(t);
  const errors = await checkLocalLinks(root, page, '<a href="/ar/index.html#missing">Broken</a>');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing anchor \/ar\/index\.html#missing/);
});

test('unreadable fragment targets fail and remote links are left alone', async t => {
  const { root, page } = await fixture(t);
  const errors = await checkLocalLinks(root, page, '<a href="/not-there.html#work">Broken</a><a href="https://example.com/#unknown">Remote</a>');
  assert(errors.some(e => e.includes('unreadable anchor target /not-there.html#work')));
  assert(!errors.some(e => e.includes('example.com')));
});

test('query strings do not turn valid local resources into missing files', async t => {
  const { root, page } = await fixture(t);
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'assets', 'site.css'), 'body{}');
  assert.deepEqual(await checkLocalLinks(root, page, '<link href="/assets/site.css?v=revision">'), []);
});
