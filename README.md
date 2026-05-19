# 🌶️ Sistema de Pedidos — Temperos

Sistema web desenvolvido para gerenciamento de pedidos de temperos através de um carrinho de compras simples e direto.

O cliente seleciona os produtos desejados, define as quantidades e envia o pedido.
Após o envio, o sistema gera uma identificação única (UUID) que é enviada via WhatsApp.

No painel administrativo, o atendente utiliza essa UUID para localizar o pedido, visualizar os itens solicitados e gerar um PDF do orçamento para impressão.

---

## 🚀 Funcionalidades

* Carrinho de compras
* Seleção de produtos e quantidades
* Geração automática de UUID para pedidos
* Integração com WhatsApp
* Painel administrativo
* Busca de pedidos por UUID
* Geração de orçamento em PDF
* Interface responsiva
* Estrutura preparada para deploy na Vercel

---

## 🛠️ Tecnologias utilizadas

* Next.js
* React
* TypeScript
* TailwindCSS
* Node.js

---

## 📦 Instalação

Clone o projeto:

```bash
git clone https://github.com/wtfViniiz/jonilson.git
```

Entre na pasta:

```bash
cd jonilson
```

Instale as dependências:

```bash
npm install
```

Execute em ambiente de desenvolvimento:

```bash
npm run dev
```

---

## ⚙️ Build para produção

```bash
npm run build
```

---

## ☁️ Deploy

Projeto preparado para deploy utilizando:

* Vercel
* Supabase para persistência compartilhada de pedidos, saldo e histórico

Para configurar o Supabase:

1. Crie um projeto no Supabase
2. Rode o SQL em `supabase/schema.sql`
3. Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente

---

## 🔐 Fluxo do sistema

1. Cliente seleciona os produtos
2. Define as quantidades
3. Finaliza o pedido
4. Sistema gera uma UUID única
5. UUID é enviada via WhatsApp
6. Administrador acessa o painel
7. Cola a UUID do pedido
8. Sistema gera o orçamento em PDF

---

## 📄 Licença

Projeto privado desenvolvido sob demanda para cliente.
