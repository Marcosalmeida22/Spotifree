# Verificación de esta entrega

Comprobaciones ejecutadas el 19 de octubre de 2026:

- `npm ci` / instalación de dependencias: sin vulnerabilidades reportadas en la instalación inicial.
- `npm run check`: sintaxis JavaScript del servidor y del frontend correcta.
- Cinco pruebas de integración con Python 3.13 y MariaDB 10.4.32 de XAMPP en una instancia aislada, puerto 3307: correctas.
- `node tests/smoke.js`: correcto; valida HTML, Express → Python → SQL, cookies, validación de datos y CSRF.
- Captura de interfaz en Chrome headless a 1440 × 1100: revisada.

Las pruebas de integración cubren registro, inicio y cierre de sesión, cookies, acceso administrativo, CSRF, separación de cuentas, favoritos, playlists, visibilidad de catálogo, respuestas de búsqueda de YouTube simuladas y fallos de conexión a esa API.

No se ha verificado la reproducción audiovisual real ni una búsqueda contra YouTube Data API con credenciales del equipo. Las respuestas de YouTube en las pruebas se simulan. La ejecución contra MySQL 8.4 está configurada en GitHub Actions y su resultado debe consultarse después de subir el código. MariaDB local permite comprobar SQL compatible, pero no sustituye esa comprobación de MySQL.

La aplicación no está desplegada públicamente. Las credenciales, datos SQL, entorno Python, dependencias instaladas y perfiles del navegador quedan fuera del repositorio.
