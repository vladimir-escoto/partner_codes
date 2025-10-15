# Fase 9 — QA manual: Pruebas funcionales

Este plan de aseguramiento de calidad cubre los escenarios funcionales prioritarios para la fase 9 del proyecto. Incluye los pre-requisitos, pasos detallados de validación y criterios de aceptación para garantizar que no existan errores en consola mientras se navega por la aplicación.

## 1. Preparación del entorno

1. Instalar dependencias y compilar los paquetes requeridos:
   - En la raíz (`/workspace/partner_codes`): `npm install`
   - En la aplicación web (`/workspace/partner_codes/referral-system-web`): `npm install`
2. Levantar el entorno local desde la carpeta `referral-system-web` con `npm run dev` y abrir la URL indicada por Vite en el navegador.
3. Limpiar el `localStorage` del navegador (clave `referral-system-db`) antes de iniciar las pruebas para partir del _seed_ por defecto.
4. Mantener la consola del navegador visible durante toda la sesión y confirmar que no se generan errores en cada flujo validado.

## 2. Gestión de códigos PT/AF

### 2.1 Crear código PT

1. Desde la barra lateral, seleccionar el rol **Admin** y la vista **Códigos**.
2. Completar el formulario **Nuevo código** con un responsable (ID, nombre, correo) dejando vacío `Partner padre`.
3. Enviar el formulario y confirmar el _toast_ de éxito `Código PT-XXXXX creado exitosamente`.
4. Validar que el código aparezca en el listado con rol "Partner" y estado "active".
5. Revisar en `localStorage` que el objeto del código incluya `role: "partner"`, `max_uses` (si se capturó) y `uses: 0`.

### 2.2 Crear código AF con validaciones de partner padre

1. En el mismo formulario, elegir el rol **Affiliate (AF)**.
2. Confirmar que el campo `Partner padre` se vuelve obligatorio (se muestra el helper y el campo no se puede ocultar) y completar con un ID válido del partner (ej. `PT-001`).
3. Enviar el formulario y esperar el _toast_ de éxito.
4. Abrir la ventana de edición del nuevo registro (`Editar`) y verificar que `Partner padre` y `Máximo de usos` permitan actualizar los datos.
5. Editar el código asignando un `max_uses` pequeño (por ejemplo 1) y guardar; confirmar que el _toast_ indica actualización correcta.

### 2.3 Confirmar regex de código y validaciones de backend

1. Intentar crear un código AF sin capturar `Partner padre`; confirmar que se bloquea con el mensaje `Los afiliados requieren un partner padre.`
2. Probar el servicio HTTP ejecutando en consola:
   ```js
   fetch('/api/codes', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ code: 'AF-ABCDE' })
   }).then((r) => r.json()).then(console.log);
   ```
   La respuesta debe ser `{ error: 'An affiliate code must include parent_partner_id.' }`, validando la regla `requireParentForAffiliate`.
3. Abrir la consola y ejecutar la petición:
   ```js
   fetch('/api/codes', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ code: 'XX-12345', parent_partner_id: 1 })
   }).then((r) => r.json()).then(console.log);
   ```
   Verificar que la respuesta sea `{ error: 'Invalid code format' }` validando la expresión regular `^(PT|AF)-[A-Z0-9]{5}$`.
4. Repetir con un código válido (`PT-` o `AF-` + 5 caracteres alfanuméricos) y confirmar que el servicio responde 201 con el payload creado.

## 3. Registro de usuarios y consumo de max_uses

### 3.1 Registrar usuario con código PT

1. Identificar un código PT activo desde la tabla (si es necesario, editarlo para asignar `max_uses = 2`).
2. En la consola ejecutar:
   ```js
   fetch('/api/users/register', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       code: 'PT-XXXXX',
       email: 'qa.pt+1@example.com',
       firstName: 'QA',
       lastName: 'Tester'
     })
   }).then((r) => r.json()).then(console.log);
   ```
3. Confirmar respuesta `201` con la estructura `{ user: { id, code, partner_id, created_at } }` y sin errores en consola.
4. Revisar `localStorage` y validar que el código incrementó `current_uses`.

### 3.2 Registrar usuario con código AF

1. Repetir el paso anterior usando un código AF activo.
2. Confirmar que el payload devuelto incluye `affiliate_id` y `partner_id` heredados del código.
3. Verificar en la tabla de códigos que el registro mantiene rol "Afiliado" y estado "active".

### 3.3 Alcanzar `max_uses`

1. Seleccionar el código AF configurado con `max_uses = 1`.
2. Registrar un usuario exitosamente (ver 3.2) y observar el `current_uses` en almacenamiento.
3. Intentar registrar un segundo usuario con el mismo código; confirmar respuesta `409` con mensaje `Referral code has reached its maximum uses.` sin errores adicionales en consola.
4. Validar que el contador no supera el límite establecido.

## 4. Facturación, estados e historial

### 4.1 Generar facturas

1. Desde **Admin → Pagos**, elegir una fecha de corte en el pasado inmediato y presionar **Generar**.
2. Confirmar _toast_ `Se generaron N facturas.` y que la tabla "Bandeja de facturas" se pobla con registros del período.
3. Abrir el detalle de una factura y revisar montos, breakdown y fechas cargadas.

### 4.2 Cambiar estados y validar historial

1. En la misma tabla, usar el botón **Marcar pagada** sobre una factura.
2. Confirmar _toast_ de actualización y observar que el estado en la fila cambia a `paid`.
3. Cambiar al rol **Finanzas → Historial** y validar que la tabla muestre la factura pagada con monto y fecha de cambio.
4. Cambiar al rol **Finanzas → Pagos** y verificar que el detalle refleja el nuevo estado.

### 4.3 Verificar historial vía almacenamiento

1. Abrir `localStorage` y revisar la clave `invoice_history` para confirmar el nuevo elemento con `status: 'paid'` y `changed_at` generado.
2. Asegurarse de que no existan errores en consola tras navegar entre Admin, Finanzas y volver a Admin.

## 5. Dashboards y gráficas

1. Navegar por cada rol disponible y revisar que las tarjetas y gráficas se rendericen sin errores:
   - **Admin → Dashboard**: KPI cards, gráfica de barras por aplicación, línea mensual y heatmap con leyenda.
   - **Ejecutivo → Dashboard**: métricas consolidadas y gráfica de línea en canvas.
   - **Partner → Dashboard** y **Mi código & afiliados**: métricas propias, detalle de códigos y gráfica de usuarios por mes.
2. En cada vista, interactuar (pasar a otra opción y volver) para confirmar que las instancias de canvas se regeneran sin advertencias.
3. Revisar que los componentes muestran datos coherentes con el seed (por ejemplo, usuarios totales > 0, partners listados).

## 6. Criterios de salida (DoD)

- Todos los escenarios anteriores se completan con los resultados esperados.
- No se registran errores en la consola del navegador durante ninguna de las pruebas.
- Los cambios en datos (códigos, usuarios, facturas, historial) persisten en `localStorage` tras recargar la aplicación.
