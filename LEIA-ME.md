# Estudo PETROBRAS — versão para publicar online (PWA)

Esta pasta é o app pronto para hospedar de graça no GitHub Pages. Depois de publicado,
o app **atualiza sozinho** quando eu subir uma versão nova, e continua funcionando **offline**
depois da primeira abertura.

## Publicar em ~10 minutos

1. Crie uma conta em https://github.com (grátis).
2. Clique em **New repository**. Nome: `estudo-petrobras`. Marque **Public**. Create.
3. Na página do repositório, clique em **uploading an existing file** e arraste TODOS os
   arquivos desta pasta (index.html, manifest.webmanifest, sw.js, icon-192.png, icon-512.png).
   Clique em **Commit changes**.
4. Vá em **Settings → Pages**. Em "Source", escolha **Deploy from a branch**,
   branch **main** e pasta **/ (root)**. Save.
5. Aguarde ~1 minuto e abra `https://SEU-USUARIO.github.io/estudo-petrobras/` no Chrome do tablet.
6. No Chrome: menu ⋮ → **Instalar aplicativo**. Pronto: vira um app de verdade, com ícone,
   tela cheia e funcionamento offline.

## Atualizar depois

Substitua o `index.html` no repositório pela versão nova (Add file → Upload files) e
**altere a primeira linha do `sw.js`** (`estudo-petrobras-v1` → `v2`, `v3`...) para forçar
a atualização do cache. Ao abrir o app, ele baixa a versão nova sozinho.

> Seus dados (anotações, respostas, notas) ficam salvos no navegador e sobrevivem às
> atualizações. Ainda assim, exporte um backup em ⚙ antes de atualizar.
