# Control de Laboratorio · Harinas Elizondo

*[Read in English](README.md)*

Aplicación web que emite certificados de calidad de harina de trigo. El laboratorio registra los lotes de producción y sus inspecciones (resultados del alveógrafo y del farinógrafo), la aplicación los compara con los valores de referencia de cada cliente y genera un certificado en PDF que se envía por correo al cliente y al almacén. También guarda el histórico, los reportes y una bitácora de cambios.

Proyecto en equipo de la materia *Desarrollo de Software* (Universidad Anáhuac, otoño 2026). La entrega final es el 13 de noviembre de 2026.

## Tecnologías

Next.js 16, TypeScript, Tailwind v4 con shadcn (base-ui), Postgres en Neon con Drizzle, Better Auth, Vitest y despliegue en Vercel.

## Cómo empezar

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Abre http://localhost:3000. La base de datos, las migraciones y el despliegue están explicados en [docs/llm/runbook.md](docs/llm/runbook.md) (en inglés).

## Documentación

| | |
| --- | --- |
| [docs/llm/](docs/llm/README.md) | Requerimientos, dominio, arquitectura, decisiones, avance y pruebas (en inglés, pensada para agentes de IA pero útil para todos) |
| [docs/01_AVANCE_B1_B4.md](docs/01_AVANCE_B1_B4.md) | Borrador del diseño técnico |
| [docs/02_modelo_bd.sql](docs/02_modelo_bd.sql) | Modelo relacional original |
| [legacy/prototipo-v0.1/](legacy/prototipo-v0.1/README.md) | Primer prototipo del módulo de Clientes, se conserva como referencia |

## Cómo contribuir

Haz un fork del repositorio, trabaja en una rama, corre `pnpm typecheck && pnpm lint && pnpm test && pnpm build` y abre un pull request a `ValleryR/harinas-elizondo`. El código se escribe en inglés y todo lo que ve el usuario va en español.

Es un prototipo académico y no está pensado para producción.
