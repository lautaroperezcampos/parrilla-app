# Parrilla App — Fase 0

Base del proyecto: React + Vite + Tailwind en el frontend, Supabase (Postgres
en la nube) como base de datos. Sidebar con las 8 secciones y páginas vacías
listas para ir completando fase por fase.

## Qué incluye esta entrega

- `client/` — el proyecto de React que vas a correr y luego publicar en Vercel.
- `supabase/schema.sql` — todas las tablas de la base de datos, listas para
  pegar en Supabase.

## Paso 1 — Crear el proyecto en Supabase

1. Andá a https://supabase.com y creá una cuenta (podés entrar con GitHub).
2. Botón **New project**. Elegí un nombre (ej. "parrilla-app"), una
   contraseña para la base (guardala en un lugar seguro) y una región
   cercana (por ejemplo, South America - São Paulo).
3. Esperá 1-2 minutos a que el proyecto termine de crearse.
4. En el menú lateral, andá a **SQL Editor** → **New query**.
5. Abrí el archivo `supabase/schema.sql` de esta entrega, copiá todo su
   contenido, pegalo en el editor y apretá **Run**.
6. Deberías ver "Success. No rows returned". Si da error, copiá el mensaje
   y lo revisamos.
7. Andá a **Project Settings** (ícono de engranaje) → **API**. Vas a
   necesitar dos datos de ahí en el paso 3: **Project URL** y la clave
   **anon public**.

## Paso 2 — Correr el proyecto en tu PC

Necesitás tener instalado **Node.js** (versión 18 o superior). Para
verificarlo, abrí una terminal y escribí:

```
node -v
```

Si no lo tenés, descargalo de https://nodejs.org (versión LTS).

Con el proyecto ya descomprimido:

```
cd parrilla-app/client
npm install
```

Esto puede tardar uno o dos minutos la primera vez.

## Paso 3 — Conectar con Supabase

Dentro de `client/`, copiá el archivo `.env.example` y renombralo a `.env`:

```
cp .env.example .env
```

Abrí `.env` y completá con los datos del Paso 1:

```
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
```

## Paso 4 — Probar en local

```
npm run dev
```

Abrí en el navegador la dirección que muestra la terminal (normalmente
`http://localhost:5173`). Deberías ver el sidebar con las 8 secciones y el
Dashboard con las tarjetas en cero. Recorré cada sección del menú: todas
tienen que abrir sin error (van a decir "Se implementa en la Fase X",
eso es lo esperado por ahora).

## Paso 5 — Subir el proyecto a GitHub

Vercel se conecta con un repositorio de GitHub para publicar la app.

1. Creá una cuenta en https://github.com si no tenés.
2. Creá un repositorio nuevo (privado o público, como prefieras), sin
   agregar README ni licencia (ya tenemos uno).
3. Desde la carpeta `parrilla-app/`:

```
git init
git add .
git commit -m "Fase 0: estructura inicial del proyecto"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

## Paso 6 — Publicar en Vercel

1. Andá a https://vercel.com y creá una cuenta (podés entrar con GitHub,
   así se conecta directo).
2. Botón **Add New** → **Project**, y elegí el repositorio que acabás de subir.
3. En **Root Directory**, elegí `client` (importante: el proyecto de React
   está dentro de esa carpeta, no en la raíz del repo).
4. En **Environment Variables**, agregá las mismas dos del Paso 3:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Botón **Deploy**. En un minuto te da un link (algo como
   `parrilla-app.vercel.app`) que ya podés abrir desde cualquier
   dispositivo con internet.

## Cómo probar que quedó bien

- Abrí el link de Vercel desde tu celular y desde la PC: tiene que verse
  igual en ambos.
- Si algún día cambiamos código, hacés `git push` de nuevo y Vercel
  actualiza la app sola en un minuto, sin que tengas que hacer nada más.

## Próximo paso

Fase 1: módulo de Stock — carga de productos, alertas de stock bajo,
entradas y salidas.
