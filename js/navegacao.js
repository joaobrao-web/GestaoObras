/* =====================================================================
   NAVEGAÇÃO
   ===================================================================== */
let tela = 'painel';
const filtros = {};
function menu(){
  const itens = [['painel','📊','Painel'], ...Object.entries(TABELAS).map(([k,t]) => [k,t.icone,t.titulo])];
  document.getElementById('nav').innerHTML = itens.map(([k,i,n]) =>
    `<button class="nav ${tela===k||tela.startsWith(k.replace(/s$/,'')+':')?'active':''}" onclick="ir('${k}')">${i}&nbsp; ${n}</button>`).join('');
}
function ir(t){ tela = t; render(); window.scrollTo(0,0); }
function render(){
  menu();
  document.getElementById('main').innerHTML = tela === 'painel' ? painel()
    : tela === 'agenda' ? agenda()
    : tela.startsWith('obra:') ? detalheObra(tela.slice(5))
    : tela.startsWith('proposta:') ? verProposta(tela.slice(9)) : lista(tela);
}
