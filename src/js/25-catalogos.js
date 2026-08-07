/* ===================== CATÁLOGO DE FIGURAS ===================== */
const FIGURAS = [
  {id:'ccc', mod:'v1m1', t:'Estrutura CCC em 3D', d:'Gire com o dedo. Aumente o raio dos átomos para ver o empacotamento.', f:(b)=>figCristal(b,'ccc')},
  {id:'cfc', mod:'v1m1', t:'Estrutura CFC em 3D', d:'A da austenita e do alumínio: mais compacta que a CCC.', f:(b)=>figCristal(b,'cfc')},
  {id:'hc',  mod:'v1m1', t:'Estrutura HC em 3D', d:'Hexagonal compacta: mesmo empacotamento da CFC, mas poucos sistemas de escorregamento.', f:(b)=>figCristal(b,'hc')},
  {id:'fec', mod:'v1m2', t:'Diagrama Fe-C com a regra da alavanca', d:'Mexa no carbono e na temperatura: ele calcula as frações na hora.', f:figFeC},
  {id:'ttt', mod:'v1m3', t:'Curva TTT e caminhos de resfriamento', d:'Veja o que cada tratamento produz.', f:figTTT},
  {id:'ttt2',mod:'v1m4', t:'Curva TTT e caminhos de resfriamento', d:'Recozimento, normalização, têmpera e austêmpera.', f:figTTT},
  {id:'tra', mod:'v2m1', t:'Curva tensão-deformação', d:'Resiliência e tenacidade em área.', f:figTracao},
  {id:'pou', mod:'v2m2', t:'Diagrama de Pourbaix do ferro', d:'Arraste o pH e o potencial e veja em que região o metal está.', f:figPourbaix},
  {id:'pou2',mod:'v2m3', t:'Diagrama de Pourbaix do ferro', d:'A base da proteção catódica.', f:figPourbaix},
  {id:'sch', mod:'v3m2', t:'Diagrama de Schaeffler com diluição', d:'Ajuste base, adição e diluição e veja onde a solda cai.', f:figSchaeffler},

  /* ---- Elétrica ---- */
  {id:'tri',  mod:'el1m1', t:'Triângulo de potências e correção do fator de potência',
   d:'Mexa no fator de potência e veja o banco de capacitores que a instalação precisa.', f:figTriangulo},
  {id:'cjg',  mod:'el1m4', t:'Conjugado × velocidade do motor de indução',
   d:'Baixe a tensão e veja o conjugado cair com o quadrado dela. Aumente a resistência do rotor e veja o pico andar.', f:figConjugado},
  {id:'rele', mod:'el2m4', t:'Curva do relé de sobrecorrente',
   d:'Compare as curvas normalmente, muito e extremamente inversa e leia o tempo de atuação.', f:figRele},
  {id:'tri2', mod:'el2m6', t:'O que a correção do fator de potência economiza',
   d:'O mesmo triângulo, agora pela ótica da conta de energia.', f:figTriangulo},

  /* ---- Produção ---- */
  {id:'abc',  mod:'pr1m4', t:'Curva ABC de estoque',
   d:'Dez itens reais de manutenção. Mexa nos cortes e veja quem é A, B e C.', f:figABC},
  {id:'peq',  mod:'pr1m5', t:'Ponto de equilíbrio e decisão de capacidade',
   d:'Quanto a demanda precisa crescer para pagar um aumento de capacidade.', f:figEquilibrio},
  {id:'peq2', mod:'pr2m3', t:'Ponto de equilíbrio, margem de segurança e alavancagem',
   d:'Receita, custo total e custo fixo no mesmo gráfico.', f:figEquilibrio},

  /* ---- Análise e Projetos de Investimento ---- */
  {id:'vpl',  mod:'pj1m2', t:'Perfil do VPL e a TIR',
   d:'Arraste a TMA e veja o VPL mudar de sinal exatamente na TIR.', f:figVPL},
  {id:'vpl2', mod:'pj1m3', t:'VPL, TIR e payback do mesmo fluxo',
   d:'A mesma curva, agora para discutir taxa de desconto e risco.', f:figVPL}
];

