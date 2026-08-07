# PETROPASS

App de estudo para os concursos de engenharia da Petrobras e da Transpetro
(banca Cesgranrio). Funciona no navegador, instala como aplicativo no celular
ou no tablet e continua funcionando **offline** depois da primeira abertura.

A partir da versão 4, o app cobre **quatro provas diferentes**. Ao entrar pela
primeira vez, o usuário escolhe qual vai fazer, e tudo — apostilas, treino,
provas anteriores, cronograma e o gráfico do que mais cai — passa a ser daquela
prova.

| Trilha | Cargo | O que traz |
|---|---|---|
| 🔍 Inspeção | Eng. de Equipamentos Jr — Inspeção | 14 módulos de materiais, metalurgia, corrosão, soldagem e END |
| ⚙️ Produção | Eng. Jr — Produção | 10 módulos de gestão da produção, qualidade, logística, custos e métodos quantitativos |
| ⚡ Elétrica | Eng. Jr — Elétrica | 11 módulos de circuitos, máquinas, instalações, sistemas de potência, proteção e controle |
| 📈 Projetos | Eng. Jr — Análise e Projetos de Investimento | 10 módulos de engenharia econômica, finanças, economia, estratégia e métodos |

As quatro compartilham os 8 módulos de **Português e Inglês**, que são
eliminatórios para todo mundo.

## Painel de estudo

A tela inicial traz, para a trilha escolhida:

- **Meta diária com cronômetro** — conta os minutos com o app aberto e ativo
  (para quando você troca de aba ou larga o aparelho por mais de 3 minutos).
- **Revisão espaçada** — cada módulo estudado entra numa fila e volta em 1, 3,
  7, 16, 35 e 75 dias. Acertar sobe um degrau; errar volta ao início.
- **Desempenho por semana** — percentual de acerto das últimas 12 semanas.
- **Onde você mais erra** — os assuntos que mais aparecem no caderno de erros.
- **Cobertura por bloco** — quanto você já cobriu de cada volume, com um risco
  marcando o peso daquele bloco nas provas anteriores. Bloco pesado com barra
  curta é onde está o maior ganho.
- **Mapa da sessão** — no quiz e no simulado, uma casinha por questão.

---

## Como mexer nisso no VS Code

### 1. Preparar (só na primeira vez)

