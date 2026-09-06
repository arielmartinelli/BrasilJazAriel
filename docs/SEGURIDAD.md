# Auditoría de seguridad — Nossa História

Fecha: septiembre 2026 · Rama `hardening-y-mejoras`

---

## 1. Lo que había (por gravedad)

| # | Hallazgo | Riesgo | Estado |
|---|----------|--------|--------|
| 1 | **RLS abierta a `anon`** en Supabase: policies `USING (true)` para SELECT, INSERT, UPDATE y DELETE | Cualquiera que abriera el sitio podía leer, editar y **borrar todos los recuerdos** desde la consola del navegador. La anon key viaja dentro del JS público, y la URL del proyecto estaba en el commit inicial de un repo en GitHub | ✅ Cerrado |
| 2 | **`/api/upload` sin autenticación ni límites** | Cualquiera en internet podía subir archivos ilimitados a tu cuenta de Cloudinary: agotar la cuota gratuita, o alojar contenido ajeno bajo tu nombre | ✅ Cerrado |
| 3 | **XSS en los pines del mapa**: el título del recuerdo y la URL de la foto se inyectaban como HTML crudo en `L.divIcon({ html })` | Un título con `<img onerror=...>` ejecutaba código al dibujar el mapa. Explotable porque cualquiera podía escribir en la base (#1) | ✅ Cerrado |
| 4 | **Sin control de acceso**: el README decía "privado" pero no había login ni código | Cualquiera con el link veía todo | ✅ Cerrado |
| 5 | **Secretos en `.env.example`**: el `CLOUDINARY_API_SECRET` real estaba en texto plano en un archivo cuyo nombre invita a compartirlo | Filtración por descuido. *No llegó a git* (verificado en todo el historial) | ✅ Limpiado — **rotar la clave** |
| 6 | **Fuga de detalles internos**: `/api/upload` devolvía el objeto de error de Cloudinary completo al cliente | Revelaba configuración del servidor | ✅ Cerrado |
| 7 | **Sin cabeceras de seguridad**: ni CSP, ni HSTS, ni X-Frame-Options | Clickjacking, XSS sin contención, downgrade a HTTP | ✅ Cerrado |
| 8 | **URLs de media sin validar**: se aceptaba cualquier texto como URL de foto | `javascript:` como origen de imagen | ✅ Cerrado |
| 9 | `.gitignore` con `.env*` sin excepción | La plantilla `.env.example` nunca se podía versionar | ✅ Corregido |

---

## 2. Qué se hizo

### Capa 1 — Base de datos
`supabase/migrations/001_cerrar_acceso_publico.sql`

Los roles `anon` y `authenticated` perdieron **todo** acceso a las tablas: se borraron las policies permisivas, se dejó RLS activo sin ninguna policy, y además se hizo `REVOKE ALL` a nivel de tabla (cinturón y tiradores). Las tablas también salieron de la publicación de *realtime*, que usaba la anon key y volvía a exponer los datos.

Solo `service_role` llega a los datos, y esa clave nunca sale del servidor.

### Capa 2 — Servidor
El navegador ya no habla con Postgres. Todo pasa por rutas de API nuevas:

- `GET/POST /api/memories`, `PUT/DELETE /api/memories/[id]` — validan sesión, validan la entrada con Zod y recién ahí tocan la base.
- `POST /api/session` — canjea el código compartido por una cookie `httpOnly` firmada con HMAC-SHA256. Comparación en tiempo constante (no filtra el código por *timing*) y 8 intentos cada 10 minutos por IP.
- `POST /api/upload` — exige sesión, limita a 40 archivos cada 10 min por IP, valida el tipo declarado contra una lista blanca, **verifica los magic bytes** del archivo (el `Content-Type` del navegador se puede falsear) y corta en 15 MB por foto / 120 MB por video.

Se eliminó el *fallback* que devolvía la foto entera como data URL base64: terminaba guardada en la base y en `localStorage`, reventando la cuota del navegador.

### Capa 3 — Navegador
- **CSP con nonce por request** (`proxy.ts`) y `'strict-dynamic'`: cualquier script inyectado queda bloqueado aunque alguien logre meter HTML.
- HSTS (2 años), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (cámara, micrófono y pagos apagados; geolocalización solo para el propio sitio), COOP/CORP.
- Todo texto que entra en HTML crudo va escapado (`escapeHtml` en `lib/media.ts`).
- Las URLs de media se validan contra un esquema Zod: solo `https` y solo Cloudinary o Unsplash.

> ⚠️ **Detalle que casi rompe todo:** la CSP con nonce bloqueaba el 100 % de los scripts porque la página se prerenderizaba estática — el HTML quedaba congelado en build con un nonce viejo mientras la cabecera cambiaba en cada request. Se detectó sirviendo el build real y se corrigió con `export const dynamic = 'force-dynamic'` en `app/layout.tsx`. Verificado: los 15 `<script>` de la página llevan el nonce correcto.

---

## 3. Lo que tenés que hacer vos (no lo puedo hacer yo)

Por orden de urgencia:

1. **Correr la migración.** Supabase → SQL Editor → pegar `supabase/migrations/001_cerrar_acceso_publico.sql` → Run.
   Verificar después con:
   ```sql
   SELECT tablename, policyname, roles FROM pg_policies
   WHERE schemaname = 'public' AND 'anon' = ANY(roles);
   ```
   Tiene que devolver **0 filas**.

2. **Rotar el `CLOUDINARY_API_SECRET`.** Cloudinary → Settings → Access Keys → generar una nueva y borrar la vieja. No llegó a git, pero estuvo en texto plano en un archivo llamado `.env.example`.

3. **Revisar la API_KEY de Cloudinary.** El `.env.example` viejo tenía `4578759...` y tu `.env.local` tiene `6435...`. Son distintas: una de las dos está mal, y es la explicación más probable de que fallaran las subidas. (No pude confirmarlo desde acá: esta máquina no tiene salida a internet.)

4. **Definir las variables nuevas** en `.env.local` y en Vercel → Settings → Environment Variables:
   ```
   SUPABASE_SERVICE_ROLE_KEY=...   # Supabase → Project Settings → API → service_role
   APP_ACCESS_CODE=...             # el código que van a compartir Jazmín y vos (12+ caracteres)
   SESSION_SECRET=...              # node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   Sin `APP_ACCESS_CODE` la app corre en **modo abierto** (cómodo en local, inseguro en producción).

5. **Chequear si el repo de GitHub es público.** Si lo es, el commit inicial expuso la URL del proyecto Supabase y la anon key. Con la migración aplicada esa clave ya no sirve para nada, así que no hace falta rotarla — pero conviene saberlo.

---

## 4. Lo que queda pendiente (deuda conocida)

- **Rate limit en memoria.** En Vercel cada instancia serverless tiene su propio contador, así que el límite real es por instancia. Alcanza para frenar un abuso casual, que es el riesgo de un diario privado. Si el sitio se vuelve público, migrar a Upstash Redis o Vercel KV.
- **Un solo código compartido** en vez de usuarios individuales. Si algún día querés saber quién hizo cada cambio, o revocar el acceso de un dispositivo puntual, hay que pasar a Supabase Auth con magic link.
- **Sin borrado en Cloudinary.** Al eliminar un recuerdo se borra la fila, pero las fotos quedan ocupando cuota. Se guarda el `publicId` en la respuesta de subida, así que la limpieza es fácil de agregar cuando haga falta.
