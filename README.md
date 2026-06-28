# Filadélfia Louvor — app do grupo

App de repertório, escala, devocional e edificação do grupo de louvor.
Esta é a **primeira versão conectada**: login real + Repertório salvando no
Supabase, em tempo real. As outras telas entram nas próximas etapas.

---

## O que você vai precisar (tudo grátis, login pelo Google)

- Conta no **Supabase** (já criada — o banco já está montado)
- Conta no **GitHub** (guarda este código)
- Conta na **Vercel** (hospeda o app e te dá o link)

---

## Passo A — Pegar as 2 chaves do Supabase

1. No Supabase, abra seu projeto.
2. Vá em **Project Settings** (engrenagem) > **API**.
3. Anote dois valores:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **anon public** key (uma chave longa). Essa é pública, pode usar no app.
   *(NÃO use a chave "service_role" — essa é secreta.)*

## Passo B — Desligar a confirmação de e-mail (pra facilitar o teste)

1. No Supabase: **Authentication** > **Sign In / Providers** > **Email**.
2. Desative a opção **Confirm email** e salve.
   *(Assim você entra direto ao criar a conta, sem esperar e-mail.)*

## Passo C — Subir o código no GitHub

1. Em **github.com**, clique em **New repository**.
2. Nome: `louvor-app`. Pode deixar privado. Clique em **Create repository**.
3. Na página seguinte, clique em **uploading an existing file**.
4. Arraste **todos os arquivos e pastas de dentro** da pasta `louvor-app`
   (o `package.json`, o `index.html`, a pasta `src`, etc.).
5. Clique em **Commit changes**.

## Passo D — Publicar na Vercel

1. Em **vercel.com**, entre com o **GitHub**.
2. **Add New** > **Project** > importe o repositório `louvor-app`.
3. A Vercel detecta sozinha que é **Vite**. Não mude nada.
4. Abra **Environment Variables** e adicione as duas:
   - `VITE_SUPABASE_URL`  →  a Project URL do Passo A
   - `VITE_SUPABASE_ANON_KEY`  →  a chave anon public do Passo A
5. Clique em **Deploy** e espere ~1 minuto.
6. Pronto: a Vercel te dá um link `https://louvor-app-....vercel.app`.

## Passo E — Virar admin

1. Abra o link, clique em **Criar conta**, coloque seu nome, e-mail e senha.
2. Volte ao Supabase > **SQL Editor** e rode (troque pelo seu e-mail):

   ```sql
   update membros set papel = 'admin'
   where id = (select id from auth.users where email = 'SEU-EMAIL');
   ```

3. Saia e entre de novo no app. Agora você é **admin** e verá o botão
   **"Novo"** para cadastrar louvores.

---

## Como rodar no seu PC (opcional, só se tiver Node instalado)

```bash
npm install
# crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```
