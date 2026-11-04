<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="img/logo-white.png">
    <img src="img/logo-dark.png" width="240" alt="Logo de Harinas Elizondo">
  </picture>

  # Harinas Elizondo
  *Certificados de calidad de harina de trigo, desde el lote de producción hasta el correo del cliente. Hecho con [Next.js](https://nextjs.org/).*


  > [!NOTE]
  > <b>Proyecto escolar no oficial.</b> Se hizo para una materia universitaria y no está afiliado, avalado ni en uso por Harinas Elizondo. El logo aparece solo para identificar el caso de estudio.

  [English version](README.md) • [Qué es](#qué-es) • [Funciones](#funciones) • [Cómo empezar](#cómo-empezar) • [Para LLMs](docs/llm/README.md)
</div>

## Qué es

Los molinos de harina tienen que demostrar que cada entrega cumple con las especificaciones de calidad del cliente. En este caso el laboratorio analiza cada lote de producción con dos equipos, un alveógrafo y un farinógrafo, y hoy arma el certificado de calidad a mano con hojas de cálculo y un editor de PDF. Eso es lento y hace demasiado fácil "ajustar" resultados viejos para que le queden a un cliente.

Esta aplicación reemplaza ese proceso. El laboratorio registra los lotes y sus inspecciones, la aplicación compara los resultados con los límites de referencia de cada cliente (o con los internacionales) y emite un certificado en PDF que muestra cualquier desviación. El certificado se envía por correo al cliente y al almacén, y cada acción queda registrada.

Es el proyecto en equipo de *Desarrollo de Software* en la Universidad Anáhuac (otoño 2026), basado en un caso de estudio que escribió el profesor de la materia. La entrega final es el 13 de noviembre de 2026.

## Funciones

La aplicación está en su primera etapa. La estructura y las reglas de negocio ya están listas, y los módulos se van construyendo uno por uno.

- **Clientes.** Se registran con su clave SAP, su contacto y sus propios límites de referencia. Los clientes se inactivan, nunca se borran.
- **Equipos de laboratorio.** Alveógrafos y farinógrafos con clave generada por el sistema, los cinco parámetros que mide cada uno y sus límites. Un equipo sin límites no se puede usar.
- **Lotes e inspecciones.** Los resultados se capturan por lote y la secuencia de inspección (A, B, … Z, AA) la asigna la aplicación.
- **Certificados.** Se emiten con la última inspección completa del lote, con resultados de ambos equipos, desviaciones y datos de pedido y factura, y luego se envían por correo con evidencia del envío.
- **Reportes.** Histórico de certificados con filtros, gráficas por periodo y exportación a Excel para Power BI.
- **Roles y bitácora.** El personal de laboratorio puede hacer todo, los gerentes solo consultan, y cada cambio guarda quién lo hizo.
- **En español.** Todo lo que ve el usuario está en español.

## Cómo empezar

### Requisitos

Necesitas [Node.js](https://nodejs.org/) 22 o más reciente y [pnpm](https://pnpm.io/), que Node puede instalar por ti con `corepack enable`.

### Instalación

```bash
# Clona el repositorio
git clone https://github.com/Freddy-Nader/harinas-elizondo.git
cd harinas-elizondo

# Instala las dependencias y crea tu archivo de configuración local
pnpm install
cp .env.example .env.local

# Arranca la aplicación
pnpm dev
```

Luego abre http://localhost:3000.

> [!NOTE]
> Las pantallas funcionan de inmediato, pero iniciar sesión y guardar datos necesita una base de datos Postgres. Los pasos para conectarla están en el [runbook](docs/llm/runbook.md) (en inglés).
