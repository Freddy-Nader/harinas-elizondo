# Harinas Elizondo
Este prototipo fue creado desde cero a partir de los requerimientos de `PA_IS.pdf`. El GitHub de referencia no se ha copiado.

## Ejecutar (Mac / Windows)
1. Instala Node.js 18 o posterior.
2. Abre la carpeta en VS Code.
3. En la terminal ejecuta: `npm start` (o `node server.js`).
4. Abre `http://localhost:3000`.
5. Pulsa **Nuevo cliente**, registra uno, modifícalo e inactívalo.

Los datos se guardan automáticamente en `clientes.json`. No necesitas PostgreSQL para mostrar el avance funcional. La base de datos objetivo está diseñada en `docs/02_modelo_bd.sql`, pero aún no está conectada.

## Archivos
- `public/index.html`: pantalla funcional (frontend)
- `server.js`: API y guardado de clientes (backend)
- `docs/01_AVANCE_B1_B4.md`: documentación del avance, diagramas y diccionario inicial
- `docs/02_modelo_bd.sql`: diseño relacional inicial para PostgreSQL

**Importante:** prototipo académico, no apto para producción. Falta autenticación, roles, controles de seguridad adicionales y conexión SQL.
