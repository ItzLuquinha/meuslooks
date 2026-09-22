# Envio de fotos por e-mail

O Meu Look usa o FormSubmit para encaminhar a foto editada para `rianbraga718@gmail.com`. Não é necessário criar conta no FormSubmit, configurar SMTP, guardar senha de e-mail ou usar uma API key no projeto.

## Primeira ativação

Na primeira foto enviada, o FormSubmit manda uma mensagem de confirmação para o endereço de destino. É uma ativação única do endpoint; depois de confirmada, os próximos envios são encaminhados normalmente. O FormSubmit documenta que não exige registro, mas exige essa confirmação inicial do endereço.

## Configuração

`.env.local` pode conter apenas:

```env
PHOTO_EMAIL_TO=rianbraga718@gmail.com
```

O envio é feito server-side pela rota `/api/photo-email`, que valida a sessão da usuária, o tipo e o tamanho da imagem antes de encaminhá-la. A foto editada é enviada como anexo.

O projeto não usa mais Nodemailer, SMTP, senha de app ou credenciais do Gmail.
