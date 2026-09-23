# Envio de fotos por e-mail

O Meu Look envia a foto editada pelo endpoint `/api/photo-email`. O destinatário e a URL do FormSubmit ficam somente no servidor.

O servidor procura o destinatário nesta ordem:

1. `PHOTO_EMAIL_TO`
2. `ADMIN_EMAIL`
3. o e-mail do primeiro perfil `admin` ativo em `public.profiles`

Assim, mesmo que `PHOTO_EMAIL_TO` não esteja configurado, o envio pode usar o administrador cadastrado no Supabase.

Para a Vercel, recomenda-se configurar:

```env
PHOTO_EMAIL_TO=seu-endereco-de-destino@example.com
```

ou usar o `ADMIN_EMAIL` já configurado para o acesso administrativo. Não coloque o endereço de destino, a URL personalizada do FormSubmit, senha de e-mail, senha de app, SMTP ou segredo de e-mail em componentes React ou em variáveis públicas do navegador.

A câmera envia `multipart/form-data` para `/api/photo-email` contendo a foto final, o filtro, os ajustes e metadados simples. O navegador reduz/comprime a imagem para ficar abaixo de 3,8 MB antes do envio. O servidor aplica limite de tempo de 15 segundos ao serviço externo para evitar carregamentos presos.
