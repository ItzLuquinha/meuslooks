# Envio de fotos por e-mail

O Meu Look envia a foto editada pelo endpoint `/api/photo-email`. O destinatário e a URL do FormSubmit ficam somente no servidor.

Configure no ambiente da Vercel e no ambiente local:

```env
PHOTO_EMAIL_TO=seu-endereco-de-destino@example.com
```

Não coloque o endereço de destino, a URL personalizada do FormSubmit, senha de e-mail, senha de app, SMTP ou segredo de e-mail em componentes React ou em variáveis públicas do navegador.

A câmera envia `multipart/form-data` para `/api/photo-email` contendo a foto final, o filtro, os ajustes e metadados simples. O navegador reduz/comprime a imagem para ficar abaixo de 3,8 MB antes do envio.