Instale o [Node.js](https://nodejs.org) (versão 20 ou mais nova). Depois, abra
esta pasta no VS Code e rode no terminal (`Ctrl` + `'`):

```
npm install
```

### 2. Ver o app rodando

```
npm run dev
```

Abra <http://localhost:5173>. Toda vez que você salvar um arquivo dentro de
`src/`, o `index.html` se refaz sozinho — é só recarregar a página.

> No VS Code isso também está no menu **Terminal → Executar tarefa →
> ▶ Rodar o app**.

### 3. Conferir se não quebrou nada

```
npm test
```

Esse comando abre o app inteiro num navegador de mentira e passa por **todas as
telas de todas as trilhas**, abrindo todos os módulos, todas as abas, todos os
quizzes e todos os simulados. Se aparecer qualquer erro de JavaScript, ele
reprova e diz onde foi. Rode sempre antes de publicar.

### 4. Publicar

```
git add .
git commit -m "o que você mudou"
git push
```

O GitHub Actions refaz o build, roda o teste e publica sozinho. Se o teste
falhar, **nada vai ao ar** — o app publicado continua o de antes.

---

## Onde fica cada coisa

```
PETROPASS/
├── index.html              ← GERADO pelo build. Não edite: será sobrescrito.
├── config.js               ← endereço e chave pública do Supabase
├── sw.js                   ← service worker (offline). A versão é atualizada pelo build.
├── manifest.webmanifest    ← faz o app instalar como aplicativo
│
├── src/                    ← É AQUI QUE VOCÊ EDITA
│   ├── shell/
│   │   ├── cabeca.html     ← <head> da página
│   │   ├── corpo.html      ← barra superior, menu lateral e menu de baixo
│   │   └── estilo.css      ← todo o visual (cores, tipografia, layout)
│   │
│   ├── js/                 ← o código, carregado em ordem alfabética
│   │   ├── 00-vendor-supabase.js   ← biblioteca de login (não mexa)
│   │   ├── 20-figuras.js           ← figuras da trilha de Inspeção
│   │   ├── 22-figuras-trilhas.js   ← figuras de Produção, Elétrica e Projetos
│   │   ├── 25-catalogos.js         ← liga cada figura e cada cálculo ao seu módulo
│   │   └── 40-app.js               ← telas, navegação, quiz, caneta, sincronização
│   │
│   ├── conteudo/           ← AS APOSTILAS
│   │   └── <volume>/
│   │       ├── volume.json         ← título do volume e lista dos módulos
│   │       ├── <mod>.licao.html    ← a lição
│   │       ├── <mod>.questoes.html ← as questões (opcional)
│   │       └── <mod>.gabarito.html ← o gabarito comentado (opcional)
│   │
│   └── dados/
│       ├── trilhas.json    ← as quatro provas, com o plano de 16 semanas de cada
│       ├── temas.json      ← palavras que ligam cada questão de prova ao seu módulo
│       ├── quizzes/        ← questões com resolução completa
│       └── provas/         ← questões extraídas dos PDFs (geradas por npm run provas)
│
└── ferramentas/            ← os scripts
    ├── build.mjs           ← monta o index.html
    ├── dev.mjs             ← servidor local com rebuild automático
    ├── testar.mjs          ← o teste de fumaça
    ├── extrair-provas.mjs  ← lê os PDFs e gera src/dados/provas/
    ├── conferir.mjs        ← mostra o que ficou de fora de cada prova
    ├── mapear-gabarito.mjs ← ajuda a achar a coluna certa num gabarito difícil
    ├── provas.config.mjs   ← o catálogo das provas anteriores
    └── lib/                ← leitura de PDF, recorte de questões, leitura de gabarito
```

---

## Tarefas do dia a dia

### Corrigir um erro numa lição

Abra `src/conteudo/<volume>/<módulo>.licao.html`, edite como HTML normal, salve.
Com `npm run dev` rodando, é só recarregar a página.

### Criar um módulo novo

1. Acrescente o módulo na lista `mods` do `volume.json` do volume:
   ```json
   { "id": "pr1m6", "n": "Módulo 6", "t": "Título do módulo" }
   ```
2. Crie `pr1m6.licao.html` na mesma pasta.
3. Se quiser que as questões de prova sobre o assunto apareçam dentro dele,
   acrescente as palavras-chave em `src/dados/temas.json`.
4. `npm test` e pronto.

> O **id nunca deve ser alterado depois de publicado**: é por ele que o app
> guarda as anotações a caneta e as notas de quem já usa o app.

### Criar um volume novo

Crie a pasta `src/conteudo/<id>/` com um `volume.json` e os HTMLs, e
acrescente o id do volume à lista `vols` da trilha, em `src/dados/trilhas.json`.

### Acrescentar uma prova anterior

1. Ponha o **caderno de questões** e a **folha de gabarito** em PDF na pasta
   indicada por `PASTA_PDF`, em `ferramentas/provas.config.mjs`.
2. Acrescente uma linha no catálogo, no mesmo arquivo:
   ```js
   {
     id: 'insp-2021', trilha: 'inspecao', ano: 2021, num: 4,
     nome: 'Eng. de Equipamentos Jr — Inspeção',
     processo: 'Petrobras PSP RH 2021.1',
     pdf: 'caderno.pdf', gab: 'gabarito.pdf', ini: 21, ate: 70,
   }
   ```
   `num` é o número que a banca deu à prova (aparece como "PROVA 4" na folha
   de gabarito).
3. Rode `npm run conferir` para ver se o caderno e o gabarito foram lidos
   inteiros, e `npm run provas` para gerar o JSON.

Se o gabarito for daqueles em que o nome do cargo é impresso na vertical
(2012 e 2014 são assim), o `num` não resolve. Nesse caso rode
`npm run gabarito -- "caminho/do/gabarito.pdf"`, descubra em que faixa
horizontal está a coluna do cargo e informe no catálogo:

```js
pagina: 8, faixaX: [620, 800],
```

### Mexer na estética pelo Claude Design

```
npm run design
```

Isso regenera a pasta `design/`: 12 páginas que mostram os componentes do app
usando o **CSS de verdade** (`src/shell/estilo.css`), sem as fontes em base64.
Dá para abrir os arquivos direto no navegador, ou pedir ao Claude Code para
enviá-los ao projeto **PETROPASS study app design** no
[Claude Design](https://claude.ai/design) — onde eles convivem com os
documentos da marca e das capas, no arquivo *PETROPASS App - componentes*.

O caminho de volta não é automático: o que você ajustar no Claude Design não
entra no app sozinho. Quase toda a estética sai de umas 20 variáveis no
`:root` do `estilo.css` — mudar uma delas muda o app inteiro, nos dois temas.

### Trocar o projeto do Supabase

Edite `config.js` com o Project URL e a chave **anon public** do novo projeto
(Project Settings → API). Nunca coloque ali a chave `service_role`.

---

## Como as questões de prova entram no app

O `npm run provas` lê os PDFs, recorta as questões, casa cada uma com o
gabarito oficial e grava um JSON por prova. Duas regras de segurança:

- **Questão que depende de figura fica de fora.** Sem o desenho do caderno,
  ela ensinaria errado. O `conferir` mostra quantas caíram nessa situação.
- **Questão sem gabarito conferido fica de fora.** Nada entra "no chute".

Depois, o `build` lê `src/dados/temas.json` e coloca cada questão dentro do
módulo em que ela deve ser estudada. Isso alimenta duas coisas: a aba
**De prova** dentro de cada lição e o gráfico **O que mais cai** da tela
inicial — que passa a ser contagem real, não estimativa.

Se uma questão cair no módulo errado, acrescente ou ajuste as palavras-chave
em `temas.json` e rode o build de novo.

---

## Instalar como aplicativo

Abra o endereço publicado no Chrome do celular ou do tablet e use o menu
**⋮ → Instalar aplicativo**. Vira um app de verdade, com ícone e tela cheia, e
passa a abrir mesmo sem internet.

Cada usuário tem sua conta, e o progresso sincroniza na nuvem — dá para estudar
no tablet e continuar no computador. Anotações a caneta, notas, respostas e
cronograma **ficam separados por prova**: trocar de trilha não apaga nada.

---

## Banco de dados

O arquivo `supabase-setup.sql` (na pasta acima desta) cria as tabelas, o
gatilho de cadastro e as políticas de segurança. Cole no SQL Editor do Supabase
e clique em Run. Contas novas nascem **bloqueadas**: para liberar, marque
`aprovado` na tabela `perfis`.
