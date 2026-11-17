# Gestão de Obras — versão online (login com Google)

Esta pasta é a versão online do sistema. Os dados ficam na nuvem (Firebase/Firestore),
são compartilhados pela equipe e só entra quem fizer login com um e-mail do domínio da empresa.
O sistema original (na pasta acima) continua funcionando como antes.

## 1. Criar o projeto no Firebase (uma vez)
1. Acesse https://console.firebase.google.com e entre com a conta Google da empresa.
2. **Adicionar projeto** → nome, por exemplo: `sbtechwall-obras` (o Google Analytics pode ficar desativado).
3. Na página do projeto, clique no ícone **</>** (App da Web), dê um apelido e registre.
   Ele mostra um bloco `firebaseConfig = { apiKey: ..., ... }`.
   **Copie esses valores para `js/firebase-config.js`.**
4. No mesmo arquivo, troque `SEU-DOMINIO.com.br` pelo domínio dos e-mails da empresa.

## 2. Ativar o login com Google
Menu **Criação → Authentication → Começar → Sign-in method → Google → Ativar** → escolha o e-mail de suporte → Salvar.

## 3. Criar o banco de dados
Menu **Criação → Firestore Database → Criar banco de dados**
- Local: **southamerica-east1 (São Paulo)**
- Modo: **produção**

Depois, na aba **Regras**, apague o que estiver lá, cole o conteúdo do arquivo `firestore.rules`
e troque `SEU-DOMINIO[.]com[.]br` pelo seu domínio (os pontos ficam entre colchetes,
por exemplo `sbtechwall[.]com[.]br`). Clique em **Publicar**.

> As regras são o que protege os dados: sem login com e-mail da empresa, ninguém lê nem grava nada.

## 4. Publicar o site (no Ubuntu/WSL)
Abra o Ubuntu e rode, uma vez:
```bash
sudo apt install -y nodejs npm
npx firebase-tools login --no-localhost
```
(Ele mostra um link: abra no navegador, autorize e cole o código de volta no terminal.)

Para publicar (e sempre que mudar algo):
```bash
cd /mnt/c/Users/arnal/Documents/GestaoObras/versao-online
npx firebase-tools deploy --project ID-DO-SEU-PROJETO
```
O endereço do site aparece no final, por exemplo `https://sbtechwall-obras.web.app`.

## 5. Primeiro acesso
- Entre com o seu e-mail da empresa.
- Se este computador tiver dados do sistema antigo, o sistema pergunta se quer enviá-los para a nuvem.
  Também dá para usar **Restaurar backup** com um arquivo `backup-obras-....json` salvo pelo sistema antigo.
- **Salvar backup** continua funcionando e é recomendado de tempos em tempos.

## Observações
- Abrir o `index.html` direto do computador (duplo clique) não funciona para o login; use o endereço publicado.
- Várias pessoas podem usar ao mesmo tempo; as alterações aparecem para todos automaticamente.
- O plano gratuito do Firebase (Spark) é mais do que suficiente para uma equipe pequena.
