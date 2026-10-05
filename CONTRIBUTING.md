# 🤝 Guía de Contribución — NeoFood CRM & POS

¡Gracias por tu interés en colaborar con **NeoFood CRM & POS**! Este documento describe los principios, lineamientos técnicos y estándares de desarrollo para asegurar la alta calidad, estabilidad y cohesión del proyecto.

---

## 1. Principios del Proyecto

1. **Rendimiento ante todo:** NeoFood está diseñado para operar a máxima velocidad. Evitamos frameworks CSS pesados innecesarios; utilizamos **Vanilla CSS Modules** y componentes puros de React.
2. **Aislamiento Multi-Tenant estricto:** Cualquier consulta a base de datos que no sea pública DEBE estar delimitada por `tenantId`.
3. **Control estricto de almacenamiento:** Ningún archivo huérfano debe quedar en disco. Al reemplazar o eliminar una imagen, se debe invocar la utilidad `fileCleaner`.
4. **Respeto a la propiedad intelectual:** Todos los aportes se integran bajo la tutela y autoría del creador principal, **Leonardo Ramirez**.

---

## 2. Flujo de Trabajo (Git Workflow)

1. **Fork o Branch:** Crea una rama descriptiva a partir de la rama principal:
   ```bash
   git checkout -b feature/nombre-de-la-mejora
   # o para correcciones
   git checkout -b fix/descripcion-del-bug
   ```
2. **Estilo de Código:**
   - Usa nombres descriptivos en español para variables del dominio de negocio (ej. `montoTotal`, `costoUnitario`, `turnosCaja`) o inglés técnico coherente (`tenantId`, `userId`, `isAvailable`).
   - Mantén los componentes de interfaz en `frontend/src/components/` y las vistas completas en `frontend/src/pages/`.
3. **Validación Pre-Commit:**
   - Asegúrate de que `npm run build` en `frontend/` compile con **código de salida 0**.
   - Verifica que el backend inicie sin errores de sintaxis ni fallos en migraciones de Prisma.
4. **Mensajes de Commit:**
   Sigue la convención de commits semánticos:
   - `feat: descripción de nueva característica`
   - `fix: corrección de error o bug`
   - `docs: mejoras en documentación o changelog`
   - `style: ajustes cosméticos o de CSS Modules`
   - `refactor: reestructuración de código sin alterar funcionalidad`

---

## 3. Reporte de Incidencias (Issues)

Si encuentras un error o inconsistencia:
- Abre un issue detallando los pasos exactos para reproducirlo.
- Adjunta capturas de pantalla o logs de consola si es un fallo visual o de API.
- Especifica el navegador, sistema operativo y resolución de pantalla.

---

## 4. Licencia y Reconocimiento

Al contribuir al repositorio de NeoFood CRM & POS, aceptas que tus contribuciones se incorporan bajo la licencia del proyecto y se reconocen bajo la dirección arquitectónica de **Leonardo Ramirez**.
