# 📖 MANUAL DE USUARIO OFICIAL — NEOFOOD CRM & POS
### Guía Operativa Completa para Restaurantes, Bares, Cafeterías y Cadenas Gastronómicas

---

<div align="center">

![NeoFood](https://img.shields.io/badge/NeoFood-Manual%20de%20Usuario-4f46e5?style=for-the-badge)
![Versión](https://img.shields.io/badge/Versi%C3%B3n-1.7.5-10b981?style=for-the-badge)
![Autor](https://img.shields.io/badge/Creador-Leonardo%20Ramirez-8b5cf6?style=for-the-badge)

</div>

---

## 📑 Tabla de Contenidos
1. [Introducción y Roles del Sistema](#1-introducción-y-roles-del-sistema)
2. [Inicio de Sesión y Navegación](#2-inicio-de-sesión-y-navegación)
3. [Dashboard y Accesos Rápidos](#3-dashboard-y-accesos-rápidos)
4. [Punto de Venta (POS) y Comandas](#4-punto-de-venta-pos-y-comandas)
5. [Gestión de Cocina Digital (KDS)](#5-gestión-de-cocina-digital-kds)
6. [Tienda Virtual Pública y Pedidos por WhatsApp](#6-tienda-virtual-pública-y-pedidos-por-whatsapp)
7. [Control de Caja y Turnos](#7-control-de-caja-y-turnos)
8. [Inventario General de Insumos y Catálogo](#8-inventario-general-de-insumos-y-catálogo)
9. [Módulo de Producción y Sub-Recetas](#9-módulo-de-producción-y-sub-recetas)
10. [Compras y Proveedores](#10-compras-y-proveedores)
11. [Facturación y Reportes en PDF](#11-facturación-y-reportes-en-pdf)
12. [Clientes, Usuarios y Configuración](#12-clientes-usuarios-y-configuración)

---

## 1. Introducción y Roles del Sistema

**NeoFood** es una solución integral diseñada para optimizar todas las fases de operación de un negocio de alimentos y bebidas, desde el momento en que un cliente hace un pedido (en mesa, mostrador o tienda virtual) hasta el descuento automático de ingredientes en bodega y la emisión del reporte contable.

### Perfiles de Usuario:
- **SuperAdmin:** Administrador maestro de la plataforma SaaS con facultades de crear, monitorear y gestionar todos los restaurantes registrados.
- **Administrador:** Dueño o gerente del establecimiento. Posee acceso total a reportes, configuraciones, usuarios, compras, inventario y caja.
- **Cajero:** Personal asignado a la apertura de turnos, cobro en el POS, registro de ventas, arqueos de caja y cobro de abonos a crédito.
- **Mesero:** Personal de sala para toma rápida de pedidos, asignación de comandas a mesas y adiciones.

---

## 2. Inicio de Sesión y Navegación

### Ingreso a la Plataforma:
1. Abre tu navegador web e ingresa a la dirección web asignada (por defecto `http://localhost:5173/login`).
2. Digita tu **Correo Electrónico** y **Contraseña**.
3. Presiona el botón **"Iniciar Sesión"**.

### Barra Lateral de Navegación (Sidebar):
La barra lateral está organizada en **4 dominios operativos** a un solo clic de distancia:
- **OPERACIONES:** Dashboard, Ventas (POS), Cocina (KDS), Tienda Virtual y Caja.
- **INVENTARIO & STOCK:** Inventario, Producción, Compras y Proveedores.
- **FINANZAS & REPORTES:** Facturas y Reportes.
- **ADMINISTRACIÓN:** Clientes, Usuarios, Configuración y panel SaaS (si eres SuperAdmin).
- **Pie de Menú:** Exhibe el **logotipo oficial de tu restaurante**, tu nombre de usuario y botón de cerrar sesión. Puedes retraer la barra a modo compacto (5rem) presionando el botón de colapsar.

---

## 3. Dashboard y Accesos Rápidos

Al ingresar serás recibido por la pantalla ejecutiva de control en tiempo real:

1. **Tarjetas de Rendimiento (KPIs):**
   - **Ventas de Hoy:** Dinero total facturado durante la jornada actual.
   - **Ventas del Mes:** Facturación acumulada del mes en curso.
   - **Ganancia Estimada:** Margen bruto calculado automáticamente restando las compras a las ventas.
   - **Compras del Mes:** Gastos registrados en materias primas y reposición de bodega.

2. **Barra de Acceso Rápido Temática:**
   Ubicada estratégicamente en la parte central, te permite acceder en 1 clic a los módulos clave con botones llamativos y codificación cromática:
   - 🛒 **Venta / POS (Azul/Índigo):** Apertura de comandas inmediatas.
   - 👨‍🍳 **Cocina (Rojo/Carmesí):** Pantalla de pedidos en preparación.
   - 🛍️ **Tienda Virtual (Azul Cielo):** Monitor de pedidos web entrantes.
   - 💼 **Caja (Verde Esmeralda):** Turnos y arqueos.
   - 📦 **Inventario (Teal):** Catálogo de productos y existencias.
   - 🏭 **Producción (Dorado):** Elaboración de lotes y sub-recetas.
   - 🏪 **Compras (Púrpura):** Registro de facturas de insumos.

3. **Diagrama de Facturación e Indicadores:**
   - Gráfico de barras de ventas de los últimos 7 días.
   - Paneles laterales con paginación integrada: **Alertas de Insumos con Stock Bajo** y **Top Productos más Vendidos**.

---

## 4. Punto de Venta (POS) y Comandas

Diseñado para soportar alto tráfico en horas pico:

1. **Selección de Modo:**
   - Selecciona si el pedido es para consumo en **Mesa** (indicando el número de mesa) o **Para Llevar**.
2. **Adición de Platillos:**
   - Haz clic sobre cualquier platillo del catálogo o utiliza el buscador superior en vivo.
   - Si el platillo cuenta con **Modificadores** (ej. término de la carne, tipo de salsa) o **Adiciones** con costo extra, una ventana emergente te permitirá seleccionarlos antes de sumarlo al pedido.
3. **Gestión del Carrito:**
   - Modifica cantidades con los botones `+` o `-`.
   - Agrega observaciones especiales (ej. *"Sin cebolla"* o *"Salsa aparte"*).
4. **Procesamiento de Pago y Cierre:**
   - Presiona el botón verde **"Cobrar Pedido"**.
   - Selecciona el método de pago: *Efectivo*, *Transferencia*, *Tarjeta* o *Crédito*.
   - Si es en efectivo, ingresa el dinero recibido y el sistema calculará automáticamente el cambio (vueltas).
   - Al finalizar, el sistema registra la venta, descarga el stock de insumos correspondientes e imprime/genera la factura.

---

## 5. Gestión de Cocina Digital (KDS)

El módulo de cocina sustituye las comandas de papel por una pantalla digital interactiva:
1. Cada pedido ingresado en el POS o en la Tienda Virtual aparece instantáneamente como una tarjeta de comanda en cocina.
2. Cada comanda muestra:
   - Número de pedido, tipo (Mesa o Domicilio) y tiempo transcurrido desde su creación.
   - Lista detallada de platillos con sus modificadores y notas en color destacado.
3. **Flujo de Estados:**
   - **En Espera / Recibido** → Haz clic para pasar a **En Preparación**.
   - **En Preparación** → Haz clic en **Marcar como Listo** cuando los platillos estén cocinados para entrega al mesero o domiciliario.

---

## 6. Tienda Virtual Pública y Pedidos por WhatsApp

Cada restaurante cuenta con una vitrina digital pública para que los clientes ordenen desde su celular:

### Configuración de la Tienda (`/configuracion` → Pestaña Tienda Virtual):
1. **Identidad de Marca:** Carga el Logotipo y la Portada (Banner) de tu negocio. Puedes cambiar o eliminar la imagen en cualquier momento.
2. **Enlace de la Tienda:** Copia tu URL única (ej. `http://tu-dominio.com/tienda/mi-restaurante`) para compartirla en redes sociales, biografía de Instagram o estados de WhatsApp.
3. **Horarios de Atención Semanales:**
   - Marca con checkbox qué días de la semana abre tu negocio.
   - Configura hasta **2 turnos diarios** (horario partido, ej. Almuerzo 12:00 PM a 3:30 PM y Cena 6:30 PM a 10:30 PM).
   - Si el cliente ingresa fuera de horario, la tienda le informará amablemente los horarios y pausará la toma de pedidos.

### Experiencia del Cliente y Despacho a WhatsApp:
- El cliente explora los platillos autorizados, personaliza sus opciones y añade al carrito.
- Al confirmar, el sistema registra la comanda digital y abre WhatsApp con un mensaje estructurado y listo para enviar al restaurante.
- En el módulo administrativo **Tienda Virtual (`/pedidos-tienda`)**, el cajero recibe la alerta sonora, atiende el pedido y lo factura directamente a la caja activa.

---

## 7. Control de Caja y Turnos

Garantiza la trazabilidad del dinero físico y digital:

1. **Apertura de Turno:**
   - Al iniciar la jornada, el cajero ingresa el monto de base con el que abre (efectivo inicial en gaveta).
2. **Movimientos Manuales:**
   - **Entrada de Efectivo:** Aportes de capital o cambio adicional.
   - **Salida de Efectivo:** Gastos imprevistos de caja menor (ej. pago de hielo o aseo).
3. **Cierre de Turno y Arqueo Ciego:**
   - El cajero cuenta el dinero físico presente en la gaveta y lo digita sin ver los totales del sistema.
   - El sistema contrasta el conteo con las ventas reales y emite el **Informe de Cierre de Caja** detallando si hubo sobrante, faltante o cuadre exacto.
   - Opción directa de descargar el **Acta de Cierre de Turno en PDF**.

---

## 8. Inventario General de Insumos y Catálogo

El módulo de inventario está dividido en pestañas ergonómicas para evitar confusiones operativas:

1. **Catálogo de Ventas:**
   - Platillos que se venden al público en el POS y en la tienda online (Hamburguesas, Bebidas, Combos).
   - Cuenta con buscador en tiempo real, selector de categorías, control de precio, fotografía y conmutador para mostrar u ocultar en la tienda virtual.
2. **Inventario de Insumos (Materia Prima):**
   - Productos comprados a proveedores (Tomates, Pan, Aceite, Carnes crudas, Empaques).
   - Cada insumo registra su unidad de medida (kg, gr, und, ltr), stock actual, stock mínimo para alertas y costo de adquisición.
3. **Selectores con Filtro Inteligente:**
   - Al seleccionar cualquier ingrediente en el sistema, puedes escribir sobre el menú desplegable para filtrar alfabéticamente en tiempo real.

---

## 9. Módulo de Producción y Sub-Recetas

Ideal para restaurantes que elaboran sus propios ingredientes base (ej. amasar pan, preparar salsas artesanales o porcionar carne molida):

1. **Definición de Sub-Recetas:**
   - Configura qué materias primas requiere el insumo elaborado y en qué proporción (ej. para producir 10 kg de Salsa Especial se necesitan 6 kg de mayonesa, 3 kg de mostaza y 1 kg de especias).
2. **Registro de Orden de Producción:**
   - Ingresa al módulo **Producción (`/produccion`)** y presiona **"Nueva Producción"**.
   - Selecciona el insumo a elaborar y la cantidad a producir.
   - El sistema calcula los ingredientes requeridos y valida si hay stock disponible en bodega.
3. **Cálculo del Costo Medio Ponderado (CMP):**
   - Al confirmar el lote, las materias primas se descargan automáticamente de bodega.
   - El sistema calcula el costo real exacto del lote producido y actualiza automáticamente el costo unitario ponderado del insumo elaborado.

---

## 10. Compras y Proveedores

1. **Directorio de Proveedores:**
   - Registra proveedores con NIT, nombre de contacto, teléfono y dirección.
2. **Registro de Compras:**
   - Ingresa una factura de compra detallando los insumos recibidos, cantidades y precio unitario pagado.
   - Al guardar, el inventario de bodega se incrementa de inmediato y el costo del insumo se actualiza en el sistema.

---

## 11. Facturación y Reportes en PDF

1. **Historial de Facturas:**
   - Consulta cualquier venta histórica por número de comanda, cliente o rango de fechas.
   - Visualización de desglose con modificadores, adiciones y forma de pago.
2. **Ventas a Crédito y Abonos:**
   - Registro de clientes con cupo de crédito.
   - Modal interactivo de abono con barra de progreso de pago y cálculo de saldo restante.
3. **Generación Documental en PDF:**
   - Descarga de facturas de venta formales.
   - Exportación de balances consolidados mensuales con un diseño corporativo apto para auditoría y contabilidad.

---

## 12. Clientes, Usuarios y Configuración

1. **Fidelización de Clientes:**
   - Directorio de clientes con cédula/NIT, teléfono, dirección y saldo de cartera pendiente.
2. **Control de Usuarios y Política de Contraseñas:**
   - Creación y administración de meseros, cajeros y administradores con control de acceso por roles (RBAC).
   - **Política Estricta de Contraseñas Seguras:** Todo registro público (onboarding de restaurantes) y alta o edición de credenciales de personal en el módulo de usuarios exige cumplir obligatoriamente con 5 criterios de seguridad:
     * Longitud mínima de 8 caracteres.
     * Al menos una letra mayúscula (`A-Z`).
     * Al menos una letra minúscula (`a-z`).
     * Al menos un número (`0-9`).
     * Al menos un carácter especial (`@, $, !, %, *, #, ?, &, etc.`).
   - El sistema cuenta con checklist dinámico en tiempo real que valida visualmente el cumplimiento de cada requisito mientras se escribe, además de selector de visibilidad (`Eye`/`EyeOff`) para mayor comodidad.
   - Bloqueo preventivo de eliminación si un usuario tiene turnos de caja abiertos o históricos asociados.
3. **Configuración Institucional:**
   - Datos de la empresa (Razón social, NIT, teléfono, dirección de la sede).
   - Métodos de pago aceptados en caja.
   - Horarios comerciales y personalización visual de la tienda online.

---

<div align="center">

**NeoFood CRM & POS** — Sistema Integral de Gestión Gastronómica  
*Diseñado y Desarrollado por Leonardo Ramirez &copy; 2026*

</div>
