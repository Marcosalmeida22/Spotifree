##    Estructura

```text
Spotifree/
├── README.md                  # Instalación, configuración y uso
├── ESTRUCTURA.md              # Esta guía de carpetas y archivos
├── Iniciar.bat                # Arranque de la aplicación en Windows
├── server.js                  # Servidor web Node.js + Express
├── app.py                     # API y lógica de negocio Python + Flask
├── schema.sql                 # Tablas y relaciones de MySQL
├── package.json               # Dependencias y comandos de Node.js
├── package-lock.json          # Versiones concretas de dependencias Node.js
├── requirements.txt           # Dependencias de Python
├── .env.example               # Plantilla de configuración sin claves reales
├── .env                       # Configuración privada de este ordenador
├── .gitignore                 # Archivos que Git debe ignorar
│
├── static/                    # Interfaz que recibe el navegador
│   ├── index.html             # Estructura de la página y formularios
│   ├── style.css              # Diseño general y adaptación a pantallas
│   ├── account.css            # Estilos de cuentas y administración
│   └── app.js                 # Interacciones, llamadas a la API y reproductor
│
├── docs/                      # Documentación del proyecto
│   ├── PROPUESTA.md           # Equipo, objetivos, alcance y tecnologías
│   ├── ARQUITECTURA.md        # Comunicación entre componentes y modelo de datos
│   └── VERIFICACION.md        # Pruebas realizadas y límites de verificación
│
├── tests/                     # Pruebas del funcionamiento
│   ├── test_api.py            # Cuentas, permisos, biblioteca y búsqueda
│   └── smoke.js               # Comprobación de Express, Python y SQL juntos
│
├── tools/                     # Ayudas para el entorno local de desarrollo
│   ├── configure_local.py     # Configura la instancia SQL aislada del puerto 3307
│   └── start-local-db.ps1     # Arranca esa instancia local si está preparada
│
└── .github/
    └── workflows/
        └── ci.yml             # Configuración de pruebas automáticas en GitHub
```

## Cómo se conectan las partes

```text
Navegador: HTML + CSS + JavaScript
                  |
                  v
Node.js + Express: server.js (puerto 8000)
                  |
                  v
Python + Flask: app.py (puerto interno 8001)
                  |
                  +----> MySQL: usuarios, canciones, favoritos y playlists
                  |
                  +----> YouTube Data API v3: búsqueda de canciones

Navegador ----> YouTube IFrame Player API: reproducción del vídeo
```
