# Especificación técnica de Harinas Elizondo

Sistema de control de laboratorio para emitir certificados de calidad de harina de trigo. Documento de la entrega 3 de Desarrollo de Software, escrito con la plantilla del caso de estudio.

Este documento describe el código del repositorio https://github.com/ValleryR/harinas-elizondo tal como quedará cuando se integren los pull requests abiertos. La base es `main` en el commit 2b30a0f. Cada parte que depende de un PR que todavía no tiene merge lleva la marca "(pendiente de integrar, PR #n)". Las líneas que empiezan con "TODO (equipo)" piden evidencia que solo el equipo puede aportar, como capturas, números medidos en vivo o resultados de usuarios reales. Nada de eso se inventó.

Los identificadores RF, UC, BR, D y Q son los de `docs/llm/requirements.md` y `docs/llm/decisions.md`, y son los mismos que aparecen en los comentarios del código y en los nombres de las pruebas.

## Descripción técnica general (Technical Overview)

### Propósito y alcance

Hoy el laboratorio arma cada certificado a mano con hojas de cálculo y un editor de PDF, así que es lento y permite "ajustar" resultados viejos para que le queden a un cliente. La aplicación reemplaza ese proceso. El laboratorio registra clientes, equipos, lotes e inspecciones, y la aplicación compara los resultados con los límites del cliente o con los internacionales. Después emite un certificado en PDF que muestra cualquier desviación, lo envía al cliente y al almacén, y guarda en la bitácora quién hizo cada acción.

El alcance de la versión 1 cubre los requisitos RF-01 a RF-08 y los casos de uso UC-01 a UC-08. La sincronización de clientes con SAP ByD, el envío real de correo y los límites por producto quedan para una versión 2 (D-12, D-13).

### Pila tecnológica

