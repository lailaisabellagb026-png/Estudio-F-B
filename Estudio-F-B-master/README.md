# Estúdio de Beleza F&B — agendamento online

Site de agendamento do estúdio de cabeleireiro, com painel para agenda, serviços, horários e financeiro.

- **Clientes:** página inicial (`/`), agendar (`/agendar`) e ver ou cancelar horário (`/meu-horario`).
- **Estúdio:** painel em `/admin`. Não tem senha: quem tiver o endereço consegue abrir, então não divulgue o link (ele não aparece no site e o Google é orientado a não listar).
- **WhatsApp do estúdio (CallMeBot):** aviso de novo agendamento, de cancelamento, lembrete na véspera e "daqui a pouco" (até 1h30 antes).
- **Banco:** Firestore do projeto `estudio-flavio-barbosa`. O site só acessa o banco pelo servidor (Firebase Admin), e as regras do Firestore bloqueiam qualquer acesso direto pelo navegador (ver `firestore.rules`).

## Variáveis de ambiente

Na Vercel: **Settings → Environment Variables**. Depois de cadastrar ou mudar, faça **Redeploy**.

| Nome | O que colocar |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | O **conteúdo inteiro** do arquivo `.json` da conta de serviço do Firebase (abra no Bloco de Notas, copie tudo e cole). |
| `CALLMEBOT_APIKEY` | A chave que o CallMeBot manda no WhatsApp (passo a passo abaixo). |
| `CRON_SECRET` | Um texto aleatório longo. O cron-job.org usa para chamar os lembretes. |
| `CALLMEBOT_PHONE` | Opcional. Outro número para receber os avisos. Padrão: `5511996923040`. |
| `SITE_URL` | Opcional. Só se usar domínio próprio, ex.: `https://estudiofb.com.br`. |

Nunca coloque o arquivo `.json` da conta de serviço dentro do projeto nem no GitHub. O `.gitignore` já bloqueia `.env*` e arquivos `*firebase-adminsdk*.json`.

## Subir na Vercel

1. Crie um repositório no GitHub e envie esta pasta.
2. Na Vercel: **Add New → Project → Import** o repositório. O framework (Next.js) é detectado sozinho.
3. Antes de clicar em Deploy, abra **Environment Variables** e cadastre as variáveis acima.
4. Depois do deploy, teste: página inicial, um agendamento, `/meu-horario` e o painel em `/admin`.

Sem `CALLMEBOT_APIKEY` o site funciona normalmente; só os avisos no WhatsApp ficam desligados.

## Ativar os avisos no WhatsApp (CallMeBot)

1. No celular com o WhatsApp **11 99692-3040**, salve o contato **+34 644 99 26 98** (número atual do CallMeBot; se não responder, confira em callmebot.com).
2. Envie para ele a mensagem: `I allow callmebot to send me messages`
3. Você recebe a **apikey**. Cadastre em `CALLMEBOT_APIKEY` na Vercel e faça Redeploy.

O CallMeBot gratuito só manda mensagens para o próprio número que ativou a chave. Por isso os avisos vão para o estúdio; cada aviso traz um link pronto para abrir a conversa com a cliente e confirmar ou lembrar o horário.

## Lembretes automáticos (cron-job.org)

Configure depois que o site estiver no ar:

1. Em cron-job.org, crie um cronjob com a URL `https://SEU-SITE.vercel.app/api/cron/lembretes`.
2. Em **Advanced → Headers**, adicione `Authorization` com o valor `Bearer SEU_CRON_SECRET`.
   (Alternativa: usar a URL `.../api/cron/lembretes?chave=SEU_CRON_SECRET`.)
3. Frequência: **a cada 30 minutos**.

O cron também marca como concluídos os horários de dias anteriores que ficaram em aberto, para o financeiro não ficar vazio.

## Regras do Firestore

Firebase Console → Firestore Database → **Regras** → cole o conteúdo de `firestore.rules` → **Publicar**.
No projeto `estudio-flavio-barbosa` as regras já estão assim (modo produção, tudo bloqueado).

## Personalizar

- **WhatsApp de contato, endereço, link do mapa e Instagram:** `lib/estudio.ts`.
- **Serviços, preços, durações, expediente, folgas e feriados:** pelo painel, em `/admin/servicos`.
- **Cores e fontes:** `app/globals.css` (bloco `@theme`) e `app/layout.tsx`.
- **Logo:** `public/logo-estudio-fb.jpg`; ícone do navegador em `app/icon.png` e prévia de compartilhamento em `app/opengraph-image.jpg`.

## Rodar no computador

```bash
npm install
```

```bash
npm run dev
```

Abra http://localhost:3000. O `.env.local` já aponta para o arquivo da conta de serviço na pasta Downloads.

## O que fica no Firestore

| Coleção | Conteúdo |
| --- | --- |
| `agendamentos` | Cada horário marcado (cliente, serviços, valores, status). |
| `configuracoes/estudio` | Serviços e expediente salvos pelo painel. |
| `travas` | Um documento por dia, usado para impedir duas reservas no mesmo horário. |
