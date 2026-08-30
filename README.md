# Oasis Seguimiento

App de seguimiento de personas del **Centro de Alabanza Oasis**.

Los líderes registran a las personas nuevas, la app las acompaña por WhatsApp desde el
número oficial de la iglesia, y el Apóstol ve en un solo panel quién espera oración, quién
espera visita y qué líderes cumplieron.

> **Está funcionando ahora mismo.** Sin configurar nada, la app arranca en *modo demo* con
> 12 personas de ejemplo. Puedes recorrerla completa antes de conectar Firebase o WhatsApp.

---

## Índice

1. [Verla funcionando en 3 minutos](#1-verla-funcionando-en-3-minutos)
2. [Llevarla a Google AI Studio](#2-llevarla-a-google-ai-studio)
3. [Conectar Firebase](#3-conectar-firebase-los-datos-de-verdad)
4. [Conectar WhatsApp](#4-conectar-whatsapp)
5. [Encender el agente](#5-encender-el-agente-gemini)
6. [Cómo está hecha por dentro](#6-cómo-está-hecha-por-dentro)
7. [Seguridad: lo que no se debe tocar](#7-seguridad-lo-que-no-se-debe-tocar)
8. [Cuando algo falla](#8-cuando-algo-falla)

---

## 1. Verla funcionando en 3 minutos

Necesitas [Node.js 20 o superior](https://nodejs.org). Después, en una terminal dentro de
esta carpeta:

```bash
npm install
npm run dev
```

Abre **http://localhost:5173**. Hay dos contraseñas en la demostración:

- `oasis` → entras como líder y escoges tu nombre de la lista.
- `apostol` → entras como Apóstol, con acceso al panel privado.

En modo demo puedes registrar personas, marcar banderas, cerrar tareas y difundir. Nada sale
de tu computador y no se envía ningún WhatsApp de verdad.

Para volver a los datos de ejemplo originales, borra el almacenamiento del navegador o abre
la consola y ejecuta `localStorage.clear()`.

---

## 2. Llevarla a Google AI Studio

AI Studio importa el proyecto desde GitHub **una sola vez**. El propio cuadro de importación
lo advierte: *"Imported code won't stay synced with GitHub"*. Es decir, la copia que queda en
AI Studio es independiente: lo que cambies allá **no** vuelve solo al repositorio, y lo que
cambies en el repositorio **no** llega solo a AI Studio.

En la práctica esto significa: una vez importes, trabaja allá. GitHub queda como respaldo de
esta versión. Si más adelante quieres volver a partir del repositorio, tendrás que importarlo
de nuevo como app nueva.

### Paso 1 — Crear la cuenta de GitHub

Entra a [github.com](https://github.com) y crea una cuenta gratis con el correo de la
iglesia. Confirma el correo.

### Paso 2 — Crear el repositorio

En GitHub, botón **New** (o [github.com/new](https://github.com/new)):

- **Repository name:** `oasis-seguimiento`
- **Visibilidad:** **Private**. Muy importante: el repositorio debe ser privado.
- **No marques** ninguna de las casillas de abajo (README, .gitignore, license).
- Botón **Create repository**.

### Paso 3 — Subir el proyecto

GitHub te va a mostrar unas instrucciones. En la terminal, dentro de esta carpeta:

```bash
git init
git add .
git commit -m "Primera versión de Oasis Seguimiento"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/oasis-seguimiento.git
git push -u origin main
```

Reemplaza `TU-USUARIO` por tu usuario de GitHub. Te va a pedir usuario y contraseña: la
contraseña es un **token** que generas en GitHub, en *Settings → Developer settings →
Personal access tokens*.

> El archivo `.gitignore` ya impide que se suba el archivo `.env` con tus claves. Nunca lo
> quites de ahí.

### Paso 4 — Importar en AI Studio

1. Entra a [aistudio.google.com](https://aistudio.google.com) y ve a la pestaña **Build**.
2. En el cuadro de texto, usa el botón **+** → **Import from GitHub**.
3. Elige el repositorio `oasis-seguimiento` y autoriza el acceso.
4. Espera a que termine de importar y verás la app.

**Si la importación falla:**

| Lo que ves | Qué pasa |
|---|---|
| *"No matching repositories found"* | Pegaste la dirección completa `https://github.com/usuario/repo`. Ese campo no acepta direcciones: escribe solo `usuario/repo`, o incluso solo el nombre del repositorio. |
| *"Requested entity was not found."* pero el repositorio **sí aparece** en la lista de abajo | El error es del intento anterior y se quedó pegado en pantalla. Ignóralo y haz clic en **Import** en la fila del repositorio. |
| El repositorio no aparece en la lista | AI Studio no tiene permiso sobre él. En GitHub: *Settings → Applications → Authorized GitHub Apps → Google AI Studio → Configure*, y en **Repository access** agrega el repositorio (los privados hay que darlos uno por uno). |
| Aparece pero al importar falla | Revisa que el repositorio tenga los archivos subidos en la rama `main` (ábrelo en GitHub: si está vacío, faltó el `git push`). Después recarga la página de AI Studio para limpiar errores viejos. |

### Paso 5 — Seguir trabajando desde AI Studio

Ya adentro, puedes pedirle cambios en español. Por ejemplo:

```
Agrega una pantalla de "Células" donde el Apóstol pueda agrupar personas
por barrio, y que al registrar una persona se pueda elegir su célula.
No cambies nada de lo que ya funciona.
```

O bien:

```
En la ficha de persona, agrega un botón para programar un recordatorio
de llamada en X días, que cree una tarea con esa fecha de vencimiento.
```

**La frase «no cambies nada de lo que ya funciona» es importante.** Es lo que evita que
arreglar una cosa rompa otras tres.

---

## 3. Conectar Firebase (los datos de verdad)

Mientras no hagas esto, la app guarda todo en el navegador y se pierde al limpiar los datos.

1. Entra a [console.firebase.google.com](https://console.firebase.google.com) con la cuenta
   de Google de la iglesia y crea un proyecto llamado `oasis-seguimiento`.
2. **Authentication** → *Comenzar* → habilita **Anónimo** como método de acceso. No es
   para que la gente entre sin identificarse: es lo que permite que las reglas exijan una
   sesión y la base de datos no quede abierta a internet. Los líderes entran con la
   contraseña de la iglesia.
3. **Firestore Database** → *Crear base de datos* → modo **producción** → región
   `southamerica-east1` (la más cercana a Colombia).
4. **Reglas** → borra lo que haya y pega el contenido completo del archivo
   [`firestore.rules`](./firestore.rules) → **Publicar**. Este paso no es opcional: es lo
   que impide que cualquiera en internet lea la base de datos de la iglesia.
5. **Configuración del proyecto** → *Tus apps* → agrega una app **Web** → copia los valores
   que te muestra.
6. Copia el archivo `.env.example` y renómbralo a `.env`. Pega ahí los valores en las
   variables que empiezan por `VITE_FIREBASE_`.
7. Para que el servidor también pueda escribir: **Configuración del proyecto → Cuentas de
   servicio → Generar nueva clave privada**. Se descarga un `.json`. Abre ese archivo, copia
   **todo** su contenido y pégalo en una sola línea en `FIREBASE_SERVICE_ACCOUNT`.

Reinicia con `npm run dev`. La etiqueta **Demo** de la cabecera desaparece y la app, al
encontrar la base vacía, te muestra una pantalla de instalación: escribes el nombre del
Apóstol y las dos contraseñas, y queda lista.

> **Cambia las contraseñas antes de meter datos de personas reales.** Las de la
> demostración (`oasis` y `apostol`) las conoce cualquiera que haya visto esta guía.

### Sobre el plan de Firebase

El plan gratuito (Spark) alcanza para una iglesia mediana. El plan Blaze —pago por uso— se
necesita solo para que el servidor pueda llamar hacia afuera, a WhatsApp. Blaze mantiene el
cupo gratuito y solo cobra lo que lo exceda: pon una alerta de presupuesto en US$5 y quédate
tranquilo.

---

## 4. Conectar WhatsApp

Antes de esto necesitas tener lista la cuenta de Meta Business verificada y las plantillas
aprobadas. Ver la sección de plantillas más abajo.

1. Entra a [developers.facebook.com](https://developers.facebook.com) → *Mis apps* → crea
   una app de tipo **Empresa** y agrégale el producto **WhatsApp**.
2. En *WhatsApp → Configuración de la API* vas a encontrar:
   - El **identificador del número de teléfono** → va en `WHATSAPP_PHONE_NUMBER_ID`.
   - El **identificador de la cuenta de WhatsApp Business** → va en
     `WHATSAPP_BUSINESS_ACCOUNT_ID`.
   - Un **token temporal** de 24 horas para probar. Para producción genera uno permanente
     desde *Usuarios del sistema* en Meta Business → va en `WHATSAPP_TOKEN`.
3. En *Configuración de la app → Básica* está la **clave secreta de la app** →
   `WHATSAPP_APP_SECRET`.
4. Inventa una frase cualquiera, por ejemplo `oasis-verifica-2026`, y ponla en
   `WHATSAPP_VERIFY_TOKEN`.
5. Reinicia. Entra a *Panel → Panel privado → Conexión de WhatsApp* y usa **Enviar mensaje
   de prueba** con tu propio celular. Si llega, está conectado.

### El webhook (recibir respuestas)

Para que las respuestas de las personas lleguen a la app, Meta necesita una dirección
pública. Cuando publiques la app —en AI Studio con *Share → Publish*, o en Cloud Run— vas a
tener una URL del estilo `https://algo.run.app`.

En Meta: *WhatsApp → Configuración → Webhooks → Editar*:

- **URL de devolución de llamada:** `https://TU-DIRECCION/webhook/whatsapp`
- **Token de verificación:** exactamente el mismo `WHATSAPP_VERIFY_TOKEN` del `.env`
- Suscríbete al campo **messages**.

Mientras desarrollas en tu computador, Meta no puede alcanzar `localhost`. Usa
[ngrok](https://ngrok.com) (`ngrok http 8080`) y pon esa dirección temporal.

### Las plantillas

En el Administrador de WhatsApp de Meta Business, crea estas cuatro plantillas en español.
Los nombres deben coincidir **exactamente** con los del archivo
[`src/lib/plantillas.ts`](./src/lib/plantillas.ts):

| Nombre | Categoría | Cuándo se envía |
|---|---|---|
| `oasis_bienvenida` | Utility | El mismo día del registro |
| `oasis_oracion` | Utility | A los 3 días |
| `oasis_visita` | Utility | A los 10 días |
| `oasis_encuentro` | Utility | A los 21 días |
| `oasis_palabra` | Marketing | Cuando el Apóstol difunde |

Los textos exactos están en ese mismo archivo, en el campo `vistaPrevia`. Todas llevan el
botón **«No deseo recibir más»**: ese botón es lo que convierte a alguien que iba a
bloquearte en alguien que simplemente se retira, sin dañar la reputación del número.

### La secuencia automática

La app tiene la secuencia lista, pero alguien tiene que dispararla una vez al día. Tres
formas, de más fácil a más robusta:

- **A mano:** el botón *Correr ahora* en la pantalla de Conexión de WhatsApp, dentro del
  panel privado.
- **Con Cloud Scheduler:** una tarea diaria que haga `POST` a
  `https://TU-DIRECCION/api/secuencia/correr`.
- **Con cualquier servicio de cron gratuito** que llame esa misma dirección.

---

## 5. Encender el agente (Gemini)

Sin clave de Gemini el agente funciona igual, pero con reglas de palabras en vez de
comprensión real. **La detección de crisis funciona en los dos casos**, porque no depende
del modelo: hay una lista de señales que se revisa siempre, antes que la IA.

Para encenderlo, consigue una clave en
[aistudio.google.com/apikey](https://aistudio.google.com/apikey) y ponla en `GEMINI_API_KEY`.
Dentro de AI Studio la clave se inyecta sola y no hay que hacer nada.

### La regla que no se negocia

Si un mensaje suena a crisis —alguien que habla de hacerse daño, de violencia en la casa, de
una emergencia— el agente **no aconseja**. Responde una sola frase diciendo que un pastor se
comunicará pronto, y crea una tarea urgente con vencimiento **hoy** para el líder que
acompaña a esa persona. El Apóstol la ve de primeras, en rojo, en su pantalla de
Seguimiento, y desde ahí puede pasársela a otro líder si hace falta.

Esa regla está en [`server/agente.ts`](./server/agente.ts) y en
[`server/webhook.ts`](./server/webhook.ts). Si le pides cambios a AI Studio, dile
explícitamente que la conserve.

---

## 6. Cómo está hecha por dentro

```
oasis-seguimiento/
├── firestore.rules          ← las reglas de seguridad. Léelas antes de tocarlas.
├── .env.example             ← plantilla de configuración (cópiala a .env)
│
├── src/                     ← lo que ve el líder en su celular
│   ├── lib/
│   │   ├── types.ts         ← etapas, banderas, forma de los datos
│   │   ├── plantillas.ts    ← las plantillas de WhatsApp y la secuencia
│   │   ├── telefono.ts      ← normaliza números al formato de WhatsApp
│   │   ├── reglas.ts        ← asignación de tareas, banderas, cierres
│   │   ├── store.ts         ← habla con Firestore (o con el modo demo)
│   │   ├── firebase.ts      ← conexión con Firebase
│   │   ├── datosDemo.ts     ← las 12 personas de ejemplo
│   │   └── api.ts           ← llamadas al servidor
│   ├── context/             ← quién entró y qué datos puede ver
│   ├── components/          ← piezas de interfaz reutilizables
│   └── pages/               ← las pantallas
│
└── server/                  ← lo que el celular no debe ver nunca
    ├── config.ts            ← lee los secretos del .env
    ├── firebaseAdmin.ts     ← Firestore desde el servidor
    ├── whatsapp.ts          ← envía por la Cloud API de Meta
    ├── agente.ts            ← lee y responde con Gemini
    ├── webhook.ts           ← recibe las respuestas de las personas
    ├── secuencia.ts         ← la secuencia automática de días
    └── index.ts             ← el servidor
```

### Etapas y banderas

Cada persona tiene **una sola etapa** —dónde va en el camino— y **varias banderas** —qué
necesita ahora—.

**Etapas:** Nuevo → Contactado → En seguimiento → Visitado → Consolidado → Discípulo

**Banderas:** Espera llamada de oración · Espera visita · Sin respuesta · Atendido ·
No contactar

Cuando se marca «Espera llamada de oración» o «Espera visita», la app crea sola la tarea y
se la asigna al líder de esa persona, o al que menos carga tenga si ese líder ya está en su
tope.

### Quién hace qué

Los **líderes** son los que ejecutan: registran personas, llaman, visitan, oran y cierran
sus tareas. Cada uno entra y ve lo suyo.

El **Apóstol** supervisa. No llama ni visita, así que la app nunca le asigna una persona ni
una tarea: donde el líder ve «Mis tareas», él ve **Seguimiento**, que es todo lo que el
equipo tiene entre manos —pendiente, vencido, cumplido— sin botón de «marcar como hecha».
Lo único que puede hacer ahí es pasarle una tarea a otro líder cuando alguien se está
quedando. Además arma el equipo, deja encargos y difunde por grupos.

### Quién entra y con qué

No hay cuentas personales. El Apóstol arma el equipo desde su panel privado, y cada líder
entra con la contraseña de la iglesia y toca su nombre en una lista. Es a propósito:
pedirle a cada líder que cree una cuenta es el paso donde la mitad del equipo se queda por
fuera.

El Apóstol tiene su propia contraseña, distinta. Es la única que abre el **panel privado**,
donde se agregan y se quitan líderes, se cambian las dos contraseñas, se ve la bitácora y
se exporta todo.

Cuando se quita a un líder, sus personas y sus tareas pendientes pasan automáticamente al
líder que menos carga tenga. Nadie se queda sin acompañamiento.

### El número que importa

En el panel del Apóstol, arriba de todo, está el promedio de **días entre que alguien dice
«sí, oren por mí» y alguien de la iglesia lo llama**. No es cuántas personas hay
registradas: es ese. Si se mantiene por debajo de dos, la app está cumpliendo su propósito.

---

## 7. Seguridad: lo que no se debe tocar

Cinco cosas protegen los datos de las personas. Si le pides cambios a AI Studio, dile que
conserve todas.

1. **`firestore.rules`.** Cierran la base de datos a quien no tenga la app abierta, impiden
   borrar el historial y no dejan falsificar mensajes. Lo que **no** hacen es separar a un
   líder de otro: como todos entran con la misma contraseña, para Firebase son la misma
   sesión. Dentro de la iglesia, todos los líderes ven a todas las personas. Si algún día
   necesitas que cada líder vea solo las suyas, hay que darle a cada uno su propia cuenta.
2. **Los secretos viven solo en el servidor.** El token de WhatsApp y la clave de Gemini
   nunca llegan al navegador. Las variables que empiezan por `VITE_` sí llegan, y por eso
   ahí solo va la configuración pública de Firebase.
3. **La firma del webhook.** Se verifica siempre `X-Hub-Signature-256`. Sin eso, cualquiera
   que conozca la dirección podría escribir en la base de datos de la iglesia haciéndose
   pasar por Meta.
4. **El consentimiento es obligatorio.** No se puede registrar una persona sin marcar la
   casilla, ni en la pantalla ni en las reglas de Firestore. Es lo que exige la Ley 1581 de
   2012 y lo que protege el número de ser bloqueado.
5. **La bitácora.** Toda acción queda registrada en `auditoria`, y nadie la puede editar ni
   borrar. Una bitácora que se puede editar no sirve como bitácora.
6. **Las dos contraseñas.** La de líderes la comparte todo el equipo: cámbiala cuando
   alguien salga de la iglesia. La del Apóstol es la única que abre el panel donde se
   agregan y se quitan líderes, y no debe compartirse con nadie. Que sean distintas es el
   punto entero, y la app se niega a guardarlas si son iguales.

### Sobre la ley colombiana

La Ley 1581 de 2012 exige autorización previa, expresa e informada; decirle a la persona
para qué usas sus datos; y que pueda conocerlos, actualizarlos y pedir que los borres. Los
datos sobre creencias religiosas son categoría sensible.

Texto sugerido para el formulario de bienvenida:

> «Autorizo al Centro de Alabanza Oasis a guardar mi nombre y número de celular y a
> comunicarse conmigo por WhatsApp con fines de acompañamiento pastoral e invitación a sus
> actividades. Sé que puedo pedir en cualquier momento que dejen de escribirme y que
> eliminen mis datos, escribiendo al mismo número.»

Esto no es asesoría legal. Vale la pena que un abogado revise la política de tratamiento de
datos de la iglesia.

---

## 8. Cuando algo falla

| Qué ves | Qué pasa |
|---|---|
| La etiqueta **Demo** no se va | Falta el archivo `.env` o le faltan los valores de `VITE_FIREBASE_`. Reinicia después de crearlo. |
| «Este dominio no está autorizado» | Agrega el dominio en Firebase → Authentication → Settings → Dominios autorizados. |
| Olvidaste la contraseña del Apóstol | Está en Firestore, colección `configuracion`, documento `acceso`. Cámbiala ahí desde la consola de Firebase. |
| «Missing or insufficient permissions» | No publicaste `firestore.rules`, o no activaste el método de acceso **Anónimo** en Authentication. |
| Meta responde error **132001** | El nombre de la plantilla no coincide con el registrado. Revisa mayúsculas, guiones bajos e idioma. |
| Meta responde error **131030** | Tu app de Meta está en modo de prueba: solo puedes escribirle a los números que agregaste a mano. |
| Meta responde error **190** | El token venció. Genera uno permanente desde *Usuarios del sistema*. |
| El webhook no recibe nada | La URL debe terminar en `/webhook/whatsapp`, el token de verificación debe ser idéntico al del `.env`, y hay que suscribirse al campo **messages**. |
| Todo funciona pero no llega ningún WhatsApp | Mira la consola del servidor: si dice `MODO SIMULADO`, faltan las credenciales en el `.env`. |

### Cómo pedirle a AI Studio que arregle algo

No describas el problema en general. Usa esta estructura:

```
Hay un problema en la aplicación.

QUÉ HICE, paso a paso:
1.
2.

QUÉ ESPERABA QUE PASARA:

QUÉ PASÓ EN REALIDAD:

MENSAJE DE ERROR que aparece en pantalla o en la consola:

Corrige únicamente esto. No cambies el diseño, ni las reglas de seguridad,
ni ninguna otra funcionalidad que ya funciona. Cuando termines, explícame
en español sencillo qué estaba mal y qué cambiaste.
```

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala todo lo necesario. Solo la primera vez. |
| `npm run dev` | Levanta la app para trabajar. Abre http://localhost:5173 |
| `npm run build` | Compila la versión de producción. |
| `npm start` | Corre la versión compilada. Abre http://localhost:8080 |
| `npm run typecheck` | Revisa que no haya errores de tipos. |
