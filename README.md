
# Middleware Open Message




## Deployment

Para setup del proyecto en local

```bash
  npm install
  npm install -g localtunnel
  npm install purecloud-platform-client-v2@latest
```
Además, es necesario crear un archivo llamado ```config.js``` y agregar las siguientes líneas, configurándolas con los valores correspondientes.
```
exports.clientId = '<CLIENT-ID>';
exports.clientSecret = '<SECRET-ID>';
```
Para iniciar el proyecto

```bash
  node .\app.js
```
Por último dirigirse a http://localhost:5500/ 