| Capa | Tecnología | Decisión |
| --- | --- | --- |
| Aplicación web | Next.js 16.4 (App Router, React 19, TypeScript, Cache Components activado) | D-01 |
| Estilos y componentes | Tailwind v4, shadcn sobre base-ui, Sonner para avisos, recharts para gráficas | D-04 |
| Base de datos | PostgreSQL en Neon, acceso con Drizzle ORM sobre el driver HTTP de Neon | D-02 |
| Autenticación | Better Auth con correo y contraseña, campos extra `role`, `employeeId` y `active` | D-03, D-14 |
| PDF | `@react-pdf/renderer` en el servidor | D-13 |
| Correo | Interfaz `sendEmail` hoy simulada (se registra en el log), Resend planeado | D-13 |
| Exportación | exceljs para `.xlsx` y CSV propio (pendiente de integrar, PR #33 y PR #37) | D-19 |
| Hospedaje | Vercel, con deploy de producción en https://harinas-elizondo.vercel.app | D-01 |
| Pruebas | Vitest (unitarias y de componentes), Playwright (integrales y de sistema), GitHub Actions (regresión) | ver Calidad de servicio |

### Arquitectura

La arquitectura del documento del equipo es por capas (presentación, lógica de negocio, acceso a datos, servicios e integración). En Next.js cada capa vive en una carpeta distinta, y la lógica de negocio es pura y no toca la base de datos, por eso se prueba sin infraestructura.

| Capa | Dónde está en el repositorio |
| --- | --- |
| Presentación | `src/app/(app)/<módulo>/page.tsx`, `_components/`, `src/components/` |
| Lógica de negocio | `src/lib/domain/*.ts` (reglas puras con pruebas) y las server actions de cada módulo |
| Acceso a datos | `src/lib/db/` (esquema y cliente Drizzle) y un `data.ts` por módulo |
| Seguridad | `src/proxy.ts`, `src/lib/session.ts`, `src/lib/permissions.ts`, `src/lib/modules.ts` |
| Auditoría | `src/lib/audit.ts` |
| Servicios e integración | `src/lib/services/` (PDF, correo y, pendiente de integrar con el PR #37, exportación) |

```mermaid
flowchart LR
  subgraph Cliente["Navegador"]
    UI["Pantallas en español<br/>(React, shadcn, base-ui)"]
  end

  subgraph Vercel["Vercel · Next.js 16"]
    Proxy["proxy.ts<br/>redirección optimista a /login"]
    RSC["Server Components<br/>page.tsx + data.ts"]
    SA["Server Actions<br/>actions.ts por módulo"]
    PDFRoute["Route handler<br/>/certificados/[id]/pdf"]
    AuthAPI["/api/auth/[...all]<br/>Better Auth"]
    subgraph Lib["src/lib"]
      Session["session.ts<br/>requireRole"]
      Domain["domain/*<br/>reglas BR puras"]
      Audit["audit.ts<br/>recordAudit / auditInsert"]
      Services["services/*<br/>PDF, correo, exportación"]
      DB["db/*<br/>Drizzle neon-http"]
    end
  end

  Neon[("Neon PostgreSQL")]
  Mail["Correo<br/>(simulado, Resend planeado)"]
  BI["Excel / Power BI"]
  CI["GitHub Actions CI<br/>(PR #29)"]

  UI --> Proxy --> RSC
  UI --> SA
  UI --> PDFRoute
  UI --> AuthAPI
  RSC --> Session
  SA --> Session
  PDFRoute --> Session
  SA --> Domain
  RSC --> Domain
  SA --> Audit
  SA --> Services
  PDFRoute --> Services
  Session --> AuthAPI
  Audit --> DB
  RSC --> DB
  SA --> DB
  AuthAPI --> DB
  DB --> Neon
  Services --> Mail
  Services --> BI
  CI -. corre pruebas .-> Vercel
```

### Reglas de diseño que atraviesan todos los módulos

- La autorización nunca depende de ocultar botones. Cada server action y cada función de lectura llama a `requireRole` antes de tocar datos (RF-01), y `proxy.ts` solo hace una redirección optimista cuando no hay cookie de sesión.
- Cada alta, cambio, emisión, envío o cancelación escribe una fila en `audit_log` con el número de empleado y el nombre (BR-AUD-01). Cuando el cambio y su fila de bitácora deben guardarse juntos se usa `getDb().batch([...])`, que Neon ejecuta como una sola transacción.
- Nada se borra físicamente. Clientes y equipos se inactivan con motivo, y los certificados emitidos se cancelan con motivo (BR-CLI-03, D-16, D-25).
- El código está en inglés y todo lo que ve el usuario está en español. La tabla de equivalencias está en Diseño de datos.
- Las páginas leen la sesión dentro de un `<Suspense>`, porque con Cache Components leer cabeceras fuera de esa frontera rompe el build.

> TODO (equipo): agregar la tabla de quién construyó cada módulo y cada sección de este documento (Q-12), usando solo usuarios públicos de GitHub y nunca nombres de estudiantes.

## Diseño de pantallas y reportes (Screen and Report Design)

### Árbol de navegación

El menú lateral y el menú móvil salen de una sola lista, `MODULES` en `src/lib/modules.ts`, filtrada por rol. Un rol que no aparece en la lista de un módulo ve el aviso "Acceso restringido" aunque escriba la ruta a mano.

```mermaid
flowchart TD
  Login["/login<br/>Inicio de sesión"] --> Panel["/panel<br/>Panel"]
  Panel --> Usuarios["/usuarios<br/>Usuarios (admin)"]
  Panel --> Clientes["/clientes<br/>Clientes (transacción)"]
  Panel --> Equipos["/equipos<br/>Equipos (transacción)"]
  Panel --> Lotes["/lotes<br/>Lotes (transacción)"]
  Panel --> Inspecciones["/inspecciones<br/>Inspecciones (transacción)"]
  Panel --> Certificados["/certificados<br/>Certificados (transacción)"]
  Panel --> Reportes["/reportes<br/>Reportes (transacción y consulta)"]
  Panel --> Bitacora["/bitacora<br/>Bitácora (transacción y consulta)"]
  Equipos --> EqNuevo["/equipos/nuevo"]
  Equipos --> EqDet["/equipos/[id]"]
  Lotes --> LoNuevo["/lotes/nuevo"]
  Lotes --> LoDet["/lotes/[id]"]
  LoDet --> InsDet["/inspecciones/[id]"]
  Inspecciones --> InsDet
  Certificados --> CerNuevo["/certificados/nuevo"]
  Certificados --> CerDet["/certificados/[id]"]
  CerDet --> PDF["/certificados/[id]/pdf"]
```

### Matriz de acceso por rol

| Módulo | Administrador | Usuario de transacción | Usuario de consulta |
| --- | --- | --- | --- |
| Panel | Sí | Sí | Sí |
| Usuarios | Sí | No | No |
| Clientes, Equipos, Lotes, Inspecciones, Certificados | No | Sí | No |
| PDF del certificado | No | Sí | Sí (solo lectura) |
| Reportes | No | Sí | Sí |
| Bitácora | No | Sí | Sí |

### Pantallas

| Ruta | Pantalla | Qué muestra y qué permite |
| --- | --- | --- |
| `/login` | Inicio de sesión | Correo y contraseña. El registro público está apagado (D-14). Después de entrar regresa a la ruta pedida, siempre que sea del mismo sitio (`safeNextPath`) |
| `/panel` | Panel | Tarjetas de los módulos que el rol puede abrir |
| `/usuarios` | Usuarios | Crear cuenta (nombre, correo, número de empleado, contraseña de 12 a 128 caracteres, rol) y lista de cuentas de operación con cambio de rol y de estado. No crea ni modifica administradores |
| `/clientes` | Clientes | Directorio de clientes, formulario de alta y edición con dirección fiscal y una o más direcciones de entrega, estado del cliente con motivo, y valores de referencia particulares por parámetro |
| `/equipos` | Equipos de laboratorio | Lista con filtro por estado (activo, inactivo, baja) |
| `/equipos/nuevo` | Nuevo equipo | Tipo (alveógrafo o farinógrafo) y datos generales. La clave la genera el sistema |
| `/equipos/[id]` | Detalle de equipo | Datos generales, parámetros que mide con sus límites internacionales, estado con motivo e historial de cambios tomado de la bitácora |
| `/lotes` | Lotes de producción | Lista con búsqueda |
| `/lotes/nuevo` | Nuevo lote | Número de lote, producto (texto libre con sugerencias, D-21), fecha de producción y caducidad |
| `/lotes/[id]` | Detalle de lote | Datos del lote (bloqueados si ya tiene certificado) e inspecciones con su secuencia. Botón para iniciar la siguiente inspección, que pide motivo de falla de equipo cuando la anterior ya está completa |
| `/inspecciones` | Inspecciones | Lista con lote, secuencia, fecha, estado, desviaciones y quién capturó |
| `/inspecciones/[id]` | Captura de resultados | Equipo usado por máquina y los diez parámetros, con vista previa en vivo de la desviación contra los límites internacionales. Admite guardados parciales |
| `/certificados` | Certificados de calidad | Lista con folio, cliente, lote, orden de compra, estado, desviaciones y fecha de emisión |
| `/certificados/nuevo` | Nuevo certificado | Cliente, lote, orden de compra, cantidades, factura, fecha de envío, dirección de entrega del cliente, transportista y casilla de firma |
| `/certificados/[id]` | Detalle de certificado | Resultados (diez líneas con origen del límite y desviación), lista de bloqueos BR-CER-05, emisión con envío opcional, envíos y reenvíos, cancelación con motivo y verificación de la huella SHA-256 |
| `/reportes` | Reportes y Estadísticas | Filtros por periodo, cliente y estado, indicadores, gráficas, histórico paginado y exportación (pendiente de integrar, PR #33 y PR #37) |
| `/bitacora` | Bitácora | Tabla de solo lectura con filtros por entidad, acción, empleado, fechas e id, 50 filas por página y detalle JSON expandible (pendiente de integrar, PR #31) |
| Encabezado móvil | Menú móvil | Botón de menú abajo de `md` que abre un panel lateral con los mismos módulos del rol (pendiente de integrar, PR #35) |

> TODO (equipo): captura de `/login`.

> TODO (equipo): captura de `/panel` con cada rol (administrador, transacción y consulta).

> TODO (equipo): captura de `/usuarios` con el formulario de alta y la lista de cuentas.

> TODO (equipo): captura de `/clientes` con el directorio, el formulario y los valores particulares.

> TODO (equipo): captura de `/equipos`, `/equipos/nuevo` y `/equipos/[id]`.

> TODO (equipo): captura de `/lotes` y `/lotes/[id]` con una inspección completa y una re-inspección.

> TODO (equipo): captura de `/inspecciones/[id]` con la vista previa de desviación.

> TODO (equipo): captura de `/certificados/[id]` en borrador con bloqueos, emitido y cancelado.

> TODO (equipo): captura de `/reportes` con filtros y gráficas, cuando se integren el PR #33 y el PR #37.

> TODO (equipo): captura de `/bitacora` con filtros, cuando se integre el PR #31.

> TODO (equipo): captura del menú móvil a 375 px, cuando se integre el PR #35.

### Reporte impreso, el certificado en PDF

El PDF se genera en el servidor con `@react-pdf/renderer` (`src/lib/services/certificate-pdf.tsx`) y sale de la ruta `/certificados/[id]/pdf`. Contiene el encabezado "Harinas Elizondo, Laboratorio de Control de Calidad, Certificado de calidad", el folio `CER-YYYY-NNNNNN` (D-17), los datos del cliente, el lote, la orden de compra, la factura, las cantidades, la fecha de envío, la dirección de entrega y el transportista. Después viene la tabla de resultados con las columnas Parámetro, Unidad, Resultado, Mínimo, Máximo y Desviación.

Cuando la casilla de firma está activa se imprime el bloque firmado con nombre, número de empleado y fecha de quien emitió (D-18). Siempre se imprime la huella digital SHA-256 del contenido emitido (D-26). Un borrador lleva la marca "BORRADOR · sin validez" y un cancelado la marca "CANCELADO · sin validez". Como las fuentes base del PDF solo cubren Latin-1, `pdfSafeText` escribe las unidades con subíndices y superíndices en texto plano.

> TODO (equipo): imagen del PDF de un certificado emitido con datos de prueba (por ejemplo del cliente `PRUEBA01`), sin datos reales.

### Reportes en pantalla y exportación (pendiente de integrar, PR #33 y PR #37)

La pantalla de Reportes parte del trabajo del PR #33 y lo completa el PR #37. Muestra estos elementos.

- Filtros en la URL por periodo rápido (este mes, este trimestre, este año), rango de fechas sobre `certificates.issued_at` en hora de planta, cliente y estado. Las fechas inválidas se descartan y un rango al revés se invierte.
- Indicadores de total de certificados, tasa de cumplimiento, desviaciones registradas, cancelados y entregas fallidas.
- Gráficas de tendencia mensual y Pareto de parámetros fuera de rango, hechas con recharts.
- Detalle de desviaciones por parámetro e histórico paginado de 20 en 20 con enlace al certificado. El usuario de consulta no puede abrir `/certificados`, así que su enlace abre el PDF.
- Exportación a `.xlsx` y CSV con las columnas ID Certificado, Estado, Fecha de Emisión, Clave SAP Cliente, Nombre del Cliente, RFC, ID Lote, Secuencia Inspección, Orden de Compra, No. Factura, Emitido Por, Con Desviación, Parámetros Fuera de Rango, Entregas Fallidas y Motivo de Cancelación.

Los borradores nunca aparecen porque no se emitieron. Los cancelados se ven en el histórico con su insignia, pero no cuentan en indicadores, desviaciones ni gráficas (D-25).

> TODO (equipo): captura de un archivo exportado abierto en Excel y en Power BI, porque ningún PR lo abrió en esas herramientas.

## Diseño de datos (Data Design)

### Modelo entidad relación

El modelo está en `src/lib/db/schema.ts` y `src/lib/db/auth-schema.ts`. Drizzle usa `casing: "snake_case"`, así que una columna `sapKey` en el código es `sap_key` en Postgres. El diagrama muestra las columnas principales y todas las llaves.

```mermaid
erDiagram
  user ||--o{ session : "tiene"
  user ||--o{ account : "credencial"
  user ||--o{ audit_log : "actúa"
  user ||--o{ certificates : "emite / cancela"
  clients ||--o{ client_delivery_addresses : "destinos"
  clients ||--o{ client_limits : "límites propios"
  parameters ||--o{ client_limits : "limita"
  parameters ||--o| international_limits : "límite por omisión"
  lots ||--o{ inspections : "tiene"
  inspections ||--o{ inspection_results : "contiene"
  parameters ||--o{ inspection_results : "mide"
  equipment ||--o{ inspection_results : "medido con"
  clients ||--o{ certificates : "recibe"
  lots ||--o{ certificates : "certifica"
  inspections ||--o{ certificates : "respalda"
  certificates ||--o{ certificate_lines : "imprime"
  parameters ||--o{ certificate_lines : "parámetro"
  certificates ||--o{ deliveries : "se envía como"

  user {
    text id PK
    text name
    text email UK
    text role "transaction, query, admin"
    boolean active
    text employee_id UK
  }
  clients {
    uuid id PK
    varchar sap_key UK
    varchar business_name
    varchar rfc UK
    varchar fiscal_address
    varchar delivery_address "espejo del primer destino"
    varchar contact_name
    varchar contact_email
    boolean requires_certificate
    record_status status
    varchar status_reason
  }
  client_delivery_addresses {
    uuid id PK
    uuid client_id FK
    varchar address
    integer position
  }
  equipment {
    char id PK "clave de 8 caracteres"
    equipment_type type
    varchar short_description
    varchar serial_number UK
    record_status status
    varchar status_reason
  }
  parameters {
    varchar code PK
    equipment_type equipment_type
    varchar label
    varchar unit
  }
  international_limits {
    varchar parameter_code PK, FK
    numeric lower_limit
    numeric upper_limit
  }
  client_limits {
    uuid client_id PK, FK
    varchar parameter_code PK, FK
    numeric lower_limit
    numeric upper_limit
  }
  lots {
    varchar id PK
    varchar product
    date produced_on
    date expires_on
    record_status status
  }
  inspections {
    serial id PK
    varchar lot_id FK
    varchar sequence "A..Z, AA..ZZZ"
    timestamptz inspected_at
    varchar reinspection_reason
    timestamptz locked_at
  }
  inspection_results {
    integer inspection_id PK, FK
    varchar parameter_code PK, FK
    char equipment_id FK
    numeric value
  }
  certificates {
    varchar id PK "CER-YYYY-NNNNNN"
    uuid client_id FK
    varchar lot_id FK
    integer inspection_id FK
    varchar purchase_order
    varchar invoice_number
    numeric quantity_requested
    numeric quantity_delivered
    date shipped_on
    varchar delivery_address
    varchar carrier
    boolean requires_signature
    certificate_status status
    timestamptz issued_at
    text issued_by FK
    char signature_hash
    timestamptz cancelled_at
    text cancelled_by FK
    varchar cancellation_reason
  }
  certificate_lines {
    varchar certificate_id PK, FK
    varchar parameter_code PK, FK
    numeric value
    numeric lower_limit
    numeric upper_limit
    numeric deviation
  }
  deliveries {
    serial id PK
    varchar certificate_id FK
    text_array recipients
    boolean succeeded
    text error
    timestamptz sent_at
    text sent_by FK
  }
  audit_log {
    serial id PK
    timestamptz at
    text user_id FK
    varchar employee_id
    varchar user_name
    varchar action
    varchar entity
    varchar entity_id
    jsonb detail
  }
```

Casi todas las tablas de negocio tienen además `created_at` y `created_by` (o `updated_at` y `updated_by` en los límites), con `created_by` como llave foránea a `user.id`. El diagrama las omite para que se lea mejor.

### Diccionario de datos

Los tipos son los de Postgres. "No" en la columna Nulo significa `NOT NULL`.

#### clients

| Columna | Tipo | Llave | Nulo | Descripción |
| --- | --- | --- | --- | --- |
| id | uuid | PK | No | Identificador interno, `gen_random_uuid()` |
| sap_key | varchar(10) | Única | No | Clave del cliente en SAP ByD (BR-CLI-01) |
| business_name | varchar(150) |  | No | Razón social |
| rfc | varchar(13) | Única | Sí en la tabla, obligatorio en el formulario | RFC validado con `^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$` (BR-CLI-02) |
| fiscal_address | varchar(250) |  | Sí en la tabla, obligatorio en el formulario | Dirección fiscal (D-22). Los clientes antiguos la tienen vacía hasta que se capture |
| delivery_address | varchar(250) |  | Sí | Copia del primer destino, se conserva por compatibilidad |
| contact_name | varchar(100) |  | Sí en la tabla, obligatorio en el formulario | Contacto |
| contact_email | varchar(100) |  | Sí en la tabla, obligatorio en el formulario | Correo al que se envía el certificado |
| requires_certificate | boolean |  | No | Si el cliente pide certificado, por omisión `true` |
| status | record_status |  | No | `active` o `inactive` |
| status_reason | varchar(200) |  | Sí | Motivo de la inactivación (BR-CLI-03) |
| created_at, created_by | timestamptz, text | FK a user | No, Sí | Alta |

#### client_delivery_addresses

| Columna | Tipo | Llave | Nulo | Descripción |
| --- | --- | --- | --- | --- |
| id | uuid | PK | No | Identificador del destino |
| client_id | uuid | FK a clients | No | Cliente |
| address | varchar(250) |  | No | Dirección de entrega |
| position | integer | Única con client_id | No | Orden de captura |

#### equipment

| Columna | Tipo | Llave | Nulo | Descripción |
| --- | --- | --- | --- | --- |
| id | char(8) | PK | No | Clave aleatoria generada por la aplicación con 31 símbolos sin parecidos (BR-EQP-01) |
| type | equipment_type |  | No | `alveograph` o `farinograph`, fijo después del alta |
| short_description | varchar(60) |  | No | Nombre corto |
| long_description | text |  | Sí | Descripción larga |
| brand, model | varchar(40) |  | Sí | Marca y modelo |
| serial_number | varchar(30) | Única | Sí | Número de serie |
| supplier | varchar(80) |  | Sí | Proveedor |
| acquired_on, warranty_until | date |  | Sí | Adquisición y fin de garantía |
| location | varchar(80) |  | Sí | Ubicación |
| responsible | varchar(100) |  | Sí | Responsable |
| status | record_status |  | No | `active`, `inactive` (temporal) o `retired` (baja definitiva, D-16) |
| status_reason | varchar(200) |  | Sí | Motivo del cambio de estado |

#### parameters, international_limits y client_limits

| Tabla | Columna | Tipo | Llave | Descripción |
| --- | --- | --- | --- | --- |
| parameters | code | varchar(10) | PK | Uno de los diez códigos de la tabla siguiente |
| parameters | equipment_type | equipment_type |  | Máquina que lo mide |
| parameters | label, unit | varchar(60), varchar(15) |  | Texto y unidad que ve el usuario |
| international_limits | parameter_code | varchar(10) | PK, FK | Una fila por parámetro (D-07) |
| international_limits | lower_limit, upper_limit | numeric(10,3) | CHECK inferior <= superior | Rango internacional |
| client_limits | client_id, parameter_code | uuid, varchar(10) | PK compuesta, FK | De cero a diez filas por cliente |
| client_limits | lower_limit, upper_limit | numeric(10,3) | CHECK inferior <= superior | Rango particular, que solo puede estrechar el internacional (D-23) |

Los diez parámetros obligatorios salen de `src/lib/domain/parameters.ts`. Las unidades son una primera propuesta y siguen abiertas (Q-11).

| Código | Máquina | Etiqueta | Unidad |
| --- | --- | --- | --- |
| ALV_P | Alveógrafo | Tenacidad (P) | mm H₂O |
| ALV_L | Alveógrafo | Extensibilidad (L) | mm |
| ALV_W | Alveógrafo | Fuerza panadera (W) | 10⁻⁴ J |
| ALV_PL | Alveógrafo | Relación P/L | sin unidad |
| ALV_IE | Alveógrafo | Índice de elasticidad (I.E.) | % |
| FAR_ABS | Farinógrafo | Absorción de agua | % |
| FAR_DEV | Farinógrafo | Tiempo de desarrollo | min |
| FAR_STA | Farinógrafo | Estabilidad | min |
| FAR_SOF | Farinógrafo | Grado de ablandamiento | UF |
| FAR_ARR | Farinógrafo | Tiempo de llegada | min |

#### lots, inspections e inspection_results

| Tabla | Columna | Tipo | Llave | Nulo | Descripción |
| --- | --- | --- | --- | --- | --- |
| lots | id | varchar(20) | PK | No | Número de lote en mayúsculas, solo letras, números y guiones |
| lots | product | varchar(60) |  | No | Producto, texto libre (D-21) |
| lots | produced_on, expires_on | date |  | No | La caducidad debe ser posterior a la producción |
| lots | status | record_status |  | No | Estado del lote |
| inspections | id | serial | PK | No | Identificador |
| inspections | lot_id | varchar(20) | FK a lots | No | Lote |
| inspections | sequence | varchar(3) | Única con lot_id | No | A a Z, después AA a ZZ y AAA a ZZZ (D-08, BR-INS-02) |
| inspections | inspected_at | timestamptz |  | No | Fecha de la inspección |
| inspections | reinspection_reason | varchar(200) |  | Sí | Motivo de falla de equipo en una re-inspección (D-15) |
| inspections | locked_at | timestamptz |  | Sí | Momento en que un certificado la usó. Desde ahí es de solo lectura (BR-AUD-03) |
| inspection_results | inspection_id, parameter_code | integer, varchar(10) | PK compuesta, FK | No | Un resultado por parámetro (D-09) |
| inspection_results | equipment_id | char(8) | FK a equipment | No | Equipo con que se midió |
| inspection_results | value | numeric(10,3) |  | No | Valor medido, no negativo |

#### certificates, certificate_lines y deliveries

| Tabla | Columna | Tipo | Llave | Nulo | Descripción |
| --- | --- | --- | --- | --- | --- |
| certificates | id | varchar(16) | PK | No | Folio `CER-YYYY-NNNNNN` con contador que reinicia cada año (D-17) |
| certificates | client_id, lot_id, inspection_id | uuid, varchar(20), integer | FK | No | Cliente, lote e inspección usada |
| certificates | purchase_order | varchar(20) |  | No | Orden de compra |
| certificates | invoice_number | varchar(20) |  | Sí | Factura, obligatoria para emitir (BR-CER-05) |
| certificates | quantity_requested, quantity_delivered | numeric(10,3) |  | Sí | Cantidades. La entregada es obligatoria para emitir |
| certificates | shipped_on | date |  | Sí | Fecha de envío, obligatoria para emitir y dentro de la vida del lote |
| certificates | delivery_address | varchar(250) |  | Sí | Copia del destino elegido (D-24) |
| certificates | carrier | varchar(100) |  | Sí | Transportista, obligatorio para emitir (D-24) |
| certificates | requires_signature | boolean |  | No | Imprime el bloque firmado (D-18) |
| certificates | status | certificate_status |  | No | `draft`, `issued`, `sent` o `cancelled` |
| certificates | pdf_url | text |  | Sí | Reservada. El PDF se genera al vuelo y hoy no se guarda |
| certificates | issued_at, issued_by | timestamptz, text | FK a user | Sí | Emisión |
| certificates | signature_hash | char(64) |  | Sí | SHA-256 del contenido emitido (D-26) |
| certificates | cancelled_at, cancelled_by, cancellation_reason | timestamptz, text, varchar(200) | FK a user | Sí | Cancelación (D-25) |
| certificate_lines | certificate_id, parameter_code | varchar(16), varchar(10) | PK compuesta, FK | No | Una línea por parámetro |
| certificate_lines | value, lower_limit, upper_limit, deviation | numeric(10,3) |  | No | Copia fija de lo que se imprimió (D-10) |
| deliveries | id | serial | PK | No | Intento de envío |
| deliveries | certificate_id | varchar(16) | FK | No | Certificado |
| deliveries | recipients | text[] |  | No | Destinatarios |
| deliveries | succeeded, error | boolean, text |  | No, Sí | Resultado del intento |
| deliveries | sent_at, sent_by | timestamptz, text | FK a user | No, Sí | Cuándo y quién |

#### Usuarios, sesión y bitácora

| Tabla | Columna | Tipo | Descripción |
| --- | --- | --- | --- |
| user | id, name, email | text | Cuenta de Better Auth, correo único |
| user | role | text | `admin`, `transaction` o `query`, por omisión `query`. Un valor desconocido se trata como `query` |
| user | active | boolean | Cuenta activa (migración 0004). Una cuenta inactiva no puede abrir sesión |
| user | employee_id | text, única | Número de empleado que se copia en cada fila de bitácora |
| session, account, verification | varias | Tablas estándar de Better Auth. `account.password` guarda el hash de la contraseña |
| audit_log | id, at | serial, timestamptz | Fila y fecha |
| audit_log | user_id, employee_id, user_name | text, varchar(10), varchar(100) | Quién actuó. El número y el nombre se copian para que la fila sobreviva a cambios del usuario |
| audit_log | action, entity, entity_id | varchar(40), varchar(30), varchar(40) | Qué se hizo y sobre qué |
| audit_log | detail | jsonb | Lo que cambió, por ejemplo `{ changes }` o un motivo, sin secretos |

### Equivalencia de nombres con el borrador SQL (D-06)

El borrador `docs/02_modelo_bd.sql` de la entrega 2 usaba nombres en español. El esquema final usa inglés por regla del proyecto, y esta tabla mapea los dos.

| Borrador (español) | Esquema final (inglés) | Cambio |
| --- | --- | --- |
| cat_estatus (ACT, INA, BAJ) | enum `record_status` (active, inactive, retired) | Catálogo reemplazado por enum |
| usuario | `user` (Better Auth) | `rol` pasa a `role`, se agrega `admin` y `active` |
| usuario.id_empleado | `user.employee_id` | Igual |
| cliente | `clients` | `id_cliente` pasa de BIGINT a uuid |
| cliente.clave_sap | `clients.sap_key` | Igual |
| cliente.razon_social | `clients.business_name` | Igual |
| cliente.rfc | `clients.rfc` | Ahora única |
| cliente.domicilio_entrega | `client_delivery_addresses` | Varios destinos por cliente (D-22) |
| (no existía) | `clients.fiscal_address` | Nueva (D-22) |
| cliente.contacto_nombre, contacto_correo | `clients.contact_name`, `contact_email` | Igual |
| cliente.requiere_certificado | `clients.requires_certificate` | Igual |
| equipo | `equipment` | Más datos generales del profesor |
| equipo.tipo_equipo (ALV, FAR) | enum `equipment_type` (alveograph, farinograph) | Enum |
| (no existía) | `parameters`, `international_limits`, `client_limits` | Nuevas (D-07) |
| lote | `lots` | Igual |
| inspeccion | `inspections` | Se agrega `locked_at` |
| inspeccion.secuencia | `inspections.sequence` | Igual, varchar(3) |
| inspeccion.motivo_reinspeccion | `inspections.reinspection_reason` | Igual |
| (no existía) | `inspection_results` | Nueva, un resultado por parámetro (D-09) |
| certificado | `certificates` | Se agregan cantidades, envío, firma, hash y cancelación |
| certificado.num_pedido | `certificates.purchase_order` | De 15 a 20 caracteres |
| certificado.num_factura | `certificates.invoice_number` | Igual |
| certificado.fecha_emision | `certificates.issued_at` | Nula hasta emitir |
| certificado.ruta_pdf | `certificates.pdf_url` | Reservada |
| (no existía) | `certificate_lines`, `deliveries`, `audit_log` | Nuevas (D-10, RF-06, RF-08) |

## Diseño SQL (SQL Design)

### Migraciones

Las migraciones las genera `drizzle-kit` a partir de `schema.ts` y viven en `drizzle/`. Todas se aplicaron a la base compartida de Neon según `docs/llm/decisions.md` y `docs/llm/status.md`.

| Migración | Qué hace |
| --- | --- |
| `0000_married_turbo.sql` | Crea los enums `record_status`, `equipment_type` y `certificate_status` (draft, issued, sent), las tablas de negocio, las de Better Auth, las llaves foráneas y los índices |
| `0001_client_addresses.sql` | Crea `client_delivery_addresses` con índice único por cliente y posición, agrega `clients.fiscal_address` y copia la dirección de entrega anterior como primer destino |
| `0002_client_unique_rfc.sql` | Agrega la restricción única `clients_rfc_unique`. Se aplicó después de que el equipo corrigiera los RFC repetidos, sin borrar ni fusionar registros |
| `0003_certificate_shipping_cancel.sql` | Agrega el valor `cancelled` al enum y las columnas `delivery_address`, `carrier`, `signature_hash`, `cancelled_at`, `cancelled_by` y `cancellation_reason` a `certificates` |
| `0004_user_access.sql` | Agrega `user.active` con valor por omisión `true` |

La migración 0001 es la única que mueve datos.

```sql
INSERT INTO "client_delivery_addresses" ("client_id", "address", "position")
SELECT "id", trim("delivery_address"), 0 FROM "clients"
WHERE "delivery_address" IS NOT NULL AND trim("delivery_address") <> '';
```

### Consultas clave

El código usa el constructor de consultas de Drizzle. Estas son las sentencias SQL equivalentes de las operaciones que sostienen las reglas de negocio.

Siguiente folio del año (D-17). Si dos personas crean al mismo tiempo, el `ON CONFLICT DO NOTHING` deja pasar solo a una y la otra reintenta con el siguiente número, hasta cinco veces.

```sql
SELECT id FROM certificates
WHERE id LIKE 'CER-2026-%'
ORDER BY id DESC
LIMIT 1;

INSERT INTO certificates (id, client_id, lot_id, inspection_id, purchase_order, ...)
VALUES ('CER-2026-000124', $1, $2, $3, $4, ...)
ON CONFLICT (id) DO NOTHING
RETURNING id;
```

Nueva inspección de un lote (BR-INS-02, BR-INS-04). La secuencia se calcula en el código a partir de la última inspección, y el índice único `inspections_lot_sequence_uq` hace que un arranque simultáneo falle en lugar de saltarse una letra.

```sql
INSERT INTO inspections (lot_id, sequence, reinspection_reason, created_by)
VALUES ($1, 'B', $2, $3)
RETURNING id, sequence;
-- 23505 (unique_violation) => "Otra persona ya inició una inspección..."
```

Guardado parcial de resultados (RF-04). Los valores capturados se insertan o actualizan y los que se dejaron en blanco se borran, todo en un solo lote junto con la fila de bitácora.

```sql
INSERT INTO inspection_results (inspection_id, parameter_code, value, equipment_id)
VALUES ($1, 'ALV_P', 72.5, 'K7M3Q9TX'), ...
ON CONFLICT (inspection_id, parameter_code)
DO UPDATE SET value = excluded.value, equipment_id = excluded.equipment_id;

DELETE FROM inspection_results
WHERE inspection_id = $1 AND parameter_code IN ('FAR_SOF');

INSERT INTO audit_log (user_id, employee_id, user_name, action, entity, entity_id, detail)
VALUES ($2, $3, $4, 'update', 'inspection', $1, $5);
```

Emisión del certificado (UC-05). Las cuatro sentencias van en un `batch`, así que se guardan todas o ninguna. Si otra persona ya emitió el mismo certificado, la llave primaria de `certificate_lines` choca y la acción responde "El certificado ya fue emitido".

```sql
INSERT INTO certificate_lines (certificate_id, parameter_code, value, lower_limit, upper_limit, deviation)
VALUES ($1, 'ALV_P', ...), ... ;  -- diez filas

UPDATE certificates
SET status = 'issued', inspection_id = $2, issued_at = $3, issued_by = $4, signature_hash = $5
WHERE id = $1 AND status = 'draft';

UPDATE inspections SET locked_at = coalesce(locked_at, now()) WHERE id = $2;

INSERT INTO audit_log (..., action, entity, entity_id, detail)
VALUES (..., 'issue', 'certificate', $1, $6);
```

Cancelación (D-25). Solo cambia el estado de un certificado emitido o enviado, y deja intactos la copia de las líneas, el hash y el bloqueo de la inspección.

```sql
UPDATE certificates
SET status = 'cancelled', cancelled_at = now(), cancelled_by = $2, cancellation_reason = $3
WHERE id = $1 AND status IN ('issued', 'sent');
```

Lectura de la bitácora (pendiente de integrar, PR #31). Los filtros son opcionales y se combinan con `AND`.

```sql
SELECT * FROM audit_log
WHERE entity IN ($entidades)
  AND action = $accion
  AND (employee_id ILIKE $patron OR user_name ILIKE $patron)
  AND at >= $desde AND at < $hasta
ORDER BY at DESC
LIMIT 50 OFFSET $pagina;
```

Histórico de Reportes (pendiente de integrar, PR #33 y PR #37). Filtra por `issued_at` en hora de planta, nunca incluye borradores y lee las desviaciones de la copia guardada en `certificate_lines`.

```sql
SELECT c.*, cl.business_name, cl.sap_key, cl.rfc
FROM certificates c JOIN clients cl ON cl.id = c.client_id
WHERE c.status IN ('issued', 'sent', 'cancelled')
  AND c.issued_at >= $inicio AND c.issued_at < $fin
  AND ($cliente IS NULL OR c.client_id = $cliente)
ORDER BY c.issued_at DESC;
```

## Diseño de comportamiento (Behavior Design)

### Actores

| Actor | Rol en el sistema | Qué hace |
| --- | --- | --- |
| Administrador | `admin` | Crea, desactiva y cambia de rol las cuentas de operación. Se crea fuera de la aplicación con `pnpm db:create-admin` |
| Usuario de transacción | `transaction` | Laboratorio y gerencia de Control de Calidad. Registra todo, emite y envía certificados |
| Usuario de consulta | `query` | Aseguramiento de Calidad, gerentes de planta y Dirección de Operaciones. Solo ve reportes, histórico, bitácora y PDF |
| Almacenista | Sin cuenta | Recibe el certificado por correo y lo imprime |
| Cliente | Sin cuenta | Recibe el certificado por correo |
| Sistema | Proceso del servidor | Asigna secuencias y folios, calcula desviaciones, genera el PDF y registra envíos |

### Casos de uso

Todos los casos de uso tienen dos precondiciones comunes. La persona inició sesión con una cuenta activa, y su rol aparece en el módulo según `src/lib/modules.ts`. Si no hay sesión el sistema redirige a `/login` y después regresa a la ruta pedida. Si el rol no corresponde, la pantalla muestra "Acceso restringido" y la server action responde "No tienes permiso para realizar esta acción." sin escribir nada.

#### UC-01 Gestionar equipos de laboratorio y sus parámetros

- Actor principal. Usuario de transacción.
- Requisitos y reglas. RF-02, BR-EQP-01, BR-EQP-03, D-07, D-16.
- Precondición. Ninguna adicional.
- Postcondición. El equipo queda guardado con su clave y su fila de bitácora, y solo se puede usar para medir cuando está activo y todos sus parámetros tienen límites internacionales.

Flujo normal

1. El usuario abre `/equipos` y pulsa nuevo equipo.
2. Elige el tipo (alveógrafo o farinógrafo) y captura la descripción corta y los datos generales opcionales.
3. El sistema valida longitudes, fechas y que la garantía no termine antes de la adquisición.
4. El sistema genera una clave aleatoria de 8 caracteres, guarda el equipo y escribe la bitácora con acción `create`.
5. En el detalle, el usuario captura los límites internacionales inferior y superior de cada uno de los cinco parámetros que mide ese tipo.
6. El sistema guarda cada límite con su fila de bitácora y marca el equipo como disponible cuando ya no le falta ninguno.

Flujos alternos

- A1. Un límite inferior es mayor que el superior. El sistema rechaza el cambio con "El límite inferior no puede ser mayor que el superior."
- A2. El número de serie ya existe. La restricción única lo rechaza y el formulario lo marca en el campo.
- A3. La clave generada choca con una existente. El sistema reintenta hasta cinco veces y, si no lo logra, responde "No pudimos generar una clave única. Intenta de nuevo."
- A4. El usuario inactiva o da de baja el equipo sin motivo. El sistema pide "Escribe el motivo del cambio de estado."
- A5. El usuario intenta editar un equipo dado de baja. El sistema responde "El equipo está dado de baja y ya no se puede modificar."
- A6. A un equipo le faltan límites o está inactivo. No aparece como disponible al capturar inspecciones (BR-EQP-03).

#### UC-02 Gestionar clientes y sus valores de referencia

- Actor principal. Usuario de transacción.
- Requisitos y reglas. RF-03, BR-CLI-01, BR-CLI-02, BR-CLI-03, BR-REF-01, D-22, D-23.
- Precondición. Para capturar un límite particular ya debe existir el límite internacional de ese parámetro.
- Postcondición. El cliente, sus destinos y su fila de bitácora se guardan juntos. Un cliente nunca se borra.

Flujo normal

1. El usuario abre `/clientes` y pulsa nuevo cliente.
2. Captura clave SAP, razón social, RFC, dirección fiscal, una o más direcciones de entrega, contacto, correo y si requiere certificado.
3. El sistema valida los campos obligatorios, el formato del RFC y del correo, y revisa que la clave SAP y el RFC no pertenezcan a otro cliente.
4. El sistema guarda el cliente, reemplaza sus destinos y escribe la bitácora en un solo lote.
5. El usuario abre el cliente y captura sus valores de referencia particulares por parámetro.
6. El sistema comprueba que el rango particular esté dentro del internacional y lo guarda.

Flujos alternos

- A1. Falta un dato obligatorio o el RFC no tiene formato válido. El sistema muestra el mensaje del primer error y no guarda.
- A2. El RFC ya pertenece a otro cliente. El sistema responde "El RFC ya pertenece a otro cliente. Revisa los datos existentes." Lo mismo pasa si dos personas guardan el mismo RFC a la vez, porque la base de datos lo rechaza.
- A3. La clave SAP ya existe. El sistema responde "La clave SAP ya pertenece a otro cliente. Usa una clave diferente."
- A4. El rango particular es más amplio que el internacional. El sistema responde que los límites particulares deben estar dentro del rango internacional.
- A5. El usuario inactiva al cliente sin motivo. El sistema pide "Escribe el motivo de inactivación." Un cliente inactivo se puede reactivar.
- A6. El cliente no tiene límite propio para un parámetro. El certificado usa el internacional de ese parámetro (BR-REF-01).

#### UC-03 Registrar lotes e inspecciones

- Actor principal. Usuario de transacción.
- Requisitos y reglas. RF-04, BR-INS-02, BR-INS-04, D-08, D-15.
- Precondición. Ninguna adicional para el lote. Para una inspección el lote debe existir.
- Postcondición. La inspección queda creada con una secuencia asignada por el sistema y su fila de bitácora.

Flujo normal

1. El usuario abre `/lotes/nuevo` y captura número de lote, producto, fecha de producción y caducidad.
2. El sistema normaliza el número a mayúsculas, valida el formato y que la caducidad sea posterior a la producción, y guarda el lote.
3. En el detalle del lote, el usuario pulsa iniciar inspección.
4. El sistema busca la última inspección del lote, calcula la siguiente secuencia (A, B, … Z, AA) y crea la inspección.
5. El sistema abre la pantalla de captura de esa inspección.

Flujos alternos

- A1. La última inspección está incompleta. El sistema responde "Completa la inspección X antes de crear otra."
- A2. La última inspección ya está completa. Es una re-inspección y el sistema pide "Una nueva inspección necesita el motivo de la falla del equipo." El motivo se guarda en `reinspection_reason` y la bitácora usa la acción `reinspect`.
- A3. Dos personas inician una inspección al mismo tiempo. Solo una obtiene la secuencia y la otra recibe "Otra persona ya inició una inspección. Actualiza el lote y revisa la inspección más reciente."
- A4. El usuario intenta editar un lote que ya tiene un certificado emitido. El sistema responde "El lote ya tiene un certificado emitido y no se puede modificar."

#### UC-04 Capturar resultados y analizar la calidad

- Actor principal. Usuario de transacción.
- Requisitos y reglas. RF-04, BR-INS-03, BR-CER-04, BR-EQP-03, BR-AUD-03, D-09.
- Precondición. La inspección existe y no está bloqueada.
- Postcondición. Los resultados quedan guardados. La inspección está completa cuando tiene los diez parámetros.

Flujo normal

1. El usuario abre `/inspecciones/[id]`.
2. Elige el alveógrafo y el farinógrafo con que midió y captura los valores. La coma funciona como separador decimal.
3. Mientras escribe, la pantalla muestra la desviación contra los límites internacionales.
4. El usuario guarda. El sistema valida que cada valor sea un número no negativo y que cada máquina con valores tenga su equipo.
5. El sistema comprueba que el equipo elegido sea del tipo correcto y esté disponible, guarda los valores y la bitácora, y responde cuántos parámetros faltan o que la inspección está completa.

Flujos alternos

- A1. El usuario deja parámetros vacíos. El guardado parcial se acepta y la inspección sigue incompleta.
- A2. Un valor no es número, es negativo o es demasiado grande. El campo se marca con el error.
- A3. El equipo elegido está inactivo o sin límites. El sistema responde "Este equipo no está disponible para certificar (inactivo o sin valores de referencia)."
- A4. Un valor queda fuera de rango. No bloquea nada y se ve como desviación con signo (BR-CER-04).
- A5. La inspección ya se usó en un certificado. El sistema responde "La inspección ya se usó en un certificado y no se puede modificar."

#### UC-05 Generar y emitir el certificado

- Actor principal. Usuario de transacción.
- Requisitos y reglas. RF-05, BR-CER-01, BR-CER-02, BR-CER-04, BR-CER-05, D-10, D-17, D-24, D-26, D-27, BR-AUD-03.
- Precondición. El cliente está activo y el lote tiene inspecciones.
- Postcondición. El certificado emitido tiene una copia fija de las diez líneas y su hash, y la inspección queda bloqueada.

Flujo normal

1. El usuario abre `/certificados/nuevo` y elige cliente y lote.
2. Captura orden de compra y, si ya los tiene, cantidades, factura, fecha de envío, dirección de entrega del cliente, transportista y si lleva firma.
3. El sistema comprueba que el cliente esté activo, que la dirección sea de ese cliente y que la última inspección del lote esté completa.
4. El sistema asigna el folio `CER-YYYY-NNNNNN`, guarda el borrador y escribe la bitácora.
5. En el detalle, la pantalla muestra las diez líneas con el valor, el límite aplicado (del cliente o internacional), la desviación y la lista de lo que falta para emitir.
6. El usuario completa los datos de embarque y pulsa emitir, con la opción de enviar en ese momento activada por omisión.
7. El sistema calcula el SHA-256, guarda las líneas, cambia el estado a emitido, bloquea la inspección y escribe la bitácora en un solo lote.
8. Si el envío estaba activado, continúa con UC-06.

Flujos alternos

- A1. El lote no tiene inspecciones. El sistema responde "El lote no tiene inspecciones registradas."
- A2. La última inspección está incompleta. El sistema bloquea con "La última inspección del lote (X) está incompleta. Complétala antes de certificar." Nunca toma en silencio una inspección anterior completa (D-27).
- A3. Faltan datos de embarque. La pantalla lista cada bloqueo, por ejemplo "Falta el número de factura.", "Falta la cantidad entregada.", "Falta la fecha de envío.", "Falta la dirección de entrega." y "Falta el transportista."
- A4. La fecha de envío cae antes de la producción o después de la caducidad del lote. El sistema lo marca como bloqueo.
- A5. El cliente se inactivó después de crear el borrador. El sistema bloquea con "El cliente está inactivo."
- A6. Dos personas emiten el mismo certificado a la vez. Solo una emisión se guarda y la otra recibe "El certificado ya fue emitido."
- A7. El usuario intenta editar un certificado emitido. El sistema responde que ya fue emitido y no se puede modificar.
- A8. El usuario cancela un certificado emitido o enviado. El sistema pide motivo, cambia el estado a cancelado y conserva líneas, hash y bloqueo (D-25). Un borrador no se cancela.

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuario de transacción
  participant P as Pantalla /certificados/[id]
  participant A as issueCertificate (server action)
  participant S as session.requireRole
  participant L as certificate-data.loadCertificate
  participant D as domain/certificate
  participant DB as Neon (db.batch)
  participant M as deliver + mailer

  U->>P: Pulsa "Emitir" (enviar ahora activado)
  P->>A: issueCertificate(id, form)
  A->>S: requireRole()
  S-->>A: usuario de transacción
  A->>L: loadCertificate(id)
  L->>DB: certificado, cliente, lote, última inspección, límites
  L->>D: pickCertifiableInspection, buildCertificateLines, issueBlockers
  D-->>L: diez líneas y lista de bloqueos
  L-->>A: datos cargados
  alt hay bloqueos
    A-->>P: fail(primer bloqueo)
  else sin bloqueos
    A->>D: certificateHash(...)
    D-->>A: SHA-256
    A->>DB: batch [insert certificate_lines, update certificates a issued, update inspections.locked_at, insert audit_log issue]
    alt la llave de certificate_lines ya existe (23505)
      DB-->>A: error
      A-->>P: fail("El certificado ya fue emitido.")
    else
      DB-->>A: ok
      A->>M: deliver(id, usuario, "send")
      M->>M: renderCertificatePdf + sendEmail (simulado)
      M->>DB: batch [insert deliveries, update certificates a sent, insert audit_log send]
      M-->>A: destinatarios
      A-->>P: succeed("Certificado emitido y enviado a ...")
    end
  end
  P-->>U: Aviso (toast) y estado actualizado
```

#### UC-06 Enviar el certificado por correo

- Actor principal. Sistema, iniciado por el usuario de transacción.
- Requisitos y reglas. RF-05, RF-06, D-13.
- Precondición. El certificado está emitido o enviado.
- Postcondición. Queda una fila en `deliveries` con fecha, usuario, destinatarios y resultado, y una fila de bitácora `send` o `resend`.

Flujo normal

1. Al emitir con envío activado, o al pulsar enviar o reenviar en el detalle, el sistema arma la lista de destinatarios con el correo del contacto del cliente y el del almacén, sin repetidos.
2. Genera el PDF y lo adjunta a un correo con asunto "Certificado de calidad CER-… · Lote … · OC …".
3. Entrega el correo a `sendEmail`. Hoy el envío es simulado, así que solo se registra en el log del servidor y se reporta como entregado.
4. Guarda la evidencia del envío, cambia el estado a enviado y escribe la bitácora en un solo lote.

Flujos alternos

- A1. El certificado es un borrador. El sistema responde "Emite el certificado antes de enviarlo."
- A2. El certificado está cancelado. El sistema responde "El certificado está cancelado y ya no se envía."
- A3. El envío falla. Se guarda el intento con `succeeded = false` y el error, el estado no cambia y el usuario ve "El envío falló" con el motivo.
- A4. El certificado ya se envió. La acción se registra como `resend`.

#### UC-07 Imprimir el certificado

- Actor principal. Almacenista, que recibe el PDF por correo. Los usuarios de transacción y de consulta también lo abren desde la aplicación.
- Requisitos y reglas. RF-05, RF-07, D-10, D-18, D-26.
- Precondición. El certificado existe.
- Postcondición. Ninguna, es solo lectura.

Flujo normal

1. El usuario abre `/certificados/[id]/pdf`, o el almacenista abre el adjunto del correo.
2. El sistema comprueba el rol (transacción o consulta), genera el PDF con la copia guardada de las líneas y lo muestra en el navegador.
3. Con `?descargar=1` el archivo se descarga en lugar de abrirse.

Flujos alternos

- A1. El folio no tiene el formato `CER-YYYY-NNNNNN` o no existe. La ruta responde 404 "Certificado no encontrado."
- A2. El rol no es transacción ni consulta. La ruta responde 403.
- A3. El certificado es un borrador o está cancelado. El PDF sale con la marca "BORRADOR · sin validez" o "CANCELADO · sin validez", y el nombre del archivo de un borrador termina en `-borrador.pdf`.

#### UC-08 Consultar histórico, reportes y estadísticas (pendiente de integrar, PR #33 y PR #37)

- Actor principal. Usuario de consulta. El usuario de transacción también tiene acceso.
- Requisitos y reglas. RF-07, D-19, D-25, BR-AUD-01.
- Precondición. Ninguna adicional.
- Postcondición. Cada exportación deja una fila de bitácora con acción `export`, formato, número de filas y filtros.

Flujo normal

1. El usuario abre `/reportes`.
2. Elige un periodo rápido o un rango de fechas, un cliente y un estado. Los filtros quedan en la URL.
3. El sistema muestra indicadores, gráficas, detalle de desviaciones e histórico paginado.
4. El usuario pulsa exportar y elige `.xlsx` o CSV.
5. El sistema vuelve a validar los filtros en el servidor, genera el archivo, escribe la bitácora y lo descarga.

Flujos alternos

- A1. Una fecha no es válida, por ejemplo 2026-02-31. Se descarta. Un rango al revés se invierte.
- A2. No hay registros con esos filtros. La exportación responde "No hay registros disponibles para exportar con los filtros seleccionados."
- A3. El usuario de consulta pulsa un folio. Se abre el PDF, porque no tiene acceso a `/certificados`.
- A4. El administrador intenta entrar. Ve "Acceso restringido", porque `modules.ts` no le da Reportes.

### Diagrama de estados de la inspección

El estado no es una columna, se deriva de los resultados y de `locked_at`.

```mermaid
stateDiagram-v2
  [*] --> Incompleta : startLotInspection asigna la secuencia
  Incompleta --> Incompleta : guardado parcial
  Incompleta --> Completa : los diez parámetros tienen valor
  Completa --> Incompleta : se borra un valor
  Completa --> Completa : se corrige un valor
  Completa --> Bloqueada : un certificado se emite (locked_at)
  Bloqueada --> [*]
  note right of Completa
    Una nueva inspección del mismo lote
    (re-inspección) exige motivo de falla
    de equipo (BR-INS-04, D-15)
  end note
  note right of Bloqueada
    Solo lectura (BR-AUD-03).
    Cancelar el certificado no la desbloquea (D-25)
  end note
```

### Diagrama de estados del certificado

```mermaid
stateDiagram-v2
  [*] --> draft : createCertificate (folio D-17)
  draft --> draft : updateCertificate
  draft --> issued : issueCertificate sin bloqueos
  issued --> sent : envío exitoso
  issued --> issued : envío fallido (queda la evidencia)
  sent --> sent : reenvío
  issued --> cancelled : cancelCertificate con motivo
  sent --> cancelled : cancelCertificate con motivo
  cancelled --> [*]
  note right of draft
    Un borrador no se cancela,
    simplemente no se emite
  end note
```

| Estado | Etiqueta en pantalla | Se puede editar | Se puede enviar | Se puede cancelar |
| --- | --- | --- | --- | --- |
| draft | Borrador | Sí | No | No |
| issued | Emitido | No | Sí | Sí |
| sent | Enviado | No | Sí (reenvío) | Sí |
| cancelled | Cancelado | No | No | No |

### Reglas de negocio implementadas

| Id | Regla | Dónde está |
| --- | --- | --- |
| BR-EQP-01 | Clave de equipo aleatoria, única, de 8 caracteres | `domain/equipment.ts` `generateEquipmentKey` |
| BR-EQP-03 | Equipo sin límites para todos sus parámetros, o no activo, no se usa para certificar | `domain/equipment.ts` `equipmentReadiness` |
| BR-CLI-01 | Clave SAP obligatoria, única, máximo 10 caracteres | `domain/client-validation.ts` y restricción única |
| BR-CLI-02 | RFC con formato válido y único | `domain/client-validation.ts` y migración 0002 |
| BR-CLI-03 | Clientes inactivados con motivo, nunca borrados | `clientes/actions.ts` `changeClientStatus` |
| BR-REF-01 | Los límites del cliente ganan por parámetro y los demás caen al internacional, sin ampliar el rango | `domain/quality.ts` `resolveReferenceValues`, `isWithinInternational` |
| BR-INS-02 | Secuencia A..Z, AA..ZZ, AAA..ZZZ asignada por el sistema | `domain/inspection-sequence.ts` |
| BR-INS-03 | Inspección completa cuando los diez parámetros tienen valor | `domain/quality.ts` `missingParameters` |
| BR-INS-04 | Re-inspección solo después de una completa y con motivo de falla | `domain/lot.ts` `startInspection` |
| BR-CER-01 | Se usa la última inspección del lote, y solo si está completa | `domain/certificate.ts` `pickCertifiableInspection` |
| BR-CER-02 | Se exigen resultados de ambas máquinas | `domain/certificate.ts` `buildCertificateLines` |
| BR-CER-04 | Fuera de rango nunca bloquea, produce desviación con signo | `domain/quality.ts` `evaluate` |
| BR-CER-05 | Factura, cantidad entregada, fecha de envío, destino y transportista antes de emitir | `domain/certificate.ts` `issueBlockers` |
| BR-AUD-01 | Cada cambio escribe una fila de bitácora con número de empleado y nombre | `lib/audit.ts` |
| BR-AUD-03 | Resultados de solo lectura una vez usados en un certificado | `issueCertificate` y `saveInspectionResults` |

La desviación es la distancia con signo al límite más cercano cuando el valor queda fuera de rango, y es 0 cuando está dentro. Un valor igual a un límite está dentro de norma.

## Diseño de interfaces (Interface Design)

### Server actions

Las mutaciones son server actions de Next.js en `src/app/(app)/<módulo>/actions.ts`. Los formularios las llaman con `useFormAction` y reciben un `ActionState` con `ok`, `message`, `fieldErrors` y `at`, así que un error de validación no borra lo que el usuario escribió y el aviso sale una sola vez. Clientes es la excepción, porque sus acciones redirigen a `/clientes?error=...`.

| Módulo | Acción | Rol | Bitácora (acción, entidad) |
| --- | --- | --- | --- |
| Usuarios | `createUser` | admin | create, user |
| Usuarios | `updateUser` (rol y estado, cierra sus sesiones) | admin | update, deactivate o reactivate, user |
| Clientes | `saveClient` | transacción | create o update, clients |
| Clientes | `changeClientStatus` | transacción | deactivate o reactivate, clients |
| Clientes | `saveClientLimit`, `removeClientLimit` | transacción | update_limit o remove_limit, clients |
| Equipos | `createEquipment`, `updateEquipment` | transacción | create o update, equipment |
| Equipos | `changeEquipmentStatus` | transacción | deactivate, reactivate o retire, equipment |
| Equipos | `saveInternationalLimit` | transacción | update, international_limit |
| Lotes | `createLot`, `updateLot` | transacción | create o update, lot |
| Lotes | `startLotInspection` | transacción | create o reinspect, inspection |
| Inspecciones | `saveInspectionResults` | transacción | update, inspection |
| Certificados | `createCertificate`, `updateCertificate` | transacción | create o update, certificate |
| Certificados | `issueCertificate` | transacción | issue, certificate |
| Certificados | `sendCertificate` | transacción | send o resend, certificate |
| Certificados | `cancelCertificate` | transacción | cancel, certificate |
| Reportes | `exportCertificatesAction(filtros, formato)` (pendiente de integrar, PR #37) | transacción y consulta | export, certificate con id `history` |

Las lecturas viven en `data.ts` de cada módulo y en `src/lib/certificate-data.ts`, `inspection-data.ts` y `reference-data.ts`. La Bitácora lee con `listAuditLog`, que llama a `requireRole("transaction", "query")` y no tiene ninguna función de escritura (pendiente de integrar, PR #31).

### Route handlers

| Ruta | Método | Rol | Respuesta |
| --- | --- | --- | --- |
| `/api/auth/[...all]` | GET, POST | Público | API de Better Auth para iniciar y cerrar sesión. El registro público está apagado |
| `/certificados/[id]/pdf` | GET | transacción y consulta | `application/pdf` con `Content-Disposition` inline, o attachment con `?descargar=1`, y `Cache-Control: private, no-store`. 403 sin rol, 404 si no existe |

El PR #32 proponía una ruta `/reportes/exportar` para la exportación. El PR #37 la descartó y usa la server action, que devuelve el `.xlsx` en base64 o el CSV como texto. Este documento describe la opción del PR #37.

### Correo

La interfaz está en `src/lib/services/mailer.ts`.

```ts
sendEmail({ to: string[], subject: string, text: string, attachments?: { filename, content: Buffer }[] })
  => { ok: true, simulated: boolean, messageId } | { ok: false, simulated: boolean, error }
```

Hoy `isEmailSimulated()` devuelve `true`, así que el mensaje se registra en el log del servidor con destinatarios, asunto y tamaño de los adjuntos, nunca con el contenido. El buzón de almacén sale de `WAREHOUSE_EMAIL` y, si no existe, usa `almacen@demo.test`. Para enviar de verdad hay que implementar Resend detrás de `RESEND_API_KEY` con la misma firma, y quien llama no cambia (D-13).

### Exportación a Excel y Power BI (pendiente de integrar, PR #37)

`src/lib/services/report-export.ts` genera dos formatos con las mismas quince columnas descritas en Diseño de pantallas y reportes.

- `.xlsx` con exceljs, con fechas reales en hora de planta, números con tipo y acentos correctos.
- CSV según RFC 4180 con BOM UTF-8 y fin de línea CRLF. Cada celda de texto va entre comillas, las comillas internas se duplican y un texto que empieza con `=`, `+`, `-` o `@` lleva un apóstrofo para que la hoja de cálculo no lo ejecute como fórmula.

### Interfaz con la base de datos

`getDb()` crea el cliente Drizzle sobre `@neondatabase/serverless` la primera vez que se usa, así que `next build` funciona sin variables de entorno. El driver HTTP de Neon no tiene transacciones interactivas, por eso las operaciones que deben ser atómicas usan `db.batch([...])`. En las pruebas con base local el PR #38 agrega un cliente `node-postgres` que solo se activa con `E2E_LOCAL_POSTGRES=1` y fuera de Vercel (pendiente de integrar, PR #38).

## Calidad de servicio (Quality of Service)

Las guías de prueba escritas están en `docs/testing/`, con un índice en `docs/testing/README.md` (pendiente de integrar, PR #39). Las guías son estas.

- `docs/testing/pruebas-unitarias-es.md`
- `docs/testing/pruebas-componentes-es.md`
- `docs/testing/pruebas-integrales-es.md`
- `docs/testing/pruebas-sistema-es.md`
- `docs/testing/pruebas-regresion-es.md`
- `docs/testing/pruebas-aceptacion-es.md`

En GitHub se ven en https://github.com/ValleryR/harinas-elizondo/tree/docs/testing-guides/docs/testing mientras el PR #39 no tenga merge.

### Resultados de pruebas reportados en los PR

Los números de esta tabla son solo los que reportan los PR, con la corrida que cada uno cita. Las guías del PR #39 se corrieron el 2026-11-11 en el commit 331ef38, que es la punta de la rama del PR #38, y nunca contra Neon.

| Tipo | Ids | Herramienta | Resultado reportado | Fuente |
| --- | --- | --- | --- | --- |
| Unitarias | PU-01 a PU-44 | Vitest | 133 de 133 pruebas pasan, 44 casos en Pass | PR #39 |
| Componentes | PC-01 a PC-14 | Vitest con Postgres 16 local | 12 de 12 pasan, PC-13 y PC-14 Pendiente | PR #36, PR #39 |
| Integrales | PI-01 a PI-06 | Playwright con Postgres local | 6 pasan | PR #38, PR #39 |
| Sistema | PS-01 a PS-16 | Playwright y revisión manual | 6 pasan, PS-07 omitida, 10 Pendiente | PR #38, PR #39 |
| Regresión | PR-01 a PR-07 | GitHub Actions | 4 Pass, 3 Pendiente | PR #29, PR #39 |
| Aceptación | PA-01 a PA-06 | Guion con usuarios reales | 0 ejecutadas, 6 Pendiente | PR #39 |

Los PR de funciones agregan pruebas que todavía no están en esa corrida. El PR #31 reporta 143 pruebas en 16 archivos con 24 nuevas de Bitácora. El PR #35 reporta 134 pruebas con 5 nuevas de la navegación. El PR #37 reporta 152 pruebas en 18 archivos con 23 nuevas de Reportes. Cada número se midió en su propia rama, así que no se suman.

Las corridas de CI citadas son https://github.com/ValleryR/harinas-elizondo/actions/runs/43103295253, https://github.com/ValleryR/harinas-elizondo/actions/runs/43159071569 y https://github.com/ValleryR/harinas-elizondo/actions/runs/43161348610.

### Atributos de calidad

| Atributo | Indicador | Cómo lo cumple el diseño | Evidencia |
| --- | --- | --- | --- |
| Seguridad | Acceso restringido por perfil | `requireRole` en cada acción y lectura, `ModuleGate` en cada pantalla, rol desconocido tratado como consulta, cuenta inactiva sin sesión, registro público apagado, redirección solo a rutas del mismo sitio | PU de `permissions.test.ts`, PC-07, PC-11, PS-01 a PS-03, PS-05, PS-06 |
| Confiabilidad | Datos validados antes de emitir | Zod en cada formulario, `issueBlockers`, última inspección completa obligatoria, restricciones únicas y CHECK en la base de datos, emisión atómica | PU de `certificate.test.ts`, PC-08 a PC-10, PI-06, PS-04 |
| Integridad de la información | Bitácora y control de cambios | Fila de bitácora en cada mutación dentro del mismo lote, inspecciones bloqueadas, copia fija de líneas, hash SHA-256 verificado en pantalla | PC-01, PC-06, PC-08, PC-12 |
| Disponibilidad | Acceso en horario laboral | Deploy en Vercel y base de datos administrada en Neon | Pendiente (#19) |
| Usabilidad | Interfaz clara y navegación simple | Todo en español, avisos por acción, errores por campo sin perder lo escrito, menú filtrado por rol, menú móvil (pendiente de integrar, PR #35) | PA-01 a PA-06 pendientes |
| Mantenibilidad | Arquitectura modular | Una carpeta por módulo, reglas puras en `src/lib/domain/` con pruebas, una sola lista de módulos | Suite unitaria y CI (PR #29) |
| Trazabilidad | Acciones registradas por usuario | `audit_log` con número de empleado y nombre, pantalla de Bitácora (pendiente de integrar, PR #31), exportación auditada (pendiente de integrar, PR #37) | PC-14 y PS-15 pendientes |

> TODO (equipo): tiempos de respuesta medidos en vivo en https://harinas-elizondo.vercel.app con Neon (por ejemplo carga de `/certificados`, emisión y generación del PDF). Ningún PR los midió.

> TODO (equipo): nota de disponibilidad del deploy durante el periodo de pruebas, tomada de Vercel.

> TODO (equipo): resultados de la verificación en vivo contra Neon (#19), que llenan PS-08 a PS-14.

> TODO (equipo): resultados de la UAT con al menos dos personas externas al equipo, identificadas como P1 y P2, con tareas completadas, tiempos y errores de PA-01 a PA-06.

## Diseño de la base de datos (Database Design)

### Motor y conexión

La base de datos es PostgreSQL administrado por Neon, en el plan gratuito y en la región de Washington, D.C., conectado al proyecto de Vercel desde el Marketplace. Neon entrega `DATABASE_URL` y `DATABASE_URL_UNPOOLED` a todos los ambientes. La aplicación se conecta por HTTP con `@neondatabase/serverless`, que funciona bien en funciones sin servidor porque no mantiene conexiones abiertas.

### Llaves y restricciones

- Llaves naturales donde el negocio ya tiene un identificador legible. El lote usa su número, el equipo su clave de 8 caracteres, el certificado su folio y el parámetro su código.
- Llaves sustitutas donde no lo hay. Clientes usa uuid, inspecciones, envíos y bitácora usan serial.
- Llaves compuestas para las tablas de detalle. `client_limits` (cliente, parámetro), `inspection_results` (inspección, parámetro) y `certificate_lines` (certificado, parámetro). La de `certificate_lines` además impide emitir dos veces el mismo certificado.
- Restricciones únicas en `clients.sap_key`, `clients.rfc`, `equipment.serial_number`, `user.email`, `user.employee_id`, (`inspections.lot_id`, `sequence`) y (`client_delivery_addresses.client_id`, `position`).
- Restricciones CHECK que obligan a que el límite inferior no supere al superior en `international_limits` y `client_limits`.
- Todas las llaves foráneas usan `ON DELETE no action`, salvo `session` y `account`, que se borran en cascada con su usuario. Esto encaja con la regla de no borrar datos de negocio.

### Tipos enumerados

| Enum | Valores |
| --- | --- |
| `record_status` | active, inactive, retired |
| `equipment_type` | alveograph, farinograph |
| `certificate_status` | draft, issued, sent, cancelled |

El rol del usuario es texto y no enum, porque Better Auth define la tabla `user`. Los valores válidos los controla `isRole` en `src/lib/permissions.ts`.

### Índices

| Índice | Columnas | Para qué sirve |
| --- | --- | --- |
| `audit_log_entity_idx` | entity, entity_id | Historial de un equipo o certificado y filtros de Bitácora |
| `certificates_client_idx` | client_id | Certificados por cliente en Reportes |
| `certificates_lot_idx` | lot_id | Certificados de un lote |
| `inspections_lot_sequence_uq` | lot_id, sequence | Unicidad de la secuencia y búsqueda de la última inspección |
| `client_delivery_addresses_position_uq` | client_id, position | Orden y unicidad de destinos |
| `session_user_id_idx`, `account_user_id_idx`, `verification_identifier_idx` | varias | Índices estándar de Better Auth |

### Concurrencia y atomicidad

Neon por HTTP no ofrece transacciones interactivas, así que el diseño usa dos mecanismos. Primero, `db.batch([...])` envía varias sentencias que Neon ejecuta en una sola transacción, y se usa en cada cambio que debe guardarse junto con su bitácora. Segundo, las carreras entre usuarios las decide la base de datos con restricciones únicas, y la aplicación traduce el error 23505 a un mensaje en español. Así se resuelven el RFC repetido, la secuencia de inspección simultánea, el folio de certificado y la doble emisión. Las pruebas PC-03, PC-05 y PC-09 fuerzan tres de esas carreras (RFC, secuencia y doble emisión) de forma determinista (pendiente de integrar, PR #36).

### Datos iniciales

`pnpm db:seed` es idempotente y crea los diez parámetros, límites internacionales de demostración y dos usuarios de demostración, `laboratorio@demo.test` (transacción) y `consulta@demo.test` (consulta). Los límites de demostración no son oficiales (Q-14). El administrador inicial se crea aparte con `pnpm db:create-admin`.

## Instalación (Installation)

### Requisitos

- Node.js 22 o más reciente.
- pnpm en la versión fijada en `package.json`, que se instala con `corepack enable`.
- Una base de datos PostgreSQL en Neon para iniciar sesión y guardar datos.
- Docker, solo para correr las pruebas de componentes, integrales y de sistema en local (pendiente de integrar, PR #36 y PR #38).

### Variables de entorno

Los valores reales nunca se guardan en el repositorio. Solo `.env.example` está versionado.

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión a Neon. La entrega Vercel al conectar Neon |
| `BETTER_AUTH_SECRET` | Secreto de sesión, por ejemplo generado con `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL del sitio |
| `SEED_PASSWORD` | Contraseña de los usuarios de demostración del seed. Va en `.env`, no en `.env.local` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Cuenta del administrador inicial para `pnpm db:create-admin`, contraseña de 12 a 128 caracteres |
| `WAREHOUSE_EMAIL` | Buzón del almacén, opcional |
| `RESEND_API_KEY` | Planeada para el correo real, todavía no se usa |
| `TEST_DATABASE_URL` | Base local cuyo nombre termina en `_test`, solo para pruebas (pendiente de integrar, PR #36) |

### Pasos

1. Clonar el repositorio.

   ```bash
   git clone https://github.com/ValleryR/harinas-elizondo.git
   cd harinas-elizondo
   ```

2. Instalar dependencias y crear el archivo de configuración local.

   ```bash
   pnpm install
   cp .env.example .env.local
   ```

3. En Vercel, abrir Storage, agregar Neon desde el Marketplace y conectarlo al proyecto en todos los ambientes. Después bajar las variables.

   ```bash
   vercel link
   vercel env pull .env.local
   ```

   `vercel link` y `vercel env pull` agregan `.env*` al `.gitignore`, y eso escondería `.env.example`. Hay que revertir esa línea con `git checkout .gitignore` antes de hacer commit.

4. Agregar `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` en Vercel y en `.env.local`.

5. Aplicar las migraciones.

   ```bash
   pnpm db:migrate
   ```

6. Poner `SEED_PASSWORD` en `.env` y cargar los datos iniciales. Después crear el administrador con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

   ```bash
   pnpm db:seed
   pnpm db:create-admin
   ```

7. Arrancar la aplicación y abrir http://localhost:3000.

   ```bash
   pnpm dev
   ```

8. Correr las revisiones antes de cada PR.

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   ```

9. Correr las pruebas con base de datos local (pendiente de integrar, PR #36 y PR #38). Las suites solo aceptan una base local cuyo nombre termine en `_test` y nunca apuntan a Neon.

   ```bash
   docker run -d --name harinas-test-db -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=harinas_test -p 127.0.0.1:54329:5432 postgres:16
   TEST_DATABASE_URL=postgresql://test:test@localhost:54329/harinas_test pnpm test:int
   pnpm exec playwright install chromium
   TEST_DATABASE_URL=postgresql://test:test@localhost:54329/harinas_test pnpm test:e2e
   ```

### Despliegue

Cada push a una rama crea una vista previa en Vercel y cada push a `main` despliega producción. `vercel.json` fija el preset de Next.js, así que un proyecto nuevo de Vercel no necesita configuración manual. Las vistas previas están detrás de Vercel Authentication y el alias de producción es público. El workflow `CI` de GitHub Actions corre typecheck, lint, pruebas y build en cada PR y en cada push a `main` (pendiente de integrar, PR #29), y después del merge el dueño del repositorio debe marcarlo como check obligatorio.

## Asuntos abiertos y cerrados (Open and Closed Issues)

### Asuntos cerrados

Las decisiones están registradas en `docs/llm/decisions.md`.

| Id | Fecha | Decisión |
| --- | --- | --- |
| D-01 | 2026-10-22 | Next.js 16 (App Router, TypeScript, Tailwind v4) con deploy en Vercel |
| D-02 | 2026-10-22 | Postgres en Neon con Drizzle ORM |
| D-03 | 2026-10-22 | Better Auth con correo y contraseña, `role` y `employeeId` en el usuario |
| D-04 | 2026-10-22 | shadcn sobre base-ui, Sonner y recharts |
| D-05 | 2026-10-22 | El prototipo v0.1 se mueve sin cambios a `legacy/prototipo-v0.1/` |
| D-06 | 2026-10-22 | Nombres de tablas y columnas en inglés, con glosario que mapea el borrador en español |
| D-07 | 2026-10-22 | Dos tablas de límites, `international_limits` y `client_limits` |
| D-08 | 2026-10-22 | Después de Z la secuencia sigue AA, AB … ZZ, AAA, con máximo 3 letras |
| D-09 | 2026-10-22 | Una inspección guarda los resultados de ambas máquinas |
| D-10 | 2026-10-22 | Las líneas del certificado son una copia fija de valor, límites y desviación |
| D-11 | 2026-10-22 | Flujo de trabajo en el fork con PR al `main` del fork. En la práctica los PR actuales ya se abren en el repositorio del equipo |
| D-12 | 2026-10-22 | Límites por cliente y no por cliente y producto |
| D-13 | 2026-10-22 | Correo con Resend y PDF con `@react-pdf/renderer`. En desarrollo el correo se registra y no se envía |
| D-14 | 2026-10-22, confirmada 2026-11-11 | Cuentas desde el seed y una pantalla de Usuarios donde un administrador separado da de alta y desactiva cuentas. Registro público apagado |
| D-15 | 2026-10-22 | Re-inspección permitida a cualquier usuario de transacción que escriba el motivo de falla |
| D-16 | 2026-10-22 | Inactivo es temporal y reversible, baja es definitiva. Ambos con motivo |
| D-17 | 2026-10-22 | Folio `CER-YYYY-NNNNNN` con contador anual de 6 dígitos |
| D-18 | 2026-10-22 | La firma digital es una casilla que imprime un bloque firmado, sin criptografía |
| D-19 | 2026-10-22 | Exportación del histórico en `.xlsx` (exceljs) y CSV |
| D-20 | 2026-10-22 | Ambos roles pueden leer la bitácora |
| D-21 | 2026-10-22 | El producto del lote es texto libre con sugerencias |
| D-22 | 2026-11-04 | Cliente con una dirección fiscal y uno o más destinos en `client_delivery_addresses` |
| D-23 | 2026-11-04 | Los límites particulares pueden estrechar pero no ampliar el rango internacional |
| D-24 | 2026-11-10 | El certificado guarda copia del destino elegido y el transportista, ambos obligatorios para emitir |
| D-25 | 2026-11-10 | Los certificados emitidos o enviados se cancelan con motivo y nunca se borran |
| D-26 | 2026-11-10 | Hash SHA-256 del contenido emitido, impreso en el PDF y verificado en pantalla |
| D-27 | 2026-11-10 | BR-CER-01 usa la última inspección del lote y bloquea si está incompleta |
| Q-15 | 2026-11-10 | Firma con hash, transportista y cancelación. Resuelta por D-24 a D-27. El issue #8 sigue abierto en GitHub aunque la decisión ya está registrada |

### Asuntos abiertos

| Id | Pregunta | Propuesta | Responsable |
| --- | --- | --- | --- |
| Q-11 | Unidades de cada parámetro, porque las actuales son una propuesta tomada de los anexos de los equipos (issue #9) | El equipo decide, posiblemente con el profesor | Equipo |
| Q-12 | Quién construye cada módulo antes del 2026-11-13 | Un módulo por PR | Equipo |
| Q-13 | La humedad que mencionó el profesor no es uno de los diez factores de RF-02. Falta saber con qué método o equipo se captura y si es un factor adicional (issue #9) | Esperar la aclaración y no usar la absorción de agua como humedad | Equipo |
| Q-14 | Qué especificación oficial da los rangos numéricos y las unidades confirmadas de los diez factores (issue #9) | Los valores del seed son solo de demostración | Equipo |
| Q-16 | Si el certificado se envía solo a clientes especiales. Aparece en un comentario de `src/lib/domain/certificate.ts` y no está en la tabla de `decisions.md` | Por ahora todo cliente con correo lo recibe | Equipo |

### Decisiones sin confirmar de Reportes (PR #32 y PR #37)

Los PR #32 y #37 resuelven Reportes de dos formas y ambos listan decisiones que todavía no están en `decisions.md`. El equipo debe confirmarlas antes del merge. Este documento describe la versión del PR #37, que va encima del PR #33.

| Tema | PR #32 | PR #37 |
| --- | --- | --- |
| Borradores y cancelados | Borradores fuera. Cancelados en la lista y contados aparte | Borradores fuera. Cancelados en el histórico, contados aparte y fuera de indicadores, desviaciones y gráficas |
| Alcance del filtro de estado | Solo la tabla y la exportación, no las estadísticas | Todo el reporte (tabla, indicadores, gráficas y exportación) |
| Periodo por omisión | Año en curso | Todo el histórico (como lo dejó el PR #33) |
| Zona horaria | Hora fija de planta (UTC-6) | Hora fija de planta (UTC-6) |
| Enlace del folio para consulta | Abre el PDF | Abre el PDF |
| Fila de bitácora de la exportación | Entidad `certificate`, id `history` | Entidad `certificate`, id `history` |
| Acceso del administrador | Sin acceso a Reportes | Sin acceso a Reportes |
| Mecanismo de exportación | Ruta `/reportes/exportar` | Server action que devuelve el archivo (xlsx en base64) |

### Observaciones encontradas en el código

- El módulo de Clientes escribe la entidad `clients` y las acciones `update_limit` y `remove_limit`, que no están en los tipos `AuditEntity` y `AuditAction` de `src/lib/audit.ts`. La Bitácora las etiqueta y su filtro acepta `client` y `clients` (pendiente de integrar, PR #31). Clientes tampoco usa `requireRole` ni `ActionState` como los demás módulos.
- `main` en 2b30a0f falla `pnpm lint` en `reportes/export-button.tsx` y `pnpm build` en `/reportes`. Lo corrigen el PR #37 y, como arreglo mínimo para CI, el commit cf231f5 del PR #36.
- El correo sigue simulado. Pasar a Resend necesita una llave de API (D-13).
- La exportación no se ha abierto en Excel ni en Power BI, y la regla que exige CI en `main` y una corrida desde un fork siguen pendientes (PR-05 a PR-07).

> TODO (equipo): revisar este documento completo con todo el equipo antes de exportarlo a PDF (paso 10 del issue #24).
