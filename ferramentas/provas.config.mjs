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

  /* Duas provas ficaram de fora por falta da folha certa de gabarito:
       • prova_7 (Elétrica, Petrobras PSP RH 2/2012)
       • engenharia_eletrica (Transpetro Terra 2023.2)
     Nos dois casos o "gabarito.pdf"/"gabaritos.pdf" que veio junto é de
     outro processo. Baixe a folha correta, jogue na pasta e acrescente a
     linha aqui — o resto é automático.                                  */

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
