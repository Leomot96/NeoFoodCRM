# Changelog — NeoFood POS & CRM

Todos los cambios relevantes de este proyecto quedan documentados en este archivo.
El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/) y usa versionado [Semántico](https://semver.org/lang/es/).

## [1.9.0] — 2026-10-24

### Añadido

#### Demos en Vivo Multicategoría & Siembra de Datos
- **5 Restaurantes Demos en Vivo con Menús y Datos Reales:**
  - **Bella Napoli Pizzería (`pizzeria@demo.com`):** 14 platos con variantes de masa, tamaño y bordes de queso, pastas artesanales y 8 mesas en salón.
  - **Café Origen & Brunch (`cafe@demo.com`):** 15 bebidas de especialidad, opciones de leche vegetal y tienda virtual con catálogo para WhatsApp.
  - **Fuego Criollo Parrilla (`parrilla@demo.com`):** 10 cortes premium con términos de cocción (término medio, tres cuartos, bien asado), guarniciones y áreas diferenciadas salón/terraza.
  - **La Taberna Gastrobar (`gastrobar@demo.com`):** 13 cervezas artesanales en pinta y jarra, alitas con salsas de autor, nachos supremos y pantalla KDS para bar/cocina.
  - **Burger & Shake Rápidas (`rapidas@demo.com`):** 11 combos de hamburguesas dobles, perros calientes y papas cargadas.
  - Contraseña universal de demostración: `demo1234`.
- **Script de Siembra Automática (`scripts/seed_demo_tenants.js`):** Poblador idempotente que aprovisiona los 5 establecimientos de prueba con mesas, categorías, productos, modificadores, opciones y usuarios.
- **Exportador a Excel (`scripts/generate_demo_excel.js`):** Generador de hoja de cálculo oficial [`NeoFood_Cuentas_Demo.xlsx`](NeoFood_Cuentas_Demo.xlsx) con hojas formateadas para *Cuentas_Demo* y *Catalogo_Muestra*.

#### Seguridad, Blindaje y Tarea Programada de Auto-Reset
- **Protección de Cuentas Demo:** Blindaje en controladores de autenticación y usuarios para impedir cambio de contraseña, modificación de correo electrónico o eliminación de perfiles pertenecientes al dominio `@demo.com`.
- **Protección de Establecimientos:** Bloqueo en `deleteTenantPermanently` para garantizar que las sedes de demostración no puedan ser eliminadas accidentalmente.
- **Auto-Reset Periódico cada 24 Horas:** Tarea programada en `server.js` (`resetDemoTenants()`) que purga automáticamente ventas acumuladas, órdenes temporales y turnos de caja de prueba, restableciendo el catálogo e inventario al estado base.
- **Endpoint Administrativo de Limpieza:** Ruta autenticada `POST /api/saas/demos/reset` restringida a *SuperAdmin* para forzar el reinicio de las demos bajo demanda.

#### Landing Page Interactiva & Mockup de 6 Módulos
- **Hero Mockup Interactivo Multimódulo:** Interfaz dinámica en la cabecera que simula fielmente la operación real de NeoFood según la pestaña elegida:
  - `POS & Salón`: Cuadrícula de mesas con estados (ocupada, libre, cuenta, cocina) y comanda activa con botón de cobro.
  - `Cocina (KDS)`: Comandas digitales con temporizadores de urgencia (*hace 6 min / Urgente*), modificadores de platos y botones de despacho.
  - `Tienda Virtual`: Menú digital mobile-friendly con botón flotante de confirmación de pedido a WhatsApp sin comisiones.
  - `Caja & Turnos`: Cuadre del turno #142 con desglose de base, efectivo, pagos digitales y arqueo ciego.
  - `Inventario CMP`: Stock de materias primas con alertas de mínimo y deducción automática por lotes elaborados.
  - `Reportes PDF`: Balance financiero consolidado (Ventas, COGS, Margen del 68.8%), gráfica semanal y botón de descarga de PDF.
- **Sección de Demos en Vivo (`#demos`):** Tarjetas temáticas con paleta de color para cada tipo de negocio gastronómico, acceso directo al POS con 1 clic y enlace a su tienda virtual (`/tienda/demo-...`).
- **Navegación y Header Responsivo:**
  - *Escritorio:* Barra translúcida al 95% del ancho de pantalla (`max-width: 1560px`) con efecto glassmorphism, enlaces de navegación en una sola línea y botones de acción rápida.
  - *Móvil:* Logotipo principal con fila inferior de botones deslizables (*pills slider*) para desplazamiento táctil sin saturar la pantalla.
  - *Scroll al Inicio:* Clic en el logotipo desplaza suavemente la página hacia el encabezado principal.

#### Optimización Ergonómica de Login
- **Selector Rápido de Demos:** 5 botones horizontales en una sola fila (`repeat(5, 1fr)`) que precargan credenciales al instante.
- **Deselección con 1 Clic:** Al pulsar sobre el demo actualmente seleccionado, los campos se vacían automáticamente para escribir credenciales propias sin fricción.
- **Diseño sin Scroll Vertical:** Ancho de inputs acotado a `23rem` y márgenes verticales optimizados para que el formulario se aprecie íntegramente en cualquier resolución de pantalla sin requerir desplazamiento.

#### SEO Técnico y Cabeceras de Seguridad
- **Metadatos Open Graph y Twitter Cards:** Integración completa de etiquetas sociales con títulos, descripciones, previsualización de imágenes y URL canónica.
- **Datos Estructurados Schema.org JSON-LD:** Definición formal de tipo `SoftwareApplication` para indexación enriquecida en motores de búsqueda.
- **Accesibilidad y Crawlers:** Encabezado semántico `<h1>` en bloque `<noscript>` para indexación SEO sin javascript.
- **Cabeceras HTTP en `vercel.json`:** `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`.
- **Iconografía 100% SVG:** Migración total de emojis en código de interfaz a iconos vectoriales limpios de `lucide-react`.

### Modificado
- **Sincronización Global de Versiones a v1.9.0:** Actualización de versiones en `package.json` de frontend, backend y móvil, manual de usuario, certificado de autoría y README.

## [1.8.1] — 2026-10-20

### Añadido

#### Aplicación Móvil Nativa Android (NeoFood Móvil / Capacitor)
- **Nueva Plataforma Móvil (`/mobile`):** Creación de un proyecto independiente e integrado con Capacitor para generar APKs de Android nativas con identidad visual y operativa de NeoFood.
- **Detección Automática de Restaurante (Multi-Tenant):** Autenticación inteligente donde cualquier usuario al iniciar sesión detecta automáticamente el restaurante (`Tenant`), carga su nombre, logotipo y plan activo.
- **Selector y Probador de IP Local en Red WiFi:** Modal de configuración dinámica de IP del servidor con prueba de conexión en vivo (*ping*) para operar en red local sin recompilar la aplicación.
- **Arquitectura de CSS Modular:** Sistema de estilos 100% modular (`*.module.css`) basado en los tokens y variables de diseño oficiales de NeoFood (`tokens.css` y `reset.css`), respetando Safe Area Insets (notch y gestos de Android) y desactivando comportamientos web como zoom accidental o tap highlight.
- **Identidad de Marca Oficial:** Integración de los logotipos oficiales (`isotipo.svg`, `logo_blanco.svg`) y pie de página institucional con autoría de Leonardo Ramirez.
- **Gestión Operativa de Mesas en Salón:**
  - Visualización del estado en tiempo real (Libre / Ocupada) vinculada al estado de comandas del backend.
  - Accesos directos para órdenes especiales: **Para Llevar** (`TAKEAWAY`) y **Domicilio** (`DELIVERY`).
  - Menú modal de mesa ocupada para agregar platos, cancelar pedido o proceder al cobro.
- **Modal de Personalización de Productos (`ProductCustomizerModal.jsx`):**
  - Despliegue inmediato al pulsar sobre cualquier plato o bebida del menú móvil.
  - Selección de variantes y modificadores obligatorios u opcionales con preselección inteligente.
  - Gestión de adiciones y extras con casillas interactivas y cálculo de recargo en vivo.
  - Especificación de notas de cocina personalizadas ("término medio", "sin cebolla") y contador de cantidad.
- **Módulo de Cartera y Clientes (`CustomersScreen.jsx`):**
  - Acceso restringido exclusivamente a roles **Administrador** y **Supervisor**.
  - Aislamiento estricto multi-tenant: visualización y cobro únicamente de clientes registrados en el restaurante en sesión.
  - Monitoreo en tiempo real de deuda total en cartera, clientes con saldo pendiente y clientes al día.
  - Buscador inteligente por nombre, cédula/NIT o número de teléfono.
  - **Filtro Estricto de Métodos de Abono:** En el formulario de abonos se muestran todos los medios de pago (Efectivo, Transferencia, Tarjeta) **excluyendo Crédito**, impidiendo que una deuda se pague con otra deuda.
  - Historial detallado de créditos y cargos por facturas del cliente.
- **Optimización de Desplazamiento Nativo (Scroll por Demanda):**
  - Eliminación de alturas mínimas artificiales (`min-height`) y fijación del contenedor raíz a `100dvh` con contención de desbordamiento, asegurando que el scroll solo se active cuando la cantidad de elementos sobrepase naturalmente la pantalla.
- **Módulo de Caja y Ventas del Día (`CashScreen.jsx`):**
  - **Desglose Exhaustivo por Método de Pago:** Discriminación idéntica a la aplicación web mostrando el monto acumulado en cada método activo (Efectivo, Nequi/Transferencia, Tarjeta/Datáfono, Crédito/Fiao).
  - **Cuadre de Gaveta con Privacidad:** Visualización de la fórmula de efectivo esperado (`Base + Ventas Efectivo + Abonos Efectivo ± Movimientos`) con botón de ojo (`Eye`/`EyeOff`) para ocultar o revelar el saldo en gaveta.
  - **Movimientos de Efectivo Manuales:** Registro directo de salidas/ingresos de dinero (pago a proveedores, compras menores) con actualización inmediata del saldo esperado.
  - **Pestaña Dedicada para Ventas del Día:** Selector segmentado para alternar entre el *Cuadre de Caja* y el *Historial de Ventas*, con buscador en tiempo real, filtros por método de pago y modal con el ticket de venta detallado.
  - **Ajuste Ergonómico de Margen Inferior:** Incorporación de margen de resguardo inferior (`padding-bottom: calc(90px + env(safe-area-inset-bottom))`) para garantizar que la última tarjeta de venta nunca quede tapada por la barra de navegación móvil.
- **Pestañas de Navegación Móvil Actualizadas (`BottomNav.jsx`):** Integración ergonómica de pestañas para Mesas, Pedido, En Curso, Caja, Clientes (condicional para administradores) y Ajustes.

### Modificado

- **Corrección y Blindaje de Abonos en Cartera (`CustomersScreen.jsx`):**
  - **Filtro Exclusivo de Facturas con Saldo:** El selector de facturas a abonar valida estrictamente que la factura sea a crédito y tenga deuda pendiente real (`> $0`), impidiendo que facturas ya saldadas al 100% reaparezcan tras procesar el pago.
  - **Protección de Campo de Comprobante / Descripción:** Configurado como solo lectura (`readOnly`) inmutable, precargado automáticamente con el estándar `"Abono a Factura #[Número]"` o `"Abono general a cuenta"`.
- **Ocultamiento Dinámico del Botón "Abonar" en Facturas (`CashScreen.jsx`):**
  - El botón *"Abonar"* y el bloque modal de abono solo se muestran en facturas que tengan crédito activo con saldo por cobrar.
  - En facturas pagadas en su totalidad, pagadas de contado o canceladas, el botón desaparece y se exhibe el indicador verde `"✓ Pagada"`.
- **Sincronización Global de Versiones a v1.8.1:** Actualización integral de números de versión en paquetes, pies de página de la app móvil y versión web, pantallas de inicio de sesión, ajustes, barra de estado, landing page, documentos legales, tickets de impresión y documentación del repositorio.

## [1.8.0] — 2026-10-13

### Añadido

#### Seguridad, Pre-Verificación de Correo & Defensa Anti-Spam (Resend)
- **Pre-Verificación de Correo con Código OTP de 6 Dígitos:** Nuevo flujo de seguridad (Opción B) donde el usuario verifica su dirección de correo electrónico mediante un código OTP transaccional antes de procesar el registro del restaurante, evitando registros basura en la base de datos.
- **Integración Transaccional con Resend (`email.service.js`):** Envío de plantillas HTML profesionales con el código de seguridad, advertencia de expiración (10 minutos) y soporte para API Key segura.
- **Defensa Multicapa contra Bots & Spammers:**
  - **Rate Limiting Estricto por IP (`security.middleware.js`):** Límites independientes para envío de códigos (5 por 15 min), verificación OTP (10 por 15 min) y registro de restaurantes (5 por hora).
  - **Trampa Honeypot con Shadow-Drop:** Campos trampa invisibles (`website`) en el formulario de registro que atrapan bots automatizados y simulan éxito inmediato (`200 OK`) sin gastar cuota de correos ni crear datos.
  - **Bloqueo de Correos Temporales / Desechables:** Detección y bloqueo automático de dominios como `tempmail.com`, `10minutemail.com`, `guerrillamail.com`, `mailinator.com`, etc.

#### Unificación de 7 Días de Prueba & Optimización de Onboarding
- **Prueba Gratuita Universal (7 Días):** Se unificó el sistema para que cualquier plan seleccionado (Básico, Pro o Cadenas) incluya automáticamente 7 días de prueba completa.
- **Política de Retención tras Expiración:** Al vencer los 7 días de prueba, todos los datos (menús, recetas, mesas, configuración) permanecen resguardados de forma segura, restringiendo el acceso hasta formalizar el pago de la suscripción.
- **Rediseño Compacto del Formulario de Registro:** Nueva interfaz por pasos con diseño ergonómico de 2 columnas, reducción drástica de espaciados verticales para minimizar el scroll y reubicación del selector de plan y modalidad al final del formulario, justo antes del botón de confirmación.

#### Centro Legal Completo & Cumplimiento Normativo
- **Páginas Legales Centralizadas (`/legal`, `/terminos`, `/privacidad`, `/cookies`, `/sla`):**
  - **Términos y Condiciones del Servicio:** Marco contractual SaaS, régimen de prueba de 7 días, titularidad de datos y exención de comisiones en la tienda virtual por WhatsApp.
  - **Política de Privacidad y Habeas Data:** Cumplimiento de la Ley 1581 de 2012 y Decreto 1377 de 2013 (Colombia) y estándares internacionales (GDPR), con aislamiento multi-tenant y canales de PQR.
  - **Política de Cookies y Almacenamiento Local:** Transparencia sobre almacenamiento técnico de sesión y cero rastreo publicitario invasivo.
  - **Acuerdo de Nivel de Servicio (SLA 99.5%):** Compromiso de disponibilidad, respaldos diarios y ventanas de mantenimiento nocturno.
- **Banner Flotante de Consentimiento de Cookies (`CookieBanner.jsx`):** Aviso respetuoso y no intrusivo con almacenamiento en `localStorage`.

#### Gestión de Usuarios con Contexto Multi-Tenant (SuperAdmin)
- **Filtro y Columna de Restaurante:** Columna dedicada que muestra a qué restaurante pertenece cada usuario y selector de sede al crear/editar usuarios exclusivo para el rol `SuperAdmin`.

#### Módulo de Impresión Térmica POS & Facturación en Tirilla
- **Configuración Local de Impresoras Térmicas (`printerService.js`):** Soporte configurable por terminal para impresoras POS estándar en anchos de 58mm y 80mm.
- **Formato de Ticket Estándar de Alto Rendimiento:** Impresión limpia de comprobantes de pago y comandas con corte térmico, detalle de productos, adiciones, desglose de impuestos, propina voluntaria, cálculo de vueltas en efectivo y pie de página de cortesía configurable.

#### Experiencia Móvil Optimizada Estilo App Nativa (Android / iOS)
- **Flujo en 2 Pasos para Terminal Punto de Venta (POS):** En dispositivos móviles, la interfaz se divide de forma transparente entre Catálogo/Productos y Carrito/Checkout en pantalla completa con botón flotante interactivo, erradicando solapamientos de pantalla.
- **Corrección de Cuadrícula de Horarios en Tienda Virtual:** Visualización adaptativa fluida para la configuración de doble turno de apertura y cierre en pantallas reducidas.
- **Eliminación de Barra de Navegación Inferior Fija:** Supresión de elementos fijos que restaban visibilidad vertical y ocultaban botones de acción en smartphones.

#### Identidad Corporativa Vectorial Oficial (SVG) & Calidad Gráfica
- **Integración de Logotipos Vectoriales:** Implementación de los archivos oficiales de marca `isotipo.svg`, `logo_blanco.svg` y `logo_negro.svg`.
- **Estandarización Visual:** Calibración de escala y tipografía en Login, Registro, Sidebar, Centro Legal, Landing Page y membretes/firmas en reportes y comprobantes PDF (`reportPdfService.js`).

#### Automatización de Aprovisionamiento para Nuevos Tenants
- **Cuentas Genéricas Automáticas:** Creación inmediata del cliente "Consumidor Final" (identificación `222222222222`) y del "Proveedor Genérico" (identificación `222222222`) al registrar cualquier restaurante nuevo, permitiendo la operación instantánea sin configuración previa obligatoria.

---

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
