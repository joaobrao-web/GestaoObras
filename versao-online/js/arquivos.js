/* =====================================================================
   ARQUIVOS (versão online) — o conteúdo dos anexos fica na nuvem, na
   coleção "arquivos" do Firestore, dividido em partes de até 700 KB
   (cada documento do Firestore aceita no máximo 1 MB).
   Só é baixado quando alguém abre o anexo.
   ===================================================================== */
const PARTE_ARQ = 700 * 1024;
const refParte = (id, i) => fs.collection('arquivos').doc(id + '_' + i);

async function guardarArquivo(id, blob){
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const n = Math.max(1, Math.ceil(bytes.length / PARTE_ARQ));
  for (let i = 0; i < n; i++)
    await refParte(id, i).set({dados: firebase.firestore.Blob.fromUint8Array(bytes.slice(i*PARTE_ARQ, (i+1)*PARTE_ARQ)), parte: i, total: n});
  return n;
}
async function lerArquivo(a){
  const docs = await Promise.all(Array.from({length: a.partes || 1}, (_, i) => refParte(a.id, i).get()));
  if (docs.some(d => !d.exists)) throw new Error('o arquivo não foi encontrado na nuvem');
  return new Blob(docs.map(d => d.data().dados.toUint8Array()), {type: a.tipo || ''});
}
function apagarArquivo(a){
  return Promise.all(Array.from({length: a.partes || 1}, (_, i) => refParte(a.id, i).delete())).catch(() => {});
}
