// Publica no GitHub Releases os instaladores gerados por `npm run tauri build`
// (NSIS .exe e MSI .msi, em src-tauri/target/release/bundle/**).
//
// Mesmo padrão do zynk-frontend (electron/scripts/publish-release.js): resolve
// a release (existe? cria?) uma vez só ANTES de subir qualquer arquivo, evitando
// a corrida de releases duplicadas que o publish nativo de alguns bundlers tem.
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const OWNER = 'Fooyer';
const REPO = 'zynk-tauri';
const TAG = `v${pkg.version}`;
const BUNDLE_DIR = path.join(__dirname, '..', 'src-tauri', 'target', 'release', 'bundle');

const ASSET_EXTENSIONS = new Set(['.exe', '.msi', '.sig']);

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
};

async function api(pathname, options = {}) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${options.method || 'GET'} ${pathname} -> ${res.status}: ${body}`);
  }
  return res.status === 204 ? null : res.json();
}

async function getOrCreateRelease() {
  const releases = await api(`/repos/${OWNER}/${REPO}/releases?per_page=100`);
  const existing = releases.find((r) => r.tag_name === TAG);
  if (existing) {
    console.log(`[publish-release] Reaproveitando release existente: ${TAG} (id=${existing.id}, draft=${existing.draft})`);
    return existing;
  }
  console.log(`[publish-release] Nenhuma release ${TAG} encontrada — criando uma nova (draft).`);
  return api(`/repos/${OWNER}/${REPO}/releases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_name: TAG, name: pkg.version, draft: true }),
  });
}

async function deleteExistingAsset(releaseId, fileName) {
  const assets = await api(`/repos/${OWNER}/${REPO}/releases/${releaseId}/assets`);
  const existing = assets.find((a) => a.name === fileName);
  if (existing) {
    console.log(`[publish-release] ${fileName} já existia na release — substituindo.`);
    await api(`/repos/${OWNER}/${REPO}/releases/assets/${existing.id}`, { method: 'DELETE' });
  }
}

async function uploadAsset(release, filePath) {
  const fileName = path.basename(filePath).replace(/ /g, '-');
  await deleteExistingAsset(release.id, fileName);

  const data = fs.readFileSync(filePath);
  const contentType = path.extname(fileName).toLowerCase() === '.sig' ? 'text/plain' : 'application/octet-stream';
  const uploadUrl = release.upload_url.split('{')[0];

  const res = await fetch(`${uploadUrl}?name=${encodeURIComponent(fileName)}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': contentType, 'Content-Length': String(data.length) },
    body: data,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Falha ao subir ${fileName}: ${res.status} ${body}`);
  }
  console.log(`[publish-release] ✓ ${fileName} (${(data.length / 1024 / 1024).toFixed(1)} MB)`);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

function collectAssets() {
  if (!fs.existsSync(BUNDLE_DIR)) {
    throw new Error(`Pasta não encontrada: ${BUNDLE_DIR} — rode "npm run tauri build" antes.`);
  }
  return walk(BUNDLE_DIR).filter((f) => ASSET_EXTENSIONS.has(path.extname(f).toLowerCase()));
}

async function main() {
  if (!token) throw new Error('GH_TOKEN não definido — rode com "node --env-file=.env scripts/publish-release.js".');

  const assets = collectAssets();
  if (assets.length === 0) throw new Error(`Nenhum instalador encontrado em ${BUNDLE_DIR} — rode "npm run tauri build" antes.`);

  console.log(`[publish-release] ${assets.length} arquivo(s) pra subir:`);
  assets.forEach((f) => console.log('  -', path.basename(f)));

  const release = await getOrCreateRelease();
  for (const filePath of assets) {
    await uploadAsset(release, filePath);
  }

  console.log(`[publish-release] Pronto (draft): https://github.com/${OWNER}/${REPO}/releases/tag/${TAG}`);
  console.log('[publish-release] Publique a draft manualmente na UI do GitHub quando revisar os arquivos.');
}

main().catch((err) => {
  console.error('[publish-release] ERRO:', err.message);
  process.exit(1);
});
