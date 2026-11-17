/* =====================================================================
   BACKUP E EXPORTAÇÃO
   ===================================================================== */
function baixar(nome, conteudo, tipo){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([conteudo], {type:tipo}));
  a.download = nome; a.click();
}
function exportar(){
  baixar(`backup-obras-${hoje()}.json`, JSON.stringify(DB,null,1), 'application/json');
  localStorage.setItem(CHAVE+'_ultimo_backup', hoje());
}
function importar(inp){
  const arq = inp.files[0]; if (!arq) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(rd.result);
      if (!confirm('Restaurar este backup? Os dados atuais serão substituídos.')) return;
      DB = d; for (const t in TABELAS) DB[t] = DB[t] || [];
      salvar(); tela='painel'; render(); alert('Backup restaurado com sucesso!');
    } catch(e){ alert('Arquivo inválido.'); }
    inp.value='';
  };
  rd.readAsText(arq);
}
function exportarCSV(t){
  const T = TABELAS[t];
  const campos = T.campos.filter(c => c.tipo!=='itens');
  const linhas = [campos.map(c=>c.l)];
  DB[t].forEach(r => linhas.push(campos.map(c => {
    let v = r[c.k] ?? '';
    if (c.tipo==='ref') v = (buscar(c.ref,v)||{}).nome || '';
    if (c.tipo==='data') v = dataBR(v);
    if (c.tipo==='dinheiro' && v!=='') v = String(v).replace('.',',');
    return '"'+String(v).replace(/"/g,'""')+'"';
  })));
  baixar(`${t}-${hoje()}.csv`, '﻿'+linhas.map(l=>l.join(';')).join('\r\n'), 'text/csv;charset=utf-8');
}

/* lembrete de backup semanal */
(function(){
  const ult = localStorage.getItem(CHAVE+'_ultimo_backup');
  const temDados = Object.keys(TABELAS).some(t => DB[t].length);
  if (temDados && (!ult || (new Date()-new Date(ult)) > 7*864e5))
    setTimeout(()=>{ if(confirm('Faz mais de 7 dias sem backup. Deseja salvar uma cópia de segurança agora?')) exportar(); }, 800);
})();
