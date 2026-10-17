import {createHash} from 'node:crypto';
import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const hash = (content, length = 12) => createHash('sha256').update(content).digest('hex').slice(0, length);

export async function preparePages({source = join(project, 'dist'), output = join(project, '_site')} = {}) {
  if (resolve(source) === resolve(output)) throw Error('Keep the source and output directories separate');
  const [html, app, engine, style, words, icon, loader] = await Promise.all([
    readFile(join(source, 'index.html'), 'utf8'),
    readFile(join(source, 'app.js'), 'utf8'),
    readFile(join(source, 'engine.js'), 'utf8'),
    readFile(join(source, 'style.css'), 'utf8'),
    readFile(join(source, 'words.json'), 'utf8'),
    readFile(join(source, 'icon.svg'), 'utf8'),
    readFile(new URL('./page-loader.js', import.meta.url), 'utf8'),
  ]);
  const engineName = `engine-${hash(engine)}.js`;
  const wordsName = `words-${hash(words)}.json`;
  if (!app.includes("from './engine.js'") || !app.includes("fetch('./words.json')")) {
    throw Error('Update asset rewriting for the new app imports before deploying');
  }
  const bundledApp = app.replace("from './engine.js'", `from './${engineName}'`)
    .replace("fetch('./words.json')", `fetch(new URL('./${wordsName}', import.meta.url))`);
  const assets = {
    [`app-${hash(bundledApp)}.js`]: bundledApp,
    [engineName]: engine,
    [`style-${hash(style)}.css`]: style,
    [wordsName]: words,
    [`icon-${hash(icon)}.svg`]: icon,
  };
  const release = {
    version: hash(JSON.stringify(assets), 16),
    app: `assets/app-${hash(bundledApp)}.js`,
    style: `assets/style-${hash(style)}.css`,
  };
  const embeddedLoader = loader.replace('__RELEASE__', JSON.stringify(release)).replaceAll('</script', '<\\/script');
  const publishedHtml = html
    .replace(/<link rel="stylesheet"[^>]*>/, `<style>body{margin:0;background:#101210;color:#eceee7;font-family:sans-serif}.loading{padding:48px;text-align:center}</style>`)
    .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="./assets/icon-${hash(icon)}.svg" type="image/svg+xml">`)
    .replace(/<script type="module"[^>]*><\/script>/, `<script type="module">\n${embeddedLoader}\n</script>`);
  if (publishedHtml === html || !publishedHtml.includes('cache: \'no-store\'')) throw Error('Missing page loader');
  await mkdir(output, {recursive: true});
  // Retain the existing URLs as a compatibility path for pre-loader cached HTML.
  await cp(source, output, {recursive: true});
  await mkdir(join(output, 'assets'), {recursive: true});
  for (const [name, content] of Object.entries(assets)) await writeFile(join(output, 'assets', name), content);
  await writeFile(join(output, 'index.html'), publishedHtml);
  await writeFile(join(output, 'release.json'), JSON.stringify(release) + '\n');
  return release;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await preparePages()));
}
