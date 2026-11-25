/* =====================================================================
   CONFIGURAÇÃO — para mudar campos, status ou categorias, edite aqui.
   ===================================================================== */
const STATUS_OBRA = ['Orçamento','Em andamento','Pausada','Concluída'];
const STATUS_PROPOSTA = ['Rascunho','Enviada','Aprovada','Recusada'];
const STATUS_CONTRATO = ['Em elaboração','Aguardando assinatura','Em vigor','Encerrado','Cancelado'];
const CATEGORIAS  = ['Fornecedor','Cliente','Prestador de serviço','Funcionário'];
const CAT_TABELA  = {'Fornecedor':'fornecedores','Cliente':'clientes','Prestador de serviço':'prestadores','Funcionário':'funcionarios'};   // de onde vêm as sugestões de nome
const STATUS_AGENDA = ['Agendado','Concluído','Cancelado'];
/* tipos de compromisso e a cor de cada um no calendário */
const TIPOS_AGENDA = {'Visita técnica':'#22d3ee','Medição':'#a78bfa','Entrega de material':'#fbbf24','Reunião':'#3b82f6',
  'Início de obra':'#34d399','Vistoria':'#f472b6','Pagamento':'#f43f5e','Outro':'#94a3b8'};

const TABELAS = {
  agenda: { titulo:'Agenda', icone:'📅', singular:'compromisso', campos:[
    {k:'nome', l:'Título do compromisso', obrig:true, full:true},
    {k:'data', l:'Data', tipo:'data', obrig:true},
    {k:'tipo', l:'Tipo', tipo:'select', opcoes:Object.keys(TIPOS_AGENDA), obrig:true},
    {k:'hora', l:'Hora de início', tipo:'hora'},
    {k:'horaFim', l:'Hora de término', tipo:'hora'},
    {k:'obra', l:'Obra', tipo:'ref', ref:'obras'},
    {k:'cliente', l:'Cliente', tipo:'ref', ref:'clientes'},
    {k:'responsavel', l:'Responsável'},
    {k:'status', l:'Status', tipo:'select', opcoes:STATUS_AGENDA, obrig:true},
    {k:'local', l:'Local / Endereço', full:true},
    {k:'obs', l:'Observações', tipo:'texto', full:true},
  ], colunas:['data','hora','nome','tipo','obra','responsavel','status'],
  novo: () => ({tipo:'Visita técnica', status:'Agendado',
    responsavel: typeof USUARIO !== 'undefined' && USUARIO ? (USUARIO.displayName || USUARIO.email) : ''})},

  obras: { titulo:'Obras', icone:'🏠', singular:'obra', campos:[
    {k:'nome', l:'Nome da obra', obrig:true, full:true},
    {k:'cliente', l:'Cliente', tipo:'ref', ref:'clientes'},
    {k:'status', l:'Status', tipo:'select', opcoes:STATUS_OBRA},
    {k:'endereco', l:'Endereço', full:true},
    {k:'valor', l:'Valor do contrato (R$)', tipo:'dinheiro'},
    {k:'responsavel', l:'Responsável / Mestre de obras'},
    {k:'inicio', l:'Data de início', tipo:'data'},
    {k:'previsao', l:'Previsão de término', tipo:'data'},
    {k:'obs', l:'Observações', tipo:'texto', full:true},
  ], colunas:['nome','cliente','status','valor','inicio','previsao']},

  propostas: { titulo:'Propostas', icone:'📝', singular:'proposta', campos:[
    {k:'numero', l:'Nº da proposta'},
    {k:'data', l:'Data', tipo:'data', obrig:true},
    {k:'nome', l:'Título / Serviço proposto', obrig:true, full:true},
    {k:'cliente', l:'Cliente', tipo:'ref', ref:'clientes', obrig:true},
    {k:'status', l:'Status', tipo:'select', opcoes:STATUS_PROPOSTA, obrig:true},
    {k:'obra', l:'Obra vinculada', tipo:'ref', ref:'obras'},
    {k:'validade', l:'Válida até', tipo:'data'},
    {k:'itens', l:'Itens / Serviços', tipo:'itens', full:true},
    {k:'desconto', l:'Desconto (R$)', tipo:'dinheiro'},
    {k:'prazo', l:'Prazo de execução'},
    {k:'pagamento', l:'Condições de pagamento', full:true},
    {k:'obs', l:'Observações', tipo:'texto', full:true},
    {k:'total', l:'Valor total (R$)', tipo:'dinheiro', calc:true},
  ], colunas:['numero','data','nome','cliente','obra','status','total'],
  novo: () => {
    const ano = new Date().getFullYear();
    const seq = DB.propostas.filter(p => String(p.numero||'').startsWith(ano+'-')).length + 1;
    const val = new Date(Date.now()+15*864e5).toISOString().slice(0,10);
    return {numero:`${ano}-${String(seq).padStart(3,'0')}`, status:'Rascunho', validade:val,
            pagamento:'50% na aprovação e 50% na conclusão'};
  }},

  contratos: { titulo:'Contratos', icone:'📄', singular:'contrato', campos:[
    {k:'numero', l:'Nº do contrato'},
    {k:'data', l:'Data de assinatura', tipo:'data'},
    {k:'nome', l:'Objeto do contrato', obrig:true, full:true},
    {k:'cliente', l:'Cliente', tipo:'ref', ref:'clientes', obrig:true},
    {k:'status', l:'Status', tipo:'select', opcoes:STATUS_CONTRATO, obrig:true},
    {k:'obra', l:'Obra vinculada', tipo:'ref', ref:'obras'},
    {k:'proposta', l:'Proposta de origem', tipo:'ref', ref:'propostas'},
    {k:'valor', l:'Valor do contrato (R$)', tipo:'dinheiro'},
    {k:'inicio', l:'Início da vigência', tipo:'data'},
    {k:'termino', l:'Fim da vigência', tipo:'data'},
    {k:'pagamento', l:'Condições de pagamento', full:true},
    {k:'garantia', l:'Garantia'},
    {k:'arquivo', l:'Link do arquivo (PDF / Drive)'},
    {k:'obs', l:'Observações', tipo:'texto', full:true},
  ], colunas:['numero','data','nome','cliente','obra','status','valor'],
  novo: () => {
    const ano = new Date().getFullYear();
    const seq = DB.contratos.filter(c => String(c.numero||'').startsWith('CT-'+ano+'-')).length + 1;
    return {numero:`CT-${ano}-${String(seq).padStart(3,'0')}`, status:'Em elaboração', data:''};
  }},

  financeiro: { titulo:'Financeiro', icone:'💰', singular:'lançamento', campos:[
    {k:'data', l:'Data do pagamento', lc:'Pagamento', tipo:'data'},
    {k:'vencimento', l:'Vencimento', tipo:'data'},
    {k:'tipo', l:'Tipo', tipo:'select', opcoes:['Despesa','Receita'], obrig:true},
    {k:'favorecido', l:'Nome do beneficiário ou pagador', lc:'Beneficiário / Pagador', tipo:'pessoa', full:true, padrao: r => nomeLanc(r),
      lt:{Despesa:'Nome do beneficiário (para quem pagamos)', Receita:'Nome do pagador (quem nos pagou)'}},
    {k:'descricao', l:'Descrição', obrig:true, full:true},
    {k:'categoria', l:'Categoria', tipo:'select', opcoes:CATEGORIAS},
    {k:'pago', l:'Situação', tipo:'select', opcoes:['Pago','A pagar / A receber']},
    {k:'valor', l:'Valor (R$)', tipo:'dinheiro', obrig:true},
    {k:'obra', l:'Obra (opcional)', tipo:'ref', ref:'obras'},
    {k:'obs', l:'Observações', tipo:'texto', full:true},
  ], colunas:['data','vencimento','tipo','favorecido','descricao','categoria','pago','valor']},

  clientes: { titulo:'Clientes', icone:'👤', singular:'cliente', campos:[
    {k:'nome', l:'Nome', obrig:true, full:true},
    {k:'telefone', l:'Telefone'},
    {k:'email', l:'E-mail'},
    {k:'documento', l:'CPF / CNPJ'},
    {k:'endereco', l:'Endereço'},
    {k:'obs', l:'Observações', tipo:'texto', full:true},
  ], colunas:['nome','telefone','email','documento']},

  funcionarios: { titulo:'Funcionários', icone:'👷', singular:'funcionário', campos:[
    {k:'nome', l:'Nome', obrig:true, full:true},
    {k:'funcao', l:'Função'},
    {k:'telefone', l:'Telefone'},
    {k:'obra', l:'Obra atual', tipo:'ref', ref:'obras'},
    {k:'pagamento', l:'Diária / Salário (R$)', tipo:'dinheiro'},
    {k:'admissao', l:'Data de admissão', tipo:'data'},
    {k:'documento', l:'CPF'},
    {k:'obs', l:'Observações', tipo:'texto', full:true},
  ], colunas:['nome','funcao','telefone','obra','pagamento']},

  prestadores: { titulo:'Prestadores', icone:'🔧', singular:'prestador', campos:[
    {k:'nome', l:'Nome / Empresa', obrig:true, full:true},
    {k:'servico', l:'Serviço que presta', obrig:true},
    {k:'telefone', l:'Telefone / WhatsApp'},
    {k:'cobranca', l:'Forma de cobrança', tipo:'select', opcoes:['Diária','Empreitada','Por m²','Por hora','Por serviço']},
    {k:'valor', l:'Valor combinado (R$)', tipo:'dinheiro'},
    {k:'obra', l:'Obra atual', tipo:'ref', ref:'obras'},
    {k:'documento', l:'CPF / CNPJ'},
    {k:'pix', l:'Chave PIX'},
    {k:'banco', l:'Banco / Agência / Conta'},
    {k:'obs', l:'Observações', tipo:'texto', full:true},
  ], colunas:['nome','servico','telefone','obra','cobranca','valor']},

  fornecedores: { titulo:'Fornecedores', icone:'🚚', singular:'fornecedor', campos:[
    {k:'nome', l:'Nome / Empresa', obrig:true, full:true},
    {k:'produto', l:'O que fornece'},
    {k:'contato', l:'Pessoa de contato'},
    {k:'telefone', l:'Telefone'},
    {k:'email', l:'E-mail'},
    {k:'obs', l:'Observações', tipo:'texto', full:true},
  ], colunas:['nome','produto','contato','telefone']},
};
