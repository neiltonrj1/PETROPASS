/* ============================================================
   Catálogo das provas anteriores.

   `pdf`  — caderno de questões, dentro de PASTA_PDF
   `gab`  — folha de gabarito oficial
   `num`  — número que a banca deu à prova naquele processo
            (é assim que o gabarito identifica cada cargo)
   `ini`  — primeira questão de conhecimentos específicos
   `ate`  — última questão do caderno

   Para acrescentar uma prova nova: jogue os dois PDFs na pasta,
   escreva uma linha aqui e rode `npm run provas`.
   ============================================================ */
export const PASTA_PDF = 'c:\\Users\\neilt\\Downloads\\Concurso PETROBRAS';

export const PROVAS = [
  /* ---------------- INSPEÇÃO ---------------- */
  {
    id: 'insp-2018', trilha: 'inspecao', ano: 2018, num: 4,
    nome: 'Eng. de Equipamentos Jr — Inspeção',
    processo: 'Petrobras PSP RH 2018.1',
    pdf: 'engenheiro_a_de_equipamentos_junior_inspecao.pdf',
    gab: 'gabarito_oficial.pdf', ini: 21, ate: 70,
  },
  {
    id: 'insp-2014', trilha: 'inspecao', ano: 2014, num: 38,
    nome: 'Eng. de Equipamentos Jr — Inspeção',
    processo: 'Petrobras PSP RH 2014.2',
    pdf: 'engenheiro_a_equipamentos_jnior_inspecao.pdf',
    gab: 'gabarito_oficial_apos_recursos.pdf', ini: 21, ate: 70,
    pagina: 8, faixaX: [620, 800],
  },
  {
    id: 'insp-2012', trilha: 'inspecao', ano: 2012, num: 16,
    nome: 'Eng. de Equipamentos Jr — Inspeção',
    processo: 'Petrobras PSP RH 1/2012',
    pdf: 'prova_16_engenheiro_a_de_equipamentos_junior_inspecao.pdf',
    gab: 'gabarito_nivel_superior.pdf', ini: 21, ate: 70,
    pagina: 2, faixaX: [266, 288],
    /* Erro de impressão da própria folha oficial: na coluna desta prova a
       linha entre a 63 e a 65 vem rotulada "68 – D" em vez de "64 – D".
       A coluna inteira: … 62-D | 63-C | [68]-D | 65-C | 66-A | 67-C |
       68-E | 69-B | 70-E — o número 68 aparece DUAS vezes e o 64 nenhuma.

       Isso causava dois estragos de uma vez. A 64 ficava sem gabarito; e
       a 68, que o leitor resolve ficando com a PRIMEIRA ocorrência, herdava
       o D que na verdade é da 64 — enquanto o E verdadeiro era descartado.
       Três confirmações independentes de que a 68 é E: a posição na folha
       (entre a 67 e a 69), o gabarito escrito à mão na lição v3m3, e a
       revisão de conteúdo, que resolveu a questão e chegou em E.      */
    correcoes: { 64: 'D', 68: 'E' },
  },

  /* ---------------- PRODUÇÃO ---------------- */
  {
    id: 'prod-2018', trilha: 'producao', ano: 2018, num: 28,
    nome: 'Eng. Jr — Produção',
    processo: 'Transpetro PSP RH 2018.1',
    pdf: 'engenheiro_a_junior_producao.pdf',
    gab: 'gabarito_definitivo.pdf', ini: 21, ate: 70,
  },
  {
    id: 'prod-2011', trilha: 'producao', ano: 2011, num: 14,
    nome: 'Eng. Jr — Produção',
    processo: 'Petrobras PSP RH 3/2011',
    pdf: 'prova_14_engenheiro_a_junior_area_producao.pdf',
    gab: 'gabaritos.pdf', ini: 21, ate: 70,
  },

  /* ---------------- ELÉTRICA ---------------- */
  {
    id: 'elet-2018', trilha: 'eletrica', ano: 2018, num: 23,
    nome: 'Eng. Jr — Elétrica',
    processo: 'Transpetro PSP RH 2018.1',
    pdf: 'Elétrica\\engenheiro_a_junior_eletrica.pdf',
    gab: 'gabarito_definitivo.pdf', ini: 21, ate: 70,
  },
  {
    id: 'elet-2011', trilha: 'eletrica', ano: 2011, num: 9,
    nome: 'Eng. Jr — Elétrica',
    processo: 'Petrobras PSP RH 3/2011',
    pdf: 'Elétrica\\prova_9_engenheiro_a_junior_area_eletrica.pdf',
    gab: 'gabaritos.pdf', ini: 21, ate: 70,
  },
  {
    id: 'elet-2008', trilha: 'eletrica', ano: 2008, num: 0,
    nome: 'Eng. Jr — Elétrica',
    processo: 'Transpetro PSP RH 002/2008',
    pdf: 'Elétrica\\prova8.pdf',
    gab: 'Elétrica\\transpetro0208_gabsup.pdf', ini: 26, ate: 40,
    pagina: 1, faixaX: [258, 278],
  },
  {
    id: 'elet-2006', trilha: 'eletrica', ano: 2006, num: 37,
    nome: 'Eng. Jr — Áreas Elétrica e Eletrônica',
    processo: 'Petrobras PSP 03/2006',
    pdf: 'Elétrica\\37.pdf',
    gab: 'gabsup.pdf', ini: 21, ate: 40,
    pagina: 2, faixaX: [196, 214],
  },

  /* Uma prova de Elétrica ainda está de fora por falta da folha certa de
     gabarito: prova_7 (Petrobras PSP RH 2/2012). O "gabarito.pdf" que veio
     junto é de outro processo. Baixe a folha correta, jogue na pasta e
     acrescente a linha aqui — o resto é automático.                      */

  /* ---------------- ENGENHARIA MECÂNICA ----------------
     Os cadernos vieram numerados aos pares: N é a prova e NN o gabarito.
     A exceção é o par de 2023, onde a numeração está trocada — 1.pdf é a
     folha de respostas e 11.pdf é o caderno de questões.

     A de 2023.2 é a mais valiosa do acervo inteiro: mesma banca, mesma
     empresa e mesmo cargo da prova de 29/11/2026.                       */
  {
    id: 'mec-2023', trilha: 'mecanica', ano: 2023, num: 24,
    nome: 'Profissional Jr — Engenharia Mecânica',
    processo: 'Transpetro PSP/Terra 2023.2',
    pdf: '11.pdf',
    gab: '1.pdf', ini: 21, ate: 70,
    /* tabela larga: a PROVA 24 ocupa duas colunas (21–45 e 46–70) */
    pagina: 7, faixaX: [420, 495],
  },
  {
    id: 'mec-2015', trilha: 'mecanica', ano: 2015, num: 14,
    nome: 'Profissional Jr — Engenharia Mecânica',
    processo: 'BR Distribuidora PSP 1/2014',
    pdf: '4.pdf',
    /* aqui as básicas vão até 25 (tem Informática II), então as
       específicas começam na 26, não na 21 */
    gab: '44.pdf', ini: 26, ate: 70,
    pagina: 5, faixaX: [385, 400],
  },
  {
    id: 'mec-2012', trilha: 'mecanica', ano: 2012, num: 22,
    nome: 'Profissional Jr — Engenharia Mecânica',
    processo: 'Petrobras PSP RH 1/2011 (prova em 05/02/2012)',
    pdf: '3.pdf',
    gab: '33.pdf', ini: 26, ate: 70,
    pagina: 4, faixaX: [415, 430],
  },
  {
    id: 'mec-2010', trilha: 'mecanica', ano: 2010, num: 13,
    nome: 'Profissional Jr — Engenharia Mecânica',
    processo: 'BR Distribuidora (prova em 02/05/2010)',
    pdf: '5.pdf',
    gab: '55.pdf', ini: 26, ate: 70,
    /* Esta folha é desenhada com fonte Type 3 (glifos vetoriais em
       /CharProcs, sem ToUnicode útil): o pdfjs devolve índices de glifo,
       não texto, e `separaColunas` não acha coluna nenhuma. O gabarito
       abaixo foi decifrado por dois caminhos independentes que fecharam:
       o mapa de glifos derivado das respostas de Língua Portuguesa
       (1-B 2-C 3-D 4-C 5-A 6-E 7-D 8-E 9-A 10-E) e a leitura direta dos
       contornos dos CharProcs (81=A, 88=B, 84=C, 94=D, 70=E).
       Engenharia Mecânica é a 13ª das 17 colunas, em x≈429.

       CUIDADO na linha 38: a coluna de Arquitetura traz "38-anul" em vez
       de letra, e contar só as letras desloca todas as colunas seguintes
       — a resposta certa da 38 é A, não E.                             */
    gabaritoFixo: {
      26: 'C', 27: 'C', 28: 'B', 29: 'B', 30: 'E', 31: 'E', 32: 'E', 33: 'D', 34: 'A',
      35: 'E', 36: 'D', 37: 'C', 38: 'A', 39: 'D', 40: 'B', 41: 'A', 42: 'E', 43: 'C',
      44: 'D', 45: 'C', 46: 'B', 47: 'C', 48: 'E', 49: 'E', 50: 'B', 51: 'A', 52: 'D',
      53: 'B', 54: 'B', 55: 'B', 56: 'A', 57: 'E', 58: 'C', 59: 'D', 60: 'A', 61: 'C',
      62: 'A', 63: 'C', 64: 'B', 65: 'B', 66: 'D', 67: 'C', 68: 'D', 69: 'B', 70: 'D',
    },
  },

  /* ---------------- ANÁLISE E PROJETOS DE INVESTIMENTO ---------------- */
  {
    id: 'proj-2011', trilha: 'projetos', ano: 2011, num: 6,
    nome: 'Eng. Jr — Análise e Projetos de Investimento',
    processo: 'Petrobras PSP RH 3/2011',
    pdf: 'prova_6_engenheiro_a_junior_area_analise_e_projetos_de_investimento.pdf',
    gab: 'gabaritos.pdf', ini: 21, ate: 70,
  },
  {
    id: 'proj-2006', trilha: 'projetos', ano: 2006, num: 34,
    nome: 'Eng. Jr — Análise de Projetos de Investimentos',
    processo: 'Petrobras PSP 03/2006',
    pdf: '34.pdf',
    gab: 'gabsup.pdf', ini: 21, ate: 40,
    pagina: 3, faixaX: [22, 45],
  },
];