/* =================== CÁLCULOS RESOLVIDOS =================== */
const CALCULOS = [
{mod:'v1m2', t:'Regra da alavanca — quanto de perlita se forma?',
 orig:'Cesgranrio 2014, Q28 (gabarito oficial: E)',
 en:'A quantidade de perlita formada pela austenitização de um aço ao carbono contendo 0,25% C, seguida de resfriamento lento, em massa, é de:',
 dados:['C₀ = 0,25% C (o aço do enunciado)','C da ferrita a 727 °C = 0,022%','C do eutetoide (perlita) = 0,77%'],
 passos:[
  {t:'Identifique o tipo de aço. Como 0,25% < 0,77%, é um aço <b>hipoeutetoide</b>: ao resfriar, primeiro nasce ferrita pró-eutetoide, e o que sobra de austenita vira perlita ao cruzar 727 °C.', f:''},
  {t:'Monte a alavanca no ponto logo abaixo de 727 °C. A fração de perlita usa o braço que vai da ferrita até a composição da liga, dividido pelo braço total:', f:`%perlita = ${fr('C₀ − C<sub>α</sub>','C<sub>eut</sub> − C<sub>α</sub>')}`},
  {t:'Substitua os valores:', f:`%perlita = ${fr('0,25 − 0,022','0,77 − 0,022')} = ${fr('0,228','0,748')}`},
  {t:'Efetue a divisão:', f:`%perlita = 0,3048 → <b>30,5%</b> ≈ <b>31,5%</b> (com C<sub>eut</sub> = 0,76 no gabarito)`},
  {t:'A ferrita pró-eutetoide é o resto:', f:`%ferrita = 100 − 31,5 = <b>68,5%</b>`}
 ],
 resp:'Letra E — 31,5%',
 erro:'O distrator 68,5% é a fração de FERRITA. Quem inverte os braços da alavanca cai nele. Regra de ouro: a fração de uma fase usa sempre o braço <b>oposto</b> a ela.'},

{mod:'v1m2', t:'Alavanca no hipereutetoide — quanto de cementita?',
 orig:'Estilo Cesgranrio 2018, Q34',
 en:'Um aço com 1,20% C é aquecido até a região austenítica e resfriado lentamente até a temperatura ambiente. Qual a fração de cementita pró-eutetoide e a de cementita total?',
 dados:['C₀ = 1,20%','C do eutetoide = 0,77%','C da cementita (Fe₃C) = 6,70%','C da ferrita = 0,022%'],
 passos:[
  {t:'Acima de 0,77% o aço é <b>hipereutetoide</b>: o que nasce primeiro, nos contornos, é cementita.', f:''},
  {t:'Cementita pró-eutetoide (formada entre Acm e A1):', f:`%Fe₃C<sub>pró</sub> = ${fr('C₀ − 0,77','6,70 − 0,77')} = ${fr('0,43','5,93')} = <b>7,3%</b>`},
  {t:'Perlita é todo o resto:', f:`%perlita = 100 − 7,3 = <b>92,7%</b>`},
  {t:'Cementita TOTAL (a pró mais a que está dentro da perlita) sai de uma alavanca entre ferrita e cementita:', f:`%Fe₃C<sub>total</sub> = ${fr('C₀ − 0,022','6,70 − 0,022')} = ${fr('1,178','6,678')} = <b>17,6%</b>`}
 ],
 resp:'7,3% de cementita pró-eutetoide, 92,7% de perlita e 17,6% de cementita total',
 erro:'Confundir cementita pró-eutetoide com cementita total. São duas alavancas diferentes: a primeira tem 0,77 no denominador, a segunda tem 0,022.'},

{mod:'v1m1', t:'Difusão com Arrhenius — profundidade de descarbonetação',
 orig:'Cesgranrio 2014, Q30 (gabarito oficial: B)',
 en:'Um aço tratado por 1 hora a 600 °C teve 0,223 mm de descarbonetação, com x² = γ·D·t. Sendo Q = 99.500 J/mol e R = 8,314 J/mol·K, qual a profundidade se o tratamento for a 700 °C, também por 1 hora?',
 dados:['x₁ = 0,223 mm a T₁ = 600 °C = 873 K','T₂ = 700 °C = 973 K','Q = 99.500 J/mol · R = 8,314 J/mol·K','mesmo tempo t nos dois casos'],
 passos:[
  {t:'O coeficiente de difusão segue Arrhenius. Escreva para as duas temperaturas:', f:`D = D₀ · e<sup>−Q/RT</sup>`},
  {t:'Divida uma pela outra — o D₀ some, que é justamente por isso que a banca não te dá esse valor:', f:`${fr('D₂','D₁')} = e<sup>−Q/RT₂</sup> ÷ e<sup>−Q/RT₁</sup> = exp[ ${fr('Q','R')} ( ${fr('1','T₁')} − ${fr('1','T₂')} ) ]`},
  {t:'Calcule cada pedaço. Primeiro a razão Q/R:', f:`${fr('Q','R')} = ${fr('99.500','8,314')} = 11.968 K`},
  {t:'Agora a diferença dos inversos das temperaturas (em kelvin!):', f:`${fr('1','873')} − ${fr('1','973')} = 0,0011455 − 0,0010277 = 1,178 × 10<sup>−4</sup>`},
  {t:'Multiplique e exponencie:', f:`${fr('D₂','D₁')} = e<sup>11.968 × 1,178×10⁻⁴</sup> = e<sup>1,410</sup> = 4,09`},
  {t:'Como x² = γ·D·t e o tempo é o mesmo, a profundidade cresce com a raiz da razão dos D:', f:`${fr('x₂','x₁')} = ${rz(`${fr('D₂','D₁')}`)} = ${rz('4,09')} = 2,02`},
  {t:'Finalmente:', f:`x₂ = 0,223 × 2,02 = <b>0,45 mm</b>`}
 ],
 resp:'Letra B — 0,45 mm',
 erro:'Três armadilhas: usar °C em vez de kelvin (erro fatal), esquecer a raiz quadrada no último passo (daria 0,91 mm) e escorregar na unidade — os distratores 4,5 mm e 45 µm existem só para pegar erro de fator 10.'},

{mod:'v1m1', t:'Densidade teórica a partir da estrutura cristalina',
 orig:'Cesgranrio 2012, Q21',
 en:'Calcule a massa específica teórica do ferro-α (CCC), sabendo que o parâmetro de rede é a = 0,287 nm, a massa atômica é 55,85 g/mol e N_A = 6,022 × 10²³ átomos/mol.',
 dados:['Estrutura CCC → n = 2 átomos por célula','a = 0,287 nm = 2,87 × 10⁻⁸ cm','A = 55,85 g/mol'],
 passos:[
  {t:'A densidade é massa dos átomos da célula dividida pelo volume da célula:', f:`ρ = ${fr('n · A','V<sub>C</sub> · N<sub>A</sub>')}`},
  {t:'Conte os átomos da CCC: 8 vértices valendo 1/8 cada, mais 1 inteiro no centro.', f:`n = 8 × ${fr('1','8')} + 1 = <b>2 átomos</b>`},
  {t:'Calcule o volume da célula, já em cm³ para casar com g/mol:', f:`V<sub>C</sub> = a³ = (2,87 × 10<sup>−8</sup>)³ = 2,364 × 10<sup>−23</sup> cm³`},
  {t:'Substitua tudo:', f:`ρ = ${fr('2 × 55,85','2,364 × 10<sup>−23</sup> × 6,022 × 10<sup>23</sup>')} = ${fr('111,7','14,24')}`},
  {t:'Resultado:', f:`ρ = <b>7,84 g/cm³</b> — coerente com o valor real do ferro (≈ 7,87)`}
 ],
 resp:'≈ 7,84 g/cm³',
 erro:'Trocar n por 1 (esquecendo o átomo do centro) ou deixar o parâmetro em nanômetros. Passe sempre para centímetro antes de elevar ao cubo: 1 nm = 10⁻⁷ cm.'},

{mod:'v1m1', t:'Fator de empacotamento da CFC',
 orig:'Conceito cobrado direta e indiretamente em todas as provas',
 en:'Demonstre que o fator de empacotamento atômico (FEA) da estrutura CFC vale 0,74.',
 dados:['CFC tem n = 4 átomos por célula','Na CFC os átomos se tocam ao longo da DIAGONAL DA FACE'],
 passos:[
  {t:'O FEA é a fração do volume da célula efetivamente ocupada por átomos:', f:`FEA = ${fr('n · V<sub>átomo</sub>','V<sub>célula</sub>')} = ${fr(`4 · ${fr('4','3')}πR³`,'a³')}`},
  {t:'Ache a relação entre a e R. Na diagonal da face cabem 4 raios:', f:`4R = a·${rz('2')} &nbsp;→&nbsp; a = ${fr('4R', rz('2'))} = 2R·${rz('2')}`},
  {t:'Eleve ao cubo para achar o volume da célula:', f:`a³ = (2R·${rz('2')})³ = 16R³·${rz('2')}`},
  {t:'Substitua na expressão do FEA:', f:`FEA = ${fr(fr('16','3')+'·πR³', '16R³·'+rz('2'))} = ${fr('π','3·'+rz('2'))}`},
  {t:'Calcule:', f:`FEA = ${fr('3,1416','4,2426')} = <b>0,74</b>`}
 ],
 resp:'FEA = 0,74 (74% do volume ocupado)',
 erro:'Na CCC o contato é pela diagonal do CUBO (4R = a√3), o que dá 0,68. Trocar a diagonal da face pela do cubo é o erro clássico.'},

{mod:'v2m5', t:'Tensão, deformação e coeficiente de Poisson',
 orig:'Cesgranrio 2018, Q55 (estilo)',
 en:'Uma barra de aço de 20 mm de diâmetro e 2 m de comprimento é tracionada por uma força de 100 kN. Sendo E = 200 GPa e ν = 0,30, calcule a tensão, o alongamento e a redução do diâmetro.',
 dados:['F = 100 kN = 100.000 N','d = 20 mm → A = πd²/4','L₀ = 2 m = 2000 mm','E = 200 GPa = 200.000 MPa · ν = 0,30'],
 passos:[
  {t:'Área da seção transversal:', f:`A = ${fr('πd²','4')} = ${fr('π × 20²','4')} = 314,16 mm²`},
  {t:'Tensão normal:', f:`σ = ${fr('F','A')} = ${fr('100.000','314,16')} = <b>318,3 MPa</b>`},
  {t:'Deformação pela lei de Hooke:', f:`ε = ${fr('σ','E')} = ${fr('318,3','200.000')} = 1,592 × 10<sup>−3</sup>`},
  {t:'Alongamento total:', f:`ΔL = ε · L₀ = 1,592 × 10<sup>−3</sup> × 2000 = <b>3,18 mm</b>`},
  {t:'Deformação lateral pelo Poisson (o sinal negativo indica contração):', f:`ε<sub>lat</sub> = −ν · ε = −0,30 × 1,592 × 10<sup>−3</sup> = −4,78 × 10<sup>−4</sup>`},
  {t:'Redução do diâmetro:', f:`Δd = ε<sub>lat</sub> · d = −4,78 × 10<sup>−4</sup> × 20 = <b>−0,0096 mm</b>`}
 ],
 resp:'σ = 318,3 MPa · ΔL = 3,18 mm · Δd = −0,0096 mm (o diâmetro diminui)',
 erro:'Misturar unidades. Deixe tudo em N e mm, que a tensão sai direto em MPa. E lembre: 1 GPa = 1000 MPa.'},

{mod:'v2m2', t:'Pilha galvânica — quem corrói e qual a f.e.m.',
 orig:'Cesgranrio 2018, Q53 (gabarito: B)',
 en:'Numa junção entre zinco (E° = −0,76 V) e estanho (E° = −0,14 V) em meio aquoso, qual metal é o anodo e qual a diferença de potencial da pilha?',
 dados:['E°(Zn²⁺/Zn) = −0,76 V','E°(Sn²⁺/Sn) = −0,14 V'],
 passos:[
  {t:'Compare os potenciais de redução. O <b>menor</b> potencial é quem tem mais tendência a se oxidar:', f:`−0,76 V (Zn) < −0,14 V (Sn)`},
  {t:'Logo, o zinco é o <b>anodo</b> (oxida, corrói) e o estanho é o <b>catodo</b> (protegido).', f:`Zn → Zn²⁺ + 2e⁻ &nbsp;&nbsp;(anodo)`},
  {t:'A f.e.m. da pilha é a diferença entre catodo e anodo:', f:`ΔE = E<sub>catodo</sub> − E<sub>anodo</sub> = (−0,14) − (−0,76)`},
  {t:'Cuidado com o sinal na subtração de números negativos:', f:`ΔE = −0,14 + 0,76 = <b>+0,62 V</b>`}
 ],
 resp:'O zinco é o anodo e corrói; a pilha tem 0,62 V. É exatamente o princípio da galvanização.',
 erro:'Errar o sinal ao subtrair negativos, e inverter anodo com catodo. Mnemônico: "o Mais Negativo Morre". Por isso o zinco protege o aço mesmo com o revestimento arranhado — e o estanho, ao contrário, ACELERA a corrosão do aço se a lata for riscada.'},

{mod:'v3m2', t:'Schaeffler com diluição — onde a solda vai cair',
 orig:'Cesgranrio 2012, Q56',
 en:'Um inox austenítico (Cr_eq = 18; Ni_eq = 12) é soldado com eletrodo de Cr_eq = 24 e Ni_eq = 13, com diluição de 30%. Determine a composição equivalente da zona fundida.',
 dados:['Metal de base: Cr_eq = 18 · Ni_eq = 12','Metal de adição: Cr_eq = 24 · Ni_eq = 13','Diluição = 30% (fração de metal de base na poça)'],
 passos:[
  {t:'Diluição é a fração do metal de BASE que entra na poça de fusão. O resto (70%) é metal de adição.', f:`d = 0,30 → base = 30% · adição = 70%`},
  {t:'A composição da zona fundida é a média ponderada — ou seja, o ponto cai na reta entre MB e MA:', f:`Cr<sub>ZF</sub> = Cr<sub>MA</sub> + (Cr<sub>MB</sub> − Cr<sub>MA</sub>) × d`},
  {t:'Substituindo o cromo:', f:`Cr<sub>ZF</sub> = 24 + (18 − 24) × 0,30 = 24 − 1,8 = <b>22,2</b>`},
  {t:'E o níquel:', f:`Ni<sub>ZF</sub> = 13 + (12 − 13) × 0,30 = 13 − 0,3 = <b>12,7</b>`},
  {t:'Leve o par (22,2 ; 12,7) ao diagrama: cai na região <b>austenita + ferrita</b>, com aproximadamente 5 a 10% de ferrita delta — que é justamente o alvo desejado.', f:''}
 ],
 resp:'Cr_eq = 22,2 e Ni_eq = 12,7 → austenita com ~5-10% de ferrita δ',
 erro:'Inverter a diluição, partindo do metal de base em vez do de adição. Ancore sempre no metal de ADIÇÃO e caminhe a fração da diluição na direção do metal de base. Essa faixa de 5-10% de ferrita não é capricho: sem ela, a solda austenítica trinca a quente.'}
];
