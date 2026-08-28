# Como publicar uma release do Zynk (Tauri)

Roteiro equivalente ao `npm run release` do zynk-frontend (Electron), adaptado pro Tauri —
gera o instalador Windows (NSIS + MSI) e sobe pra uma GitHub Release em `Fooyer/zynk-tauri`.

## Setup (só na primeira vez)

1. **Crie o repositório vazio** em https://github.com/organizations/Fooyer/repositories/new
   (nome `zynk-tauri`, sem README/license — este projeto já tem os arquivos).
2. **Conecte este projeto local a ele:**
   ```
   git init
   git remote add origin https://github.com/Fooyer/zynk-tauri.git
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```
3. **Crie um token do GitHub** — https://github.com/settings/personal-access-tokens/new,
   fine-grained, restrito ao repositório `Fooyer/zynk-tauri`, permissão **Contents: Read and
   write** (é só o que precisa pra criar release e subir asset). Não reaproveite o `GH_TOKEN`
   do zynk-frontend — são projetos/permissões diferentes, e um token dedicado é mais fácil de
   revogar se vazar sem afetar o outro projeto.
4. Copie `.env.example` para `.env` e cole o token:
   ```
   GH_TOKEN=ghp_...
   ```
   (`.env` já está no `.gitignore` — nunca vai ser commitado)

## Publicar uma versão

1. **Suba a versão** em dois lugares (precisam bater):
   - `package.json` → `"version"`
   - `src-tauri/tauri.conf.json` → `"version"`
2. Rode:
   ```
   release.bat
   ```
   Isso builda o instalador (`npm run tauri build`, com a mesma correção de PATH do
   `run-tauri-dev.bat`) e depois roda `scripts/publish-release.js`, que:
   - Cria (ou reaproveita) uma GitHub Release com tag `v{version}`, como **draft**
   - Sobe os instaladores gerados (`src-tauri/target/release/bundle/**/*.exe` e `*.msi`)
3. Abra o link que o script imprime, confira os arquivos anexados, e **publique a draft**
   manualmente (botão "Publish release") quando estiver satisfeito — o script nunca publica
   sozinho, só prepara.

## O que ainda falta pra um pipeline "de verdade"

- **Sem auto-update ainda** — os instaladores sobem, mas o app não se atualiza sozinho (não
  tem `@tauri-apps/plugin-updater` configurado). Pra isso funcionar como no Electron, precisa
  gerar chave de assinatura (`tauri signer generate`), configurar o plugin updater no
  `tauri.conf.json`, e o `publish-release.js` passaria a subir também os `.sig` e um
  `latest.json` (o script já ignora/aceita `.sig` caso isso seja adicionado depois).
- **Só Windows** — não builda Linux/macOS daqui (cross-compile de instalador nativo não é
  trivial partindo do Windows); isso ficaria pra uma máquina/CI de cada SO, ou GitHub Actions
  com `tauri-apps/tauri-action` (a rota oficial recomendada pelo Tauri pra multi-SO).
- **Sem assinatura de código** — o instalador Windows não é assinado (nem o do Electron era,
  `signAndEditExecutable: false`); o SmartScreen deve alertar no primeiro download de quem
  baixar, igual acontece hoje.
