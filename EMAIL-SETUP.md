# Envio de fotos por e-mail

O Meu Look usa o FormSubmit para encaminhar a foto editada para `rianbraga718@gmail.com` sem SMTP, senha de e-mail, API key ou conta de e-mail configurada no projeto.

O envio da câmera usa um formulário HTML `multipart/form-data` nativo dentro de um iframe oculto. Isso é importante porque o fluxo documentado pelo FormSubmit para anexos é o formulário HTML normal; o endpoint AJAX documentado é voltado a dados JSON.

Na primeira utilização, o FormSubmit pode pedir uma confirmação única do endereço de destino. Depois da ativação, os envios podem seguir normalmente.

A foto final é redimensionada/comprimida no navegador antes do envio e o projeto limita o arquivo final para permanecer abaixo de 3,8 MB. O FormSubmit documenta limite de até 10 MB para a soma dos anexos.

Não coloque senha do Gmail, senha de app, SMTP ou secret de e-mail no projeto.
