# Zynk — MVP Tauri

Reimplementação do Zynk (hoje em Electron, ver `../zynk-frontend`) usando Tauri + React, pra
validar se o app inteiro funciona fora do Electron: captura de tela/áudio via WebView2, tray,
chamadas WebRTC (1:1 e canal de voz de grupo), grupos, eventos etc. Fala com o mesmo backend de
produção (`https://zynk.fooyer.com`) — nenhum servidor local é necessário.

## Rodar o app (janela nativa)

```
npm install
```

depois, **use o script**, não `npm run tauri dev` direto:

```
run-tauri-dev.bat
```

(dá pra rodar pelo terminal ou dar duplo-clique no arquivo)

### Por que não `npm run tauri dev` direto

Nesta máquina, `cargo`/`rustc` não estão utilizáveis via PATH normal (o shim em
`~/.cargo/bin` está quebrado — falta o `rustup.exe`) e o `cmd.exe` puro resolve `link.exe`
pro utilitário do Git for Windows (`C:\Program Files\Git\usr\bin\link.exe`, uma ferramenta
completamente diferente) em vez do linker do Visual Studio, porque o Git aparece antes na
PATH. O `run-tauri-dev.bat` corrige isso numa única sessão de shell, sem mexer na PATH do
sistema:

1. Chama `vcvars64.bat` do Visual Studio (bota o `link.exe`/`cl.exe` certos na frente da PATH)
2. Acrescenta o toolchain `stable-x86_64-pc-windows-msvc` do rustup na PATH (onde o `cargo.exe`
   de verdade mora)
3. Só então roda `npm run tauri dev`

Se algum dia o `rustup.exe` for reinstalado (resolve o shim quebrado em `~/.cargo/bin`) e o
Git for Windows for movido pra depois do Visual Studio na PATH do usuário, `npm run tauri dev`
direto passa a funcionar sem o script.

## Rodar só o front (sem janela nativa, mais rápido pra iterar UI)

```
npm run dev
```

Abre em `http://localhost:5173` num navegador comum — quase tudo funciona igual (login, chat,
grupos, chamadas), porque é tudo Web API padrão. **Porta fixa em 5173** (não a `1420` padrão do
Tauri) de propósito: é a mesma porta que o CORS do backend (`zynk-backend/src/app.ts`,
`CORS_ORIGINS`) já libera pro Electron em dev — mudar essa porta sem atualizar o backend quebra
login com erro de CORS.

## Build de produção / publicar release

Ver [RELEASING.md](./RELEASING.md) — roteiro completo pra gerar o instalador e publicar como
GitHub Release em `Fooyer/zynk-tauri` (`release.bat`).

## O que não está migrado

- **Gamepad virtual** (ViGEmBus) — não existe em Tauri sem reescrever em Rust; combinado que
  fica de fora por enquanto.
- **Auto-update** — a aba "Sobre" nas Configurações já degrada bem sem ele (mostra aviso em vez
  de quebrar), mas não há pipeline de update real ainda (seria `@tauri-apps/plugin-updater`).
- **Session de jogo / streaming de controle** (`components/game/*` no zynk-frontend) — depende
  do gamepad virtual acima.

## Pré-requisitos desta máquina

- Node.js
- Rust (toolchain `stable-x86_64-pc-windows-msvc`)
- Visual Studio Build Tools com o workload "Desktop development with C++" (dá o `link.exe`/
  `cl.exe`/Windows SDK que o Rust precisa pra linkar no Windows)
