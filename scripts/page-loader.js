// Embedded in the published HTML so even cached HTML can discover new assets.
const fallback = __RELEASE__;
const validRelease = release => release && /^[a-f0-9]{16}$/.test(release.version)
  && /^assets\/app-[a-f0-9]{12}\.js$/.test(release.app)
  && /^assets\/style-[a-f0-9]{12}\.css$/.test(release.style);

async function latestRelease() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const url = new URL('./release.json', location.href);
    url.searchParams.set('check', Date.now().toString());
    const response = await fetch(url, {cache: 'no-store', signal: controller.signal});
    if (!response.ok) throw Error('Release check failed');
    const release = await response.json();
    if (!validRelease(release)) throw Error('Invalid release');
    return release;
  } finally {
    clearTimeout(timer);
  }
}

const release = await latestRelease().catch(() => fallback);
try {
  await new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(release.style, location.href).href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.append(link);
  });
  await import(new URL(release.app, location.href).href);
} catch (error) {
  console.error('NOIR WORDS loading failed:', error);
  const message = document.createElement('div');
  message.className = 'loading';
  message.textContent = '페이지를 불러오지 못했어요. 새로고침해 주세요.';
  document.querySelector('#app').replaceChildren(message);
}

// Back/forward cache can restore a whole old page without executing this module.
window.addEventListener('pageshow', async event => {
  if (!event.persisted || document.querySelector('.quiz-wrap')) return;
  try {
    const latest = await latestRelease();
    if (latest.version !== release.version) {
      const url = new URL(location.href);
      url.searchParams.set('v', latest.version);
      location.replace(url.href);
    }
  } catch { /* A network failure should not interrupt a working page. */ }
});
