# 🛡️ Política de Seguridad — NeoFood CRM & POS

La seguridad y privacidad de los datos de cada establecimiento gastronómico y de sus clientes finales son una prioridad absoluta en el ecosistema **NeoFood**.

---

## 1. Versiones Compatibles con Parches de Seguridad

Actualmente se brinda soporte de seguridad prioritario a las siguientes versiones:

| Versión | Estado de Soporte |
| :--- | :--- |
| **v1.7.x** | ✅ Soporte Activo / Parches Inmediatos |
| **v1.6.x** | ⚠️ Soporte de Seguridad Crítico |
| < v1.5.x > | ❌ Obsoleta (Se recomienda actualizar) |

---

## 2. Reporte Responsable de Vulnerabilidades

Si descubres una posible brecha de seguridad, inyección SQL, bypass de autenticación multi-tenant o fuga de credenciales:

1. **NO publiques el problema en Issues públicos de GitHub.**
2. Envía un reporte detallado directamente al autor y mantenedor del proyecto, **Leonardo Ramirez**, incluyendo:
   - Descripción de la vulnerabilidad y vector de ataque.
   - Pasos para reproducirla o script de prueba de concepto (PoC).
   - Impacto potencial estimado (ej. fuga de datos de tenant, escalada de privilegios).
3. El equipo revisará el incidente en un plazo máximo de 48 a 72 horas y publicará el parche correctivo.

---

## 3. Prácticas de Seguridad Implementadas en NeoFood

- **Aislamiento Multi-Tenant:** Cada solicitud autenticada inyecta el `tenantId` en el contexto de ejecución, impidiendo el cruce de datos entre diferentes restaurantes.
- **Autenticación Fuerte:** Firma de Access Tokens de corta duración y Refresh Tokens rotativos con Bcrypt (10 rondas de salt).
- **Control de Acceso Basado en Roles (RBAC):** Restricción a nivel de rutas para *SuperAdmin*, *Administrador*, *Cajero* y *Mesero*.
- **Política Estricta de Contraseñas Seguras:** Validación forzosa multicriterio en Backend (`passwordValidator.js`) y Frontend (`passwordValidator.js`) que exige mínimo 8 caracteres, al menos una mayúscula (`A-Z`), una minúscula (`a-z`), un dígito numérico (`0-9`) y un carácter especial (`[^A-Za-z0-9]`), mitigando ataques de fuerza bruta y diccionarios de credenciales débiles.
- **Prevención de Ataques en Almacenamiento:** Sanitización estricta de nombres de archivo y eliminación física de archivos huérfanos para mitigar desbordamientos y ejecución de código malicioso.
