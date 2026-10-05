# 🍽️ NeoFood CRM & POS — Sistema Integral de Gestión Gastronómica

<div align="center">

![NeoFood Banner](https://img.shields.io/badge/NeoFood-SaaS%20%26%20POS-4f46e5?style=for-the-badge&logoColor=white)
![Version](https://img.shields.io/badge/Versi%C3%B3n-1.7.5-10b981?style=for-the-badge)
![MultiTenant](https://img.shields.io/badge/Arquitectura-Multi--Tenant-blueviolet?style=for-the-badge)
![Status](https://img.shields.io/badge/Estado-Producci%C3%B3n-blue?style=for-the-badge)
![Author](https://img.shields.io/badge/Creador-Leonardo%20Ramirez-8b5cf6?style=for-the-badge)
[![Manual](https://img.shields.io/badge/Manual-de%20Usuario-0284c7?style=for-the-badge)](MANUAL_DE_USUARIO.md)
[![Certificado](https://img.shields.io/badge/Certificado-de%20Autor%C3%ADa-amber?style=for-the-badge)](CERTIFICATE.md)

<br/>

**Plataforma Cloud SaaS Multi-Tenant de Punto de Venta (POS), Tienda Virtual Pública con Pedidos por WhatsApp, Pantalla de Cocina (KDS), Control de Caja y Turnos, Gestión de Inventario e Insumos, Sub-recetas y Producción, Compras, Proveedores, Facturación y Reportes Financieros en PDF para restaurantes, cafeterías, bares y cadenas gastronómicas.**

[Manual de Usuario](MANUAL_DE_USUARIO.md) •
[Certificado de Autoría](CERTIFICATE.md) •
[Novedades v1.7.5](#-novedades-de-la-versión-175) •
[Novedades v1.7.0](#-novedades-de-la-versión-170) •
[Módulos](#-módulos-del-sistema) •
[Arquitectura](#-arquitectura-y-stack-tecnológico) •
[Instalación](#-guía-de-instalación-y-puesta-en-marcha) •
[Licencia](LICENSE) •
[Changelog](CHANGELOG.md)

</div>

---

## 🚀 Descripción General

**NeoFood** es una plataforma de software de última generación diseñada para automatizar, controlar y elevar la eficiencia operativa de cualquier establecimiento gastronómico. La solución unifica el flujo completo del negocio:
- Toma ágil de pedidos en salón por mesas y pedidos para llevar.
- Costeo automático de insumos y materia prima con sub-recetas y Costo Medio Ponderado (CMP).
- Tienda virtual pública con horarios semanales de doble jornada y despacho automático a WhatsApp.
- Control de caja con apertura, cierres ciegos y arqueos detallados.
- Facturación con emisión de comprobantes en PDF corporativo.
- Módulo avanzado de reportes diarios y mensuales con descarga documental.

Diseñado bajo principios de **arquitectura modular limpia**, **100% CSS Nativo** optimizado (sin dependencias innecesarias de frameworks pesados), máxima velocidad de respuesta e interfaz ultra premium.

---

## 🌟 Características del Sistema

- ⚡ **Rendimiento Ultrarrápido:** Frontend impulsado por **Vite** y **React 18**, con carga instantánea y optimización de chunks.
- 🎨 **Diseño Visual Ejecutivo y Cohesivo:** Identidad visual sólida basada en tonos pizarra (`#1e293b`), acento índigo corporativo (`#4f46e5`), degradados esmeralda y tipografías modernas.
- 🖥️ **Punto de Venta (POS) en Pantalla Completa:** Experiencia sin scroll exterior de ventana; cuadrícula interactiva, catálogo táctil y carrito con scroll interno confinado.
- 📊 **Módulo de Reportes & Exportación PDF:** Generación institucional en PDF de reportes diarios de caja, consolidados mensuales y facturas de venta con el servicio centralizado `reportPdfService`.
- 🛡️ **Seguridad y Permisos:** Autenticación robusta con JSON Web Tokens (JWT), refresh tokens, hash Bcrypt, política estricta de contraseñas seguras multicriterio y control de acceso basado en roles (*SuperAdmin*, *Administrador*, *Cajero*, *Mesero*).
- 📦 **Componentes de Alto Nivel:** Modales elegantes con fondo difuminado (`backdrop-filter`), formularios con feedback táctil y selectores interactivos (`CustomSelect`) con buscador reactivo superior.

---

## 🆕 Novedades de la Versión 1.7.5

### Dashboard Ejecutivo & Accesos Rápidos
1. **Barra de Accesos Rápidos Temáticos:** Insertada entre los KPIs y el diagrama central con 7 botones operativos ergonómicos (Venta / POS, Cocina, Tienda Virtual, Caja, Inventario, Producción, Compras) con paleta de color temática propia y micro-interacciones hover.
2. **Visualización Sin Scroll Vertical:** Altura del gráfico de ventas optimizada a 295px, tarjetas de métricas compactas y paneles laterales con paginación integrada para garantizar que todo el panel operativo se aprecie completo en una sola pantalla sin scroll.

### Rediseño Estructural de la Barra Lateral (Sidebar)
3. **Navegación Agrupada por Dominios:** Organización en 4 secciones funcionales (*Operaciones*, *Inventario & Stock*, *Finanzas & Reportes*, *Administración*) con encabezados sutiles y divisores elegantes, manteniendo el acceso a 1 solo clic.
4. **Logotipo Oficial en Pie de Sidebar:** El recuadro del perfil inferior exhibe el logotipo oficial del restaurante en 42x42px con fallback dinámico, acompañado del nombre del usuario y la sede.
5. **Hover Dinámico de Alta Visibilidad:** Micro-interacción con fondo índigo suave (`#ede9fe`), texto e icono en color primario (`#4f46e5`), desplazamiento a la derecha (`translateX(4px)`) y escalado de icono.
6. **Resolución Menú Móvil:** Corrección en selectores CSS Modules para el drawer en pantallas pequeñas y botón ergonómico de cierre `X`.

### Filtros, Reglas de Negocio y Limpieza de Recursos
7. **Buscador Reactivo en Selectores (`CustomSelect`):** Filtrado en tiempo real con campo sticky y autoenfoque en todos los menús desplegables del sistema.
8. **Exclusión de Insumos Internos:** En `ProductForm`, las materias primas utilizadas en sub-recetas quedan automáticamente excluidas de la selección directa de ingredientes para platillos finales.
9. **Limpieza Física de Archivos en Disco (`fileCleaner`):** Supresión física automática de archivos huérfanos e imágenes sustituidas o eliminadas en disco para logos, banners y fotos de productos.
10. **Buscadores y Paginadores en Módulos:** Búsqueda en vivo en *Catálogo de Ventas*, *Categorías* y buscador con filtro de estados y paginación en *Producción*.

### Seguridad y Política Estricta de Contraseñas
11. **Validador de Contraseñas Multicriterio (`passwordValidator`):** Verificación obligatoria en Backend y Frontend que exige de forma simultánea: mínimo 8 caracteres, al menos una mayúscula (`A-Z`), una minúscula (`a-z`), un número (`0-9`) y un carácter especial (`[^A-Za-z0-9]`). Protege el onboarding público (`RegisterTenant`) y la gestión de personal (`UsersManager`).
12. **Checklist Visual Reactivo:** Asistente interactivo en tiempo real en los formularios que guía al usuario marcando en verde cada requisito alcanzado mientras tipea la contraseña.
13. **Alternancia de Visibilidad (`Eye`/`EyeOff`):** Botón ergonómico para mostrar/ocultar la contraseña al crear cuentas o asignar accesos.

---

## 🆕 Novedades de la Versión 1.7.0

### Módulo de Producción y Costeo Automático (Sub-recetas)
1. **Gestión de Insumos Elaborados:** Diferenciación entre Materia Prima (comprada) e Insumos Elaborados (creados en cocina, ej. Masas, Salsas).
2. **Formulación y Recetas:** Capacidad de definir la fórmula exacta (receta) para los elaborados, especificando rendimiento y mermas.
3. **Órdenes de Producción:** Registro de lotes de producción que descuentan automáticamente la materia prima del inventario central.
4. **Cálculo de Costo Medio Ponderado (CMP):** Al producir un lote, el sistema consolida el costo real de los insumos usados y recalcula dinámicamente el valor unitario del producto elaborado en el inventario.

### Refactorización de Arquitectura de Inventario
5. **Separación Catálogo/Stock:** Consolidación de `Product` netamente como artículo de exhibición y venta (POS), y de `Ingredient` como el único responsable del stock físico, simplificando el modelo mental y preparando el terreno para recetas finales de venta.

---

## 🆕 Novedades de la Versión 1.6.0

### Tienda Virtual Pública Multi-Tenant (`/tienda/:slug`)
1. **Catálogo Online Autónomo:** Cada restaurante cuenta con una URL pública propia (`/tienda/:slug`) para exhibir su menú a clientes en cualquier dispositivo, con diseño gastronómico de alto impacto sin necesidad de descargas.
2. **Personalizador y Carrito Interactivo:** Modificación de bases, términos y adiciones con recálculo dinámico de precio. Carrito inferior flotante con total en tiempo real.
3. **Checkout con Despacho Directo a WhatsApp:** Formulario con selección de Domicilio o Retiro en Local, dirección, notas y métodos de pago oficiales (Efectivo y métodos activos del restaurante). Al confirmar, genera y abre la conversación de WhatsApp con el pedido estructurado y crea la comanda en el sistema.
4. **Visibilidad de Productos:** Cada producto en inventario cuenta con el selector "¿Mostrar en Tienda Virtual?" para decidir qué platillos son públicos.

### Horarios de Atención Semanal con 2 Turnos por Día
5. **Apertura y Cierre Automático en Vivo:** La tienda evalúa la hora del cliente en tiempo real; si está fuera de horario, pausa la toma de pedidos y muestra un aviso informativo claro.
6. **Configuración Día a Día con Checkbox:** Control manual e independiente para activar o desactivar cada día de la semana. Los días inactivos quedan marcados con etiqueta `Cerrado`.
7. **Soporte de 2do Turno (Horario Partido):** Botón `[+]` para configurar dos turnos en un mismo día (ej. Almuerzo 11:30 AM - 3:00 PM y Cena 6:30 PM - 11:00 PM), con botón `[🗑]` para remover el segundo turno fácilmente.

### Módulo de Cocina Digital (KDS) (`/cocina`)
8. **Pantalla de Cocina en Tiempo Real:** Nuevo módulo en el sidebar para que los cocineros visualicen las comandas activas, sus tiempos transcurridos, notas y estado de preparación.

### Configuración de Marca y Gestión de Logotipo
9. **Rejilla Compacta Lado a Lado:** Integración elegante en `/configuracion` con Logotipo a la izquierda (`1fr`) y Horarios a la derecha (`2fr`).
10. **Eliminación y Formato Fijo de Logo:** Endpoint `DELETE /api/store/logo` para retirar el logo con un clic y previsualización estricta fija (80x80 px con `object-cover`) para evitar distorsiones.

### Gestión de Pedidos Online (`/pedidos-tienda`)
11. **Monitor de Comandas Web:** Recepción de pedidos online con alertas sonoras en vivo, alertas visuales en el sidebar y botón para facturar directamente a la caja activa.

---

## 🆕 Novedades de la Versión 1.5.0

### Gestión de Entidades — Eliminación Completa

1. **Eliminación de Usuarios:** El módulo `/usuarios` permite ahora eliminar permanentemente una cuenta de usuario, incluyendo toda su trazabilidad de caja y actividad interna.
2. **Eliminación de Restaurantes (SuperAdmin):** Desde el panel `/saas`, el SuperAdmin puede eliminar un restaurante de forma definitiva, cascadeando automáticamente todos los datos asociados (ventas, facturas, usuarios, clientes, productos, sesiones de caja, etc.). Adicionalmente, el sistema elimina automáticamente restaurantes que lleven más de 2 meses en estado `SUSPENDED` o `INACTIVE`.
3. **Eliminación de Métodos de Pago:** En `/configuracion` es posible eliminar métodos de pago que no tengan ventas o créditos asociados, con protección por error descriptivo si ya tienen historial contable.

### Producto con Fotografía

4. **Imagen de Producto Opcional:** En el módulo de inventario y catálogo, cada producto puede tener una foto subida directamente desde el formulario. La imagen se almacena en el servidor (`/uploads/products/`) y se renderiza tanto en el catálogo del POS como en el carrito de ventas.

### Créditos y Facturación a Crédito

5. **Registro correcto de Ventas a Crédito:** Corrección de error crítico en `sales.service.js` que causaba violación de constraint `tenantId` al crear la sesión de caja. Las ventas a crédito ahora se registran correctamente.
6. **Historial de Crédito en Facturas:** El modal de detalles de cada factura muestra ahora un **Historial de Crédito** completo: deuda inicial, cada abono con fecha y método de pago, barra de progreso y saldo final (✓ Saldada o pendiente en rojo).
7. **Modal de Abono Rediseñado:** Al registrar un abono, el modal muestra: deuda original, total abonado, barra de progreso visual, historial de abonos previos y cálculo en tiempo real del saldo restante tras el nuevo abono.
8. **`finalAmount` correcto al saldar:** Corrección de bug donde al pagar el total de una factura a crédito, `finalAmount` quedaba en `$0`. Ahora se restaura a `totalAmount` y el método de pago cambia al real, convirtiendo la factura en una factura normal completamente pagada.
9. **Tabla de Facturas mejorada:** Las filas de crédito muestran la deuda original tachada y el saldo pendiente en rojo; las facturas saldadas muestran "✓ Pagada" en verde.
10. **Métodos de pago inactivos ocultos en Abonos:** Los métodos desactivados ya no aparecen en el selector del modal de registro de abonos.

### Control de Caja

11. **Acceso de CAJERO a historial de caja:** La ruta `GET /cash/history` ahora permite el rol `Cajero`, filtrando automáticamente solo sus propias sesiones. Anteriormente el panel de resumen de caja aparecía vacío para los cajeros.
12. **Mini historial unificado en Caja:** El panel de sesión activa muestra ahora una sección **"Actividad del Turno"** con todos los movimientos en orden cronológico: ventas normales (verde), ventas a crédito (amarillo), abonos recibidos (índigo), ingresos manuales (azul) y retiros (rojo).

### Correcciones de Bugs

13. **Error 500 al confirmar pago (POS):** Corrección de `Null constraint violation` en `tenantId` al crear sesiones de caja.
14. **Error 403 al registrar venta a crédito:** Ajuste de permisos en la ruta de ventas para el rol `Cajero`.
15. **Saldo de cliente no actualizaba en pantalla:** Tras registrar un abono, la lista de clientes se recarga automáticamente para reflejar el nuevo balance.
16. **Ficha visual del restaurante:** Corrección de desbordamiento de texto en el modal de detalle de restaurante cuando el correo de acceso era muy largo.

---

## 🆕 Novedades de la Versión 1.4.0 (SaaS Multi-Tenant)

Esta versión transforma a NeoFood en una plataforma **SaaS Multi-Tenant Cloud** completa:

1. **Arquitectura Multi-Tenant Hermética en Base de Datos:**
   - Base de datos compartida optimizada con discriminador `tenantId` en los 17 modelos operativos.
   - Restricciones compuestas únicas (`@@unique([tenantId, name])`) que permiten nombres idénticos de mesas, categorías y métodos de pago entre distintos restaurantes sin colisión.
   - Conservación íntegra del 100% del historial de ventas, productos y configuración inicial asignada al tenant principal (*NeoFood Sede Principal*).

2. **Motor de Aislamiento Automático en Backend (`AsyncLocalStorage` & Prisma Extensions):**
   - Inyección automática de `tenantId` en lecturas (`findMany`, `findFirst`, `count`, `aggregate`) y escrituras (`create`, `createMany`).
   - Escudo contra ataques cruzados: interceptores en `findUnique`, `update` y `delete` que bloquean cualquier intento de acceso o modificación a registros pertenecientes a otro restaurante.
   - Middlewares inteligentes (`tenant.middleware.js` y `auth.middleware.js`) que validan el estado de la suscripción (`ACTIVE`, `SUSPENDED`, `TRIAL`).

3. **Onboarding & Registro Público de Restaurantes (`/registro`):**
   - Pantalla moderna de registro SaaS con generador de slug en tiempo real (`neofood/mi-restaurante`).
   - Creación atómica en transacción (`prisma.$transaction`) del nuevo restaurante, sus roles predeterminados (*Administrador*, *Cajero*, *Mesero*), métodos de pago base (*Efectivo*, *Transferencia / QR*, *Tarjeta*) y cuenta de administrador.
   - Enlace directo desde la pantalla de login.

4. **Panel de Control SuperAdmin SaaS (`/saas`):**
   - Vista exclusiva para usuarios con rol `SuperAdmin`.
   - Métricas globales de la plataforma: Restaurantes registrados, usuarios activos, ventas acumuladas e ingresos totales procesados.
   - Búsqueda en tiempo real y filtrado de sedes por estado y plan.
   - Suspensión y reactivación inmediata de restaurantes con un solo clic (bloqueo instantáneo de acceso en la API).
   - Asignación y actualización de planes de suscripción (*Plan Básico*, *Plan Pro*, *Plan Enterprise*).

5. **Experiencia Frontend Multi-Tenant:**
   - Header superior con chip visual que muestra el restaurante activo y su nivel de plan.
   - Menú lateral dinámico con indicador de la sede activa.
   - Facturación y reportes PDF adaptados dinámicamente con el nombre del restaurante emisor.

---

## 🆕 Novedades Previas (v1.3.0)

1. **Módulo de Reportes & Estadísticas (`/reportes`):**
   - Selector dinámico de rango: **Reporte Diario** vs. **Reporte Mensual Consolidado**.
   - Integración del calendario institucional unificado (`Datepicker`).
   - Métricas financieras en tarjetas KPI (Ventas totales, Órdenes cobradas, Ticket promedio, Efectivo vs. Digital).
   - Generación de reportes ejecutivos en PDF para arqueo de turnos y balances de meses históricos.

2. **Nuevo Formato Ejecutivo de Facturas en PDF:**
   - Rediseño completo del PDF de facturación en [InvoicesManager](file:///c:/Users/Asus%20TUF/Documentos/Proyectos%20programación/Versiones/Neofood%201.2/frontend/src/pages/InvoicesManager.jsx) para equiparar la estética de los reportes: cabecera oscura institucional, fichas de cliente y venta, tabla de ítems con detalle de adiciones/variedades y bloque de total destacado en COP.

3. **Optimización del Layout del Salón y POS (`/ventas`):**
   - Altura estrictamente adaptada a la ventana (`100% viewport`) para eliminar scroll exterior en toda la aplicación.
   - Cada mesa cuenta con su propio contenedor visual e icono temático de restaurante (`Utensils`), con microanimaciones hover en estados *Disponible* y *Ocupada*.

4. **Rediseño Integral de la Sección de Configuración (`/configuracion`):**
   - Pestañas tipo píldora con contadores automáticos de mesas y medios de pago.
   - Tarjetas de mesas enriquecidas con indicadores de servicio y borrado rápido.
   - Listado de métodos de pago con conmutadores visuales (*Activo / Inactivo*).

5. **Modales y Tablas Corporativas Unificadas:**
   - Cabeceras llamativas estilo tabla (`#1e293b`) con línea divisoria índigo.
   - Modal de *Nueva Compra* totalmente integrado.
   - Modales ampliados para *Proveedores*, *Usuarios* y *Clientes*.
   - Filtro de búsqueda en tiempo real en el módulo de *Proveedores*.
   - Corrección de visualización del calendario en el modal de estado de cuenta de clientes.

---

## 🧩 Módulos del Sistema

| Módulo | Ruta | Descripción |
| :--- | :--- | :--- |
| 🛒 **Punto de Venta (POS)** | `/ventas` | Salón interactivo con mesas, venta rápida para llevar, modificadores/adiciones, notas de cocina, propinas e impuestos. |
| 🍳 **Cocina Digital (KDS)** | `/cocina` | Monitor de comandas en preparación en tiempo real para cocineros, con visualización de modificaciones y tiempos. |
| 🏪 **Tienda Virtual Pública** | `/tienda/:slug` | Menú web público para clientes con personalizador de platillos, carrito flotante y checkout con envío a WhatsApp. |
| 📲 **Pedidos Tienda Web** | `/pedidos-tienda` | Bandeja de órdenes recibidas desde la tienda virtual, cambio de estados, chat directo y facturación a caja. |
| 💵 **Caja y Turnos** | `/caja` | Apertura de turno con base, arqueos ciegos, registro de ingresos/egresos y desglose por método de pago. |
| 🧾 **Facturas** | `/facturas` | Historial de comprobantes emitidos, filtro por rango de fechas, visualización detallada y exportación en PDF corporativo. |
| 📊 **Reportes** | `/reportes` | Analíticas de ventas, comparativas históricas de meses anteriores y descarga en PDF de balances de caja y ventas. |
| 📦 **Inventario e Insumos** | `/inventario` | Control de materias primas, unidades de medida, costos unitarios, recetas, fotos y selector de visibilidad en tienda. |
| 🏭 **Producción** | `/produccion` | Formulación de sub-recetas, registro de lotes de producción y cálculo de Costo Medio Ponderado (CMP). |
| 👑 **Control SuperAdmin SaaS** | `/saas` | Gestión de establecimientos, monitoreo global de facturación, conmutación de estado (Activo/Suspendido) y cambio de planes. |
| 🛍️ **Compras** | `/compras` | Registro de facturas de compra en modal dedicado, recepción de insumos, historial y actualización automática de inventario. |
| 🏢 **Proveedores** | `/proveedores` | Directorio con NIT, canales de contacto, barra de búsqueda en vivo y vinculación directa a compras. |
| 👥 **Clientes** | `/clientes` | Fichas de clientes, historial de consumo, cartera de fiados/créditos y estados de cuenta. |
| 🔐 **Usuarios y Roles** | `/usuarios` | Gestión de cuentas de personal con asignación de roles jerárquicos y estados activo/inactivo. |
| ⚙️ **Configuración** | `/configuracion` | Configuración de mesas, métodos de pago, logo y horarios de atención (2 turnos) de la tienda virtual. |
| 📈 **Dashboard** | `/` | Vista gerencial con ventas del día, pedidos activos, productos estrella y gráficas de facturación. |

---

## 🛠️ Arquitectura y Stack Tecnológico

```mermaid
graph TD
    Client[🖥️ Terminal POS / Dispositivo Móvil / PC] -->|React 18 + Vite| Frontend[🎨 Frontend SPA]
    Frontend -->|REST API / Axios + JWT| Backend[⚙️ Node.js + Express API]
    Frontend -->|reportPdfService + jsPDF| PDF[📄 Documentos PDF Ejecutivos]
    Backend -->|Prisma ORM| Database[(🐘 PostgreSQL)]
```

### Backend
- **Entorno:** Node.js (>= 18.x)
- **Framework Web:** Express.js
- **Base de Datos:** PostgreSQL
- **ORM:** Prisma ORM
- **Seguridad:** JWT (JSON Web Tokens) + Bcrypt + Cors
- **Arquitectura:** Modular orientada por dominios de negocio

### Frontend
- **Librería Principal:** React 18
- **Empaquetador:** Vite 5
- **Estilos:** **CSS3 Nativo** (CSS Modules + Variables CSS + Cero sobrecarga de frameworks)
- **Iconografía:** Lucide React
- **Navegación:** React Router DOM (v6)
- **Selector de Fechas:** `react-tailwindcss-datepicker` con temas integrados
- **Motor de Reportería PDF:** `jspdf` + `jspdf-autotable` + `html2canvas`

---

## 📁 Estructura del Proyecto

```text
Neofood 1.2/
├── Backend/
│   ├── prisma/
│   │   ├── migrations/          # Historial de migraciones SQL
│   │   └── schema.prisma        # Modelo relacional de datos
│   ├── scripts/
│   │   └── seed.js              # Sembrado de roles y usuario admin
│   ├── src/
│   │   ├── config/              # Configuración de base de datos
│   │   ├── middlewares/         # Autenticación JWT y control de errores
│   │   ├── modules/             # Lógica dividida por dominio
│   │   │   ├── auth/            # Login, tokens y sesiones
│   │   │   ├── cash/            # Turnos y movimientos de caja
│   │   │   ├── customers/       # Clientes y cuentas por cobrar
│   │   │   ├── inventory/       # Productos, categorías e insumos
│   │   │   ├── purchases/       # Compras y proveedores
│   │   │   ├── reports/         # Estadísticas y consultas financieras
│   │   │   ├── sales/           # POS, ventas y métodos de pago
│   │   │   ├── tables/          # Salón y gestión de mesas
│   │   │   └── users/           # Cuentas de usuario y roles
│   │   └── server.js            # Servidor HTTP Express (Puerto 4000)
│   └── package.json
│
├── frontend/
│   ├── public/                  # Favicons y recursos públicos
│   ├── src/
│   │   ├── api/                 # Instancia Axios e interceptores
│   │   ├── components/          # Componentes reutilizables
│   │   │   ├── cash/            # Modales de caja y turnos
│   │   │   ├── dashboard/       # KPIs y gráficos
│   │   │   ├── inventory/       # Formularios de insumos y categorías
│   │   │   ├── purchases/       # Formulario modal de compras
│   │   │   ├── sales/           # Carrito, opciones y checkout
│   │   │   └── ui/              # Modal, CustomSelect, Pagination
│   │   ├── context/             # AuthContext y estados globales
│   │   ├── layouts/             # MainLayout (Sidebar, Navbar, Footer)
│   │   ├── pages/               # Vistas (Ventas, Caja, Facturas, Reportes, etc.)
│   │   ├── services/            # Servicios API y reportPdfService.js
│   │   ├── styles/              # Variables CSS y tokens de diseño
│   │   ├── App.jsx              # Rutas principales protegidas
│   │   └── main.jsx             # Punto de entrada de React
│   └── package.json
│
└── Readme.md                    # Documentación institucional del proyecto
```

---

## 💻 Guía de Instalación y Puesta en Marcha

### 1. Prerrequisitos
- **Node.js** v18.0.0 o superior
- **PostgreSQL** v14 o superior activo
- **npm** o **yarn**

---

### 2. Configuración del Backend

1. Accede a la carpeta del backend e instala dependencias:
   ```bash
   cd Backend
   npm install
   ```

2. Configura las variables de entorno en el archivo `Backend/.env`:
   ```env
   PORT=4000
   DATABASE_URL="postgresql://usuario:password@localhost:5432/neofood_db?schema=public"
   JWT_SECRET="tu_clave_secreta_jwt_super_segura"
   JWT_REFRESH_SECRET="tu_clave_refresh_jwt_super_segura"
   ```

3. Ejecuta las migraciones e inserta los datos iniciales (Seed):
   ```bash
   npx prisma migrate dev --name init_db
   npm run seed
   ```

4. Inicia el backend en modo desarrollo:
   ```bash
   npm run dev
   ```
   *El servidor API estará escuchando en: `http://localhost:4000`*

---

### 3. Configuración del Frontend

1. En una nueva terminal, ingresa al frontend e instala dependencias:
   ```bash
   cd frontend
   npm install
   ```

2. Inicia el servidor de desarrollo Vite:
   ```bash
   npm run dev
   ```
   *La aplicación estará lista en: `http://localhost:5173`*

---

## 🔑 Credenciales de Acceso

El sistema cuenta con dos cuentas maestras preconfiguradas para pruebas y administración:

| Rol / Entorno | Usuario | Contraseña | Establecimiento / Acceso |
| :--- | :--- | :--- | :--- |
| **Super Administrador** | `admin@neofood.com` | `123456` | Acceso global SaaS (`/saas`) y Sede Principal |
| **Administrador de Tienda (Demo)** | `demo@neofood.com` | `123456` | Restaurante Demo (`restaurante-demo`) operativo |

> [!TIP]
> - **Tienda Virtual QR Demo:** Puedes acceder directamente a la tienda virtual de demostración en `http://localhost:5173/tienda/restaurante-demo`.
> - **Restablecimiento Limpio:** Para volver a vaciar todas las ventas y dejar la base de datos limpia como nueva en cualquier momento, ejecuta en la carpeta `Backend`: `npm run seed:clean`.

---

## 📦 Construcción para Producción

Para generar el bundle optimizado y minificado para despliegue:

```bash
cd frontend
npm run build
```

El resultado se compilará en `frontend/dist/` listo para ser servido en producción.

---

## 📜 Documentación, Legalidad y Comunidad

El proyecto cuenta con un ecosistema completo de documentación oficial, directrices operativas y marcos de gobernanza y protección de propiedad intelectual:

| Documento | Descripción | Enlace |
| :--- | :--- | :--- |
| **Certificado de Creación y Autoría** | Certificación legal y técnica de autoría de Leonardo Ramirez | [Ver CERTIFICATE.md](CERTIFICATE.md) |
| **Manual de Usuario Operativo** | Guía visual y de uso módulo por módulo del sistema | [Ver MANUAL_DE_USUARIO.md](MANUAL_DE_USUARIO.md) |
| **Términos de Licencia Comercial** | Licencia de uso, restricciones y propiedad intelectual | [Ver LICENSE](LICENSE) |
| **Historial de Versiones (Changelog)** | Registro cronológico y detallado de cada versión y parche | [Ver CHANGELOG.md](CHANGELOG.md) |
| **Guía de Contribución** | Estándares técnicos, arquitectura y flujo de Pull Requests | [Ver CONTRIBUTING.md](CONTRIBUTING.md) |
| **Política de Seguridad** | Protocolo de reporte responsable y directrices multi-tenant | [Ver SECURITY.md](SECURITY.md) |
| **Código de Conducta** | Estándares de convivencia comunitaria (Contributor Covenant v2.1) | [Ver CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |

---

## 👨‍💻 Autoría y Certificación

<div align="center">

**NeoFood POS & ERP** — Versión **1.7.5 SaaS Cloud Edition**  
Diseñado, Creado y Arquitectado Exclusivamente por **Leonardo Ramirez**  
*Autor y Titular de los Derechos Morales y Patrimoniales de la Obra de Software*  
*Sistema Integral de Gestión Gastronómica &copy; 2026. Todos los derechos reservados.*

[📜 Ver Certificado Oficial de Creación y Propiedad Intelectual](CERTIFICATE.md)

</div>