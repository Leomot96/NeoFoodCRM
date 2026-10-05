# Changelog — NeoFood POS & CRM

Todos los cambios relevantes de este proyecto quedan documentados en este archivo.
El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/) y usa versionado [Semántico](https://semver.org/lang/es/).

## [1.7.6] — 2026-10-05

### Añadido

#### Landing Page Comercial Pública & Catálogo de Precios
- **Página de Aterrizaje Ejecutiva (`/` y `/landing`):** Nueva landing page pública de alta conversión desarrollada 100% en CSS modular nativo, alineada a la identidad de marca de NeoFood (`Orbitron`, `Plus Jakarta Sans`, `#4f46e5` índigo y `#10b981` esmeralda).
- **Anuncio de Período de Prueba Gratuito (7 Días):** Cintillo superior con animación sutil destacando la prueba gratuita sin necesidad de ingresar tarjeta de crédito.
- **Selector de Ciclos de Facturación & Matriz de Precios:** Selector dinámico de periodicidad (*Mensual*, *Semestral* y *Anual* con 17% de ahorro y 2 meses gratis). Presentación detallada de los planes comercializables (*Emprendedor*, *Profesional / Restaurante*, *Cadenas / Franquicias*) con límites de mesas, usuarios, productos e insumos.
- **Showcase Interactivo de Módulos:** Hero section con ventana de previsualización interactiva con pestañas para alternar vistas de *Punto de Venta (POS)*, *Cocina (KDS)*, *Tienda WhatsApp*, *Caja & Turnos* y *Métricas en Vivo*.
- **Spotlight de Tienda Virtual WhatsApp:** Sección dedicada a la carta digital interactiva para comensales con generación instantánea del pedido y despacho directo a WhatsApp con 0% de comisiones por venta.
- **Integración Fluida con Onboarding (`/registro`):** Enlaces directos desde los planes comerciales que transportan la selección mediante parámetros de consulta (`?plan=[slug]&mode=[trial|paid]&cycle=[monthly|semiannual|annual]`), preseleccionando automáticamente el plan y activando el interruptor de prueba gratuita en `RegisterTenant.jsx`.
- **Enrutamiento Inteligente en `App.jsx` (`RootRoute`):** Los visitantes anónimos que entran a la raíz `/` acceden de inmediato a la Landing Page comercial; los usuarios autenticados son dirigidos de forma transparente al Dashboard. Ruta fija `/landing` disponible permanentemente.
- **Enlaces de Retorno y Navegación Cruzada:** Botones "← Volver a la página principal" y "← Conoce más sobre NeoFood" añadidos en las páginas de Registro (`RegisterTenant.jsx`) y de Inicio de Sesión (`Login.jsx`).
- **Sección de Preguntas Frecuentes (FAQ) & Garantía:** Acordeón expandible con dudas operativas clave (migración de datos, impresoras térmicas, sin contratos de permanencia) y acceso a asesoría humana vía WhatsApp.

---

## [1.7.5] — 2026-10-03

### Añadido

#### Dashboard Ejecutivo & Accesos Rápidos
- **Barra de Accesos Rápidos Temáticos:** Insertada entre las tarjetas de KPIs y el diagrama con 7 botones principales ergonómicos (Venta / POS, Cocina, Tienda Virtual, Caja, Inventario, Producción, Compras) con paleta de color propia y micro-interacciones hover.
- **Diseño sin Scroll Vertical:** Altura del gráfico de ventas optimizada a 295px y paneles laterales de Alertas y Top Platillos sincronizados con paginación integrada para visualización ejecutiva completa en una sola pantalla.

#### Rediseño Estructural de la Barra Lateral (Sidebar)
- **Navegación Agrupada por Dominios Operativos:** Menú organizado en 4 bloques funcionales con títulos sutiles y divisores (*Operaciones*, *Inventario & Stock*, *Finanzas & Reportes*, *Administración*) manteniendo el acceso en 1 solo clic.
- **Logotipo Oficial en el Pie de la Sidebar:** El pie de la barra lateral ahora muestra el logotipo oficial del restaurante en un recuadro de 42x42px con bordes suaves, junto al nombre del usuario y del establecimiento.
- **Hover Dinámico de Alta Visibilidad:** Efecto hover interactivo con fondo índigo suave (`#ede9fe`), texto e icono en color primario (`#4f46e5`), desplazamiento sutil a la derecha (`translateX(4px)`) y escalado de icono.
- **Icono Distintivo para Clientes:** Asignación del icono `UserCheck` en la sidebar para diferenciar el directorio de clientes del de usuarios.

#### Filtros de Búsqueda, Limpieza y Mantenimiento de Datos
- **Buscador Reactivo en Selectores (`CustomSelect`):** Campo de búsqueda sticky superior con autoenfoque y filtrado en tiempo real en todos los desplegables del sistema.
- **Regla de Exclusión de Insumos Internos:** En `ProductForm`, las materias primas usadas para fabricar insumos elaborados quedan excluidas de la selección de ingredientes directos para venta.
- **Limpieza de Archivos en Disco (`fileCleaner`):** Borrado físico automático en el servidor (`fs.unlinkSync`) de fotos de productos, logotipos y banners anteriores al ser sustituidos o eliminados.
- **Buscadores y Paginación:** Barras de búsqueda en vivo en *Catálogo de Ventas*, *Categorías* y buscador con filtro de estado y paginador en *Producción*.
- **Restablecimiento Limpio de Base de Datos (`npm run seed:clean`):** Script automatizado (`reset_clean_db.js`) para vaciar todo el historial transaccional de pruebas, purgar archivos huérfanos de uploads y resembrar únicamente las cuentas maestras de Super Administrador (`admin@neofood.com`) y Tienda de Demostración (`demo@neofood.com`) con sus métodos de pago, mesas y configuraciones iniciales.

#### Seguridad & Política de Contraseñas Seguras
- **Validador Multicriterio de Contraseñas (`passwordValidator.js`):** Implementación integral en Backend y Frontend de validación estricta de contraseñas exigiendo 5 requisitos simultáneos: mínimo 8 caracteres, al menos una mayúscula (`A-Z`), una minúscula (`a-z`), un número (`0-9`) y un carácter especial (`[^A-Za-z0-9]`).
- **Protección en Onboarding y Gestión de Usuarios:** Integrado de manera obligatoria en `registerTenant`, `registerUser`, `createUser` y `updateUser`.
- **Checklist Dinámico en Vivo en Frontend:** Asistente interactivo en los formularios de Onboarding (`RegisterTenant.jsx`) y de Administración de Personal (`UsersManager.jsx`) que valida y resalta visualmente en verde cada regla conforme el usuario escribe.
- **Alternancia de Visibilidad (`Eye`/`EyeOff`):** Botón integrado en los campos de contraseña para revelar u ocultar la clave al digitarla de forma segura.

### Corregido
- **Menú Móvil (Hamburguesa):** Corregido el bug donde el menú móvil no se desplegaba y la pantalla quedaba oscura al abrirse el backdrop. Se unificaron los selectores de apertura en CSS Modules (`.layoutSidebarOpen`, `.isOpen`, `.is-open`) forzando `transform: translateX(0) !important;` e incorporando el botón de cierre `X` en la cabecera móvil.

---

## [1.7.0] — 2026-10-03

### Añadido

#### Módulo de Producción y Recetas (Sub-Recetas)
- **Gestión de Elaborados (Insumos Elaborados):** Nueva propiedad `isManufactured` en el inventario para diferenciar la Materia Prima directa de los productos elaborados internamente (ej. Salsas, Masas).
- **Recetario Base (Fórmulas):** Creación de recetas exactas para los productos elaborados indicando qué materias primas se requieren y sus proporciones para un rendimiento (yield) específico.
- **Órdenes de Producción (Lotes):** Nuevo módulo para registrar la producción de lotes. Al registrar una producción, el sistema descuenta automáticamente la materia prima del inventario.
- **Costeo Automático (CMP):** Al completar una orden de producción, el sistema suma el costo de los insumos utilizados y recalcula automáticamente el Costo Medio Ponderado (CMP) del insumo elaborado, garantizando la precisión del costo de inventario a lo largo del tiempo.
- **Interfaz de Producción:** Nueva vista en el frontend para gestionar el historial de producción, visualizar el detalle de insumos usados por lote y crear nuevas órdenes con un diseño limpio y alineado al estándar de Neofood.
- **Pestañas de Inventario:** Separación visual en el módulo de Inventario entre "Materias Primas" y "Productos para Producción" mediante pestañas, mejorando el orden del catálogo.

### Modificado
- **Separación de Responsabilidades:** El modelo `Product` ahora está dedicado 100% al catálogo de ventas (POS), mientras que `Ingredient` asume el 100% del control de stock físico e inventariable, preparando el terreno para el descargo de inventario por ventas (Fase 4).

---

## [1.6.0] — 2026-10-02

### Añadido

#### Tienda Virtual Pública Multi-Tenant (`/tienda/:slug`)
- **Catálogo Online Público:** Menú interactivo y responsivo accesible vía URL única por restaurante (`/tienda/:slug`).
- **Diseño Gastronómico Centrado en la Marca:** Cabecera con logotipo oficial en dimensiones fijas optimizadas, horarios de atención dinámicos, datos de contacto y cinta animada de anuncios/promociones.
- **Buscador en Vivo y Filtro por Categorías:** Navegación por píldoras deslizables táctiles y filtro en tiempo real.
- **Personalizador de Productos:** Soporte completo para modificar opciones (base, término, variedad) y adiciones con cálculo dinámico de precio.
- **Carrito Flotante Interactivo:** Barra inferior fija con contador de platillos y total actualizado en tiempo real.
- **Checkout Llamativo con Despacho a WhatsApp:** Formulario intuitivo con selector de entrega (Domicilio o Retiro), datos del cliente, dirección, notas y métodos de pago oficiales (Efectivo y métodos activos del restaurante). Al confirmar, genera y abre un mensaje estructurado y listo para enviar al WhatsApp del restaurante, registrando simultáneamente la comanda en el sistema.
- **Navegación & Scroll:** Desplazamiento fluido natural del navegador y margen inferior ergonómico para mejor experiencia en móviles y pantallas táctiles.

#### Gestión Avanzada de Horarios de Atención Semanal
- **Selección Día a Día con Checkbox:** Control manual para marcar qué días abre el restaurante y cuáles no; los días inactivos quedan etiquetados automáticamente como `Cerrado`.
- **Soporte para 2 Turnos Diarios (Horario Partido):** Opción con botón `[+]` para configurar dos jornadas por día (ej. Almuerzo de 11:30 AM a 3:00 PM y Cena de 6:30 PM a 11:00 PM), con botón de papelera `[🗑]` para remover el segundo turno al instante.
- **Evaluación y Apertura Automática en Tiempo Real:** El sistema calcula en vivo si la hora del visitante está dentro de cualquiera de los turnos configurados. Si el local está cerrado, se pausa la recepción de pedidos y se le informa con claridad el horario de atención.
- **Modal de Horarios Semanales:** Ventana emergente en la tienda para que el cliente consulte los turnos completos de lunes a domingo.

#### Control de Productos para Tienda
- **Interruptor "¿Mostrar en la Tienda Virtual?":** Añadido en `ProductForm.jsx` para que cada restaurante decida qué productos de su inventario se publican en la tienda online y cuáles son exclusivos del salón.

#### Gestión de Marca & Configuración de Tienda (`/configuracion` → Pestaña "Tienda Virtual")
- **Diseño Compacto en 2 Columnas:** Rejilla optimizada con Logotipo a la izquierda (`1fr`) y Horarios de Atención a la derecha (`2fr`), manteniendo un estilo limpio y armonioso con el resto del sistema.
- **Gestión y Eliminación de Logotipo:** Carga de logo con previsualización fija y botón para eliminar el logotipo (`DELETE /api/store/logo`) dejando la identidad limpia.
- **Datos de Contacto & WhatsApp de Pedidos:** Configuración de WhatsApp comercial para recepción de comandas automáticas, teléfono, dirección y NIT.
- **Control de Apertura Rápido:** Interruptor general para activar o pausar la tienda online en cualquier momento.
- **Acceso Rápido:** Tarjeta con enlace público del restaurante, botón de "Copiar Enlace" y botón "Ver mi Tienda".

#### Módulo de Cocina Digital (KDS) (`/cocina`)
- **Pantalla de Comandas de Cocina:** Nuevo módulo en el menú lateral para que el equipo de cocina gestione los pedidos en preparación, visualizando ingredientes, modificaciones y notas especiales.

#### Monitor de Pedidos Online & Facturación a Caja (`/pedidos-tienda`)
- **Módulo Administrativo "Tienda Virtual":** Nueva sección en el menú lateral con pestañas de "Pedidos Activos" e "Historial de Ventas Web".
- **Comandas Digitales Activas:** Tablero de pedidos con cronómetro, datos del cliente, acceso directo a WhatsApp y cambio de estados (`Por Confirmar` → `En Cocina` → `Listo / En Camino` → `Entregado`).
- **Integración Contable con Caja:** Facturación directa de pedidos de la tienda a la sesión de caja activa del restaurante.
- **Alertas en Tiempo Real:** Polling inteligente, notificación sonora suave (Web Audio API), insignia parpadeante en el sidebar y toast flotante en el Header.

---

## [1.5.0] — 2026-10-01

### Añadido

#### Gestión de Entidades — Eliminación Completa
- **Eliminación de Usuarios:** El módulo `/usuarios` ahora permite eliminar permanentemente una cuenta. El backend protege la acción si el usuario tiene sesiones de caja abiertas.
- **Eliminación de Restaurantes (SuperAdmin):** El panel `/saas` incluye eliminación definitiva de restaurantes con `onDelete: Cascade` en todos los modelos hijos (ventas, facturas, usuarios, clientes, productos, sesiones de caja, créditos, movimientos e inventario).
- **Eliminación automática por inactividad:** Job de limpieza que elimina restaurantes con más de 2 meses en estado `SUSPENDED` o `INACTIVE`.
- **Eliminación de Métodos de Pago:** En `/configuracion` se puede eliminar un método de pago; el backend valida que no tenga ventas ni créditos asociados antes de permitir el borrado.

#### Producto con Fotografía
- **Campo de imagen opcional en Productos:** Selector de imagen con vista previa en el formulario. El archivo se sube via `multipart/form-data` y se almacena en `/uploads/products/`.
- **Imagen en el catálogo POS:** La cuadrícula de productos muestra la foto si está disponible, con fallback al icono por defecto.
- **Imagen en el carrito de ventas:** Cada ítem del carrito muestra un thumbnail de la foto del producto.

#### Créditos y Facturación
- **Historial de Crédito en modal de Facturas:** El modal "Detalle Fra. XXX" incluye la sección "Historial de Crédito": deuda inicial, cada abono con fecha y método, barra de progreso y saldo final.
- **Modal de Abono rediseñado:** Muestra deuda original, barra de progreso, historial de abonos previos y cálculo en tiempo real del saldo restante. Si ya está saldada, oculta el formulario.
- **Métodos de pago inactivos ocultos:** El selector de método filtra automáticamente los métodos desactivados en el modal de abonos y en el módulo de clientes.

#### Control de Caja
- **Acceso CAJERO al historial de caja:** La ruta `GET /api/v1/cash/history` ahora acepta el rol `CAJERO` con filtro automático por `userId`.
- **Mini historial "Actividad del Turno":** Panel de sesión activa con lista cronológica (máx. 30 entradas) que unifica: ventas normales (verde), ventas a crédito (amarillo), abonos (índigo), ingresos manuales (azul) y retiros (rojo).

---

### Corregido

- **`Null constraint violation` en `tenantId` al abrir caja:** `cash.service.js` no propagaba el `tenantId` al crear sesiones. Corregido inyectando el contexto del tenant desde el middleware.
- **Error 500 al confirmar pago en POS:** Derivado del bug anterior; `POST /api/v1/sales` fallaba en la transacción de caja.
- **Error 403 al registrar venta a crédito:** El rol `CAJERO` no tenía permiso en `sales.routes.js`. Añadido al listado de roles permitidos.
- **`finalAmount = $0` al saldar factura de crédito:** Al pagar el último abono, `finalAmount` quedaba en cero. Corregido: cuando `amount === sale.finalAmount`, se restaura `finalAmount = totalAmount` y se actualiza `paymentMethodId` al método real. La factura queda como una normal completamente pagada.
- **Saldo de cliente no actualizaba visualmente:** Se añadió recarga de `GET /customers` en `InvoicesManager.jsx` tras cada abono exitoso.
- **Modal de ficha de restaurante — desbordamiento de correo:** Correo largo se salía del modal. Corregido con `word-break: break-all`.
- **Historial de caja vacío para cajeros:** La ruta `history` solo permitía `ADMIN` y `SUPERVISOR`. Añadido `CAJERO`.

---

### Modificado

- `invoice.service.js` → `addAbono()`: Lógica de actualización de `Sale` refactorizada para distinguir abono parcial (decrement) de pago total (restaurar a `totalAmount`).
- `InvoicesManager.jsx` → Tabla: Las filas de crédito muestran valor original tachado y saldo pendiente en rojo. Si está saldada muestra "✓ Pagada" en verde.
- `InvoicesManager.jsx` → Footer del modal de detalles: Cambiado a "Total de la Factura: `totalAmount`".
- `Caja.jsx`: Añadida sección "Actividad del Turno" que fusiona `sales`, `customerCredits` y `cashMovements`.
- `cash.routes.js`: Añadido `ROLES.CAJERO` al endpoint `GET /history`.
- `cash.controller.js`: Filtro por `userId` para rol `CAJERO` en `getHistory`.

---

## [1.4.0] — 2026-09-15 (SaaS Multi-Tenant)

### Añadido

- **Arquitectura Multi-Tenant:** Discriminador `tenantId` en los 17 modelos operativos. Restricciones `@@unique([tenantId, field])`.
- **Motor de aislamiento (`AsyncLocalStorage` + Prisma Extensions):** Inyección automática de `tenantId` en todas las operaciones. Interceptores de protección en `findUnique`, `update` y `delete`.
- **Middlewares de seguridad:** Validación de estado de suscripción (`ACTIVE`, `SUSPENDED`, `TRIAL`) en cada request.
- **Onboarding público `/registro`:** Generador de slug en tiempo real. Transacción atómica para crear restaurante, roles, métodos de pago y cuenta admin.
- **Panel SuperAdmin `/saas`:** Métricas globales, filtrado de sedes, suspensión/reactivación, gestión de planes.
- **Chip de restaurante activo en Header.**
- **PDFs adaptados al tenant:** Nombre del restaurante inyectado dinámicamente.

---

## [1.3.0] — 2026-08-20

### Añadido

- **Módulo Reportes `/reportes`:** Selector diario/mensual, KPIs financieros, PDF ejecutivo.
- **Nuevo formato de Facturas en PDF:** Cabecera oscura, fichas de cliente y venta, tabla con adiciones.
- **Layout `/ventas` en pantalla completa:** Sin scroll exterior; mesas con microanimaciones hover.
- **Rediseño Configuración `/configuracion`:** Pestañas píldora, conmutadores de métodos de pago.

### Modificado

- Modales y tablas corporativas unificadas con cabeceras `#1e293b`.
- Modal de Proveedores, Usuarios y Clientes ampliados.
- Filtro de búsqueda en tiempo real en Proveedores.

---

## [1.2.0] — 2026-07-10

### Añadido

- **Módulo Clientes y Créditos:** Fichas, historial de consumo, fiados y cartera de cuentas por cobrar. Modelo `CustomerCredit` con tipos `DEBT` y `PAYMENT`.
- **Módulo Compras y Proveedores:** Registro de compras, recepción de insumos, actualización automática de inventario.
- **Control de Inventario:** Materias primas, unidades, costos, recetas y alertas de stock mínimo.
- **Paginación universal:** Componente `<Pagination>` aplicado en todos los módulos de listado.
- **`reportPdfService`:** Servicio centralizado para PDFs de facturas, arqueos y balances.

---

## [1.1.0] — 2026-06-01

### Añadido

- **Roles jerárquicos:** `SuperAdmin`, `Administrador`, `Supervisor`, `Cajero`, `Mesero`.
- **Control de Caja con Turnos:** Apertura, cierre ciego, arqueo y movimientos manuales.
- **Dashboard gerencial:** KPIs del día y gráfica de facturación.
- **Variaciones y adiciones en POS:** Modificadores, notas de cocina, propinas e impuestos.

---

## [1.0.0] — 2026-05-01

### Lanzamiento Inicial

- POS base: salón con mesas, carrito de pedidos, confirmación de pago.
- Autenticación JWT con refresh tokens y hash Bcrypt.
- CRUD de productos, categorías, mesas y métodos de pago.
- Gestión de usuarios con roles básicos.
- Historial de facturas con exportación PDF individual.
- Stack: React 18 + Vite 5 · Node.js + Express · PostgreSQL + Prisma ORM.

---

*Mantenido por **Leonardo Ramirez** — NeoFood © 2026*
