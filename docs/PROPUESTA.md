# Propuesta del proyecto: Spotifree

## Información general

**Equipo:** Carlos García Díez-Madroñero, Juan Ignacio González de la Peña, Gabriel Peña Tamés y Marcos Almeida Álvarez.

**Repositorio:** https://github.com/Marcosalmeida22/Spotifree.git

El equipo propone facilitar una alternativa gratuita para escuchar música en ordenadores, motivada por el coste de las suscripciones de servicios musicales. El producto ofrece una interfaz accesible y utiliza los servicios oficiales de YouTube para reproducir contenido disponible.

## Objetivos

1. Escuchar música gratis con una interfaz accesible.
2. Proporcionar un panel de administración para añadir música y controlar el catálogo.
3. Desarrollar y documentar una aplicación funcional, sus decisiones y su evolución en GitHub.

## Alcance y tecnología

| Requisito | Implementación |
| --- | --- |
| Canciones con información y reproducción | Catálogo y reproductor oficial visible de YouTube |
| Búsqueda por artista o título | YouTube Data API v3, con búsqueda local cuando no hay clave |
| Cuenta con email | Registro, login y sesión persistente |
| Administración | Rol admin, estadísticas, altas, edición y visibilidad |
| Frontend | HTML, CSS y JavaScript |
| Infraestructura | Node.js y Express |
| Backend adicional solicitado | Python y Flask |
| Persistencia | MySQL, tablas relacionadas y consultas parametrizadas |
| Gestión del proyecto | GitHub |

Se añaden favoritos y playlists por cuenta para dar utilidad a la biblioteca personal. No se implementa un algoritmo de recomendaciones; la selección de inicio es editorial. Tampoco se incluyen comercialización, recuperación de contraseñas ni verificación por email.

Aunque no se busca seguridad de producción, el proyecto aplica hash de contraseñas, permisos de administrador, consultas parametrizadas, protección CSRF y aislamiento de datos entre cuentas.

## Riesgos y mitigación

- **Primera experiencia con APIs:** separar búsqueda y reproducción, consultar documentación oficial y mostrar errores comprensibles.
- **Cuota o clave de YouTube:** mantener una selección local para desarrollo; la clave permanece en el servidor.
- **Vídeos restringidos:** mostrar aviso y permitir elegir otra canción; no extraer audio ni evitar restricciones.
- **Combinación de Node.js y Python:** definir una sola entrada pública en Express y una API interna con responsabilidades claras.
- **Dependencia SQL:** proporcionar configuración Docker y pruebas de integración. La instalación local se ha comprobado con MariaDB de XAMPP; CI usa MySQL 8.4.

## Estado de la entrega

Código implementado para catálogo, reproducción, búsqueda, cuentas, favoritos, playlists y administración. Las pruebas de integración se ejecutan con una base SQL real. La comprobación de reproducción en navegador y de búsqueda remota queda pendiente de una clave API del equipo y acceso al navegador.
