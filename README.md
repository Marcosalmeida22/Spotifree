# Spotifree

Aplicación web de música del equipo Carlos García Díez-Madroñero, Juan Ignacio González de la Peña, Gabriel Peña Tamés y Marcos Almeida Álvarez.

**HTML + CSS + JavaScript · Node.js + Express · Python + Flask · MySQL · YouTube Data API v3 + IFrame Player API**

## Funciones

- Descubrimiento, filtros por género y búsqueda por título o artista.
- Reproductor visible de YouTube, canción actual y cola de reproducción.
- Registro e inicio de sesión con email y contraseña. La sesión se conserva durante 31 días.
- Favoritos y playlists privados de cada cuenta; añadir y quitar canciones.
- Panel de administrador: estadísticas, añadir/editar canciones y mostrar/ocultar entradas del catálogo.
- Interfaz adaptable a móvil, tablet y ordenador.

## Requisitos

- Node.js 20 o superior y npm.
- Python 3.13.
- MySQL 8.4 recomendado. Las pruebas locales también se han ejecutado con MariaDB 10.4 de XAMPP.
- Internet para miniaturas, tipografías, búsqueda remota y reproducción de YouTube.

## Instalación

Desde la carpeta del proyecto, en PowerShell:

```powershell
npm.cmd ci
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

En macOS/Linux usa `python3` para crear el entorno y `.venv/bin/python` para instalar las dependencias. Express detecta automáticamente el entorno `.venv`.

Edita `.env`: establece contraseñas propias para MySQL, una `SESSION_SECRET` aleatoria de al menos 32 caracteres y las credenciales iniciales de administrador (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, mínimo 10 caracteres). Nunca subas `.env` a GitHub. Si omites la clave de sesión, se genera una temporal y las sesiones caducan al reiniciar.

### Base de datos con Docker

Con Docker Desktop instalado y en marcha:

```powershell
docker compose up -d mysql
```

Espera a que MySQL esté preparado. La imagen crea la base y el usuario a partir de `.env`. Los datos se conservan en un volumen; cambiar las claves en `.env` no cambia las de un volumen ya inicializado.

### Base de datos ya instalada

Si ya tienes MySQL o XAMPP, inicia su servidor y crea una base y un usuario desde MySQL Workbench o phpMyAdmin. Ejemplo para ejecutar como administrador SQL, sustituyendo la contraseña:

```sql
CREATE DATABASE spotifree CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'spotifree'@'127.0.0.1' IDENTIFIED BY 'TU_CLAVE_PROPIA';
GRANT ALL PRIVILEGES ON spotifree.* TO 'spotifree'@'127.0.0.1';
```

Ajusta host, puerto, usuario y contraseña en `.env`. La aplicación crea sus tablas y carga ocho canciones iniciales automáticamente. No modifica otras bases de datos.

### Arrancar

```powershell
npm.cmd start
```

Abre **http://127.0.0.1:8000**. En Windows también puedes usar `Iniciar.bat`. Mantén la terminal abierta y pulsa Ctrl+C para detener la aplicación. Express inicia y detiene el proceso Python; no necesitas arrancarlo por separado.

## YouTube

1. Crea un proyecto en Google Cloud y habilita **YouTube Data API v3**.
2. Crea una clave y restríngela a esa API. Se usa únicamente desde Python.
3. Añádela a `YOUTUBE_API_KEY` en `.env` y reinicia la aplicación.

Sin clave, la búsqueda consulta el catálogo SQL. El reproductor oficial permite probar los vídeos disponibles sin esa clave. Las búsquedas remotas consumen cuota de Google. YouTube puede impedir la inserción de ciertos vídeos, mostrar anuncios o aplicar restricciones por región. Spotifree no descarga audio ni elimina anuncios. El vídeo permanece visible y los controles oficiales están disponibles.

Documentación: [YouTube Data API](https://developers.google.com/youtube/v3/docs/search/list), [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).

## Administración

Configura `ADMIN_EMAIL` y `ADMIN_PASSWORD` **antes del primer inicio**. Entra con esas credenciales y abre «Administración» en la barra lateral. El ID de vídeo es el valor de 11 caracteres de `v=` en un enlace de YouTube. Guardar una canción existente actualiza sus datos y la muestra en el catálogo. Ocultarla la retira del descubrimiento y la búsqueda local; las playlists que ya la contienen la conservan.

Al reiniciar no se sobrescribe la contraseña de una cuenta existente. El email configurado se promociona a administrador, por lo que `.env` debe estar bajo control del equipo.

## Pruebas

Con la base SQL configurada y arrancada:

```powershell
npm.cmd run check
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Las pruebas crean cuentas temporales y eliminan sus propios datos al acabar. Comprueban registro, login, cookies, CSRF, permisos de administrador, aislamiento entre usuarios, favoritos y playlists. Para verificar también Express, con la app arrancada, ejecuta `node tests/smoke.js`.

La reproducción real y la búsqueda remota deben verificarse en navegador con una clave del equipo. El repositorio incluye CI con MySQL 8.4 para ejecutar las pruebas al subir cambios.

## Estructura

| Archivo | Función |
| --- | --- |
| `server.js` | Express: archivos estáticos, límites de solicitudes y pasarela a Python |
| `app.py` | Flask: sesiones, permisos, catálogo, SQL y YouTube Data API |
| `schema.sql` | Tablas, relaciones y claves foráneas de MySQL |
| `static/` | Interfaz y YouTube IFrame Player API |
| `compose.yaml` | MySQL 8.4 para desarrollo |
| `tests/` | Pruebas de integración y comprobación de la pasarela |
| `docs/` | Propuesta, arquitectura y decisiones |

El servidor escucha solo en localhost. Es una entrega académica local: no incluye recuperación de contraseña, verificación de email, recomendaciones personalizadas ni despliegue público.
