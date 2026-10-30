# Don Blas App

Sistema de gestión para la Parrilla & Parador "Don Blas": mesas y pedidos,
ventas, gastos, stock, proveedores, caja y reportes. Funciona en la compu,
la tablet y el celular, y todos los dispositivos ven los mismos datos al
instante.

---

## Con qué está hecha

### Lenguajes

| Lenguaje | Dónde se usa | Para qué |
|---|---|---|
| **JavaScript** (con **JSX**) | `client/src/` | Todo lo que se ve y se toca en la app: pantallas, botones, formularios. JSX es JavaScript que permite escribir la estructura de la pantalla parecido a HTML. |
| **SQL** (PostgreSQL) | `supabase/` | La base de datos: las tablas, las reglas de seguridad y las operaciones importantes (cobrar, abrir y cerrar caja, mover stock, reportes), que se hacen dentro de la base para que nunca queden a medias. |
| **HTML y CSS** | `client/index.html`, `client/src/index.css` | La página base donde se carga la app y los estilos generales. |

### Programas y servicios

| Programa / servicio | Para qué sirve |
|---|---|
| **React** | Librería para armar la interfaz con pantallas y componentes reutilizables (por ejemplo, la misma ventana de pedido se usa en Mesas y en Ventas). |
| **Vite** | Herramienta que corre la app en la compu mientras se programa (`npm run dev`) y la empaqueta lista para publicar (`npm run build`). |
| **Tailwind CSS** | Sistema de estilos: colores, tamaños y la adaptación al celular se escriben con clases cortas, con la paleta propia de la parrilla (carbón, brasa, crema). |
| **React Router** | Maneja las secciones de la app (`/mesas`, `/ventas`, `/caja`...) sin recargar la página. |
| **Recharts** | Dibuja los gráficos del Dashboard y de Reportes. |
| **Supabase** | Servicio en la nube que da la base de datos **PostgreSQL**, el **login** de usuarios y las actualizaciones **en tiempo real** (las mesas se actualizan solas en todos los dispositivos). |
| **Vercel** | Publica la app en internet (`parrilla-app-nine.vercel.app`). Cada vez que se sube un cambio a GitHub, la actualiza sola. |
| **GitHub** | Guarda el código y el historial de cambios. Es de donde Vercel toma la app para publicarla. |
| **Node.js y npm** | Necesarios en la compu para instalar las librerías (`npm install`) y correr Vite. No se usan en la app publicada. |
| **Git** | Programa para registrar los cambios del código y subirlos a GitHub (`git commit`, `git push`). |

### Cómo se conecta todo

```
Celular / compu (navegador)
        │  abre la app desde
        ▼
     Vercel  ◄── toma el código de ── GitHub
        │
        │  la app lee y guarda datos en
        ▼
    Supabase (login + base de datos PostgreSQL)
```

### Organización de las carpetas

- `client/` — la app (React).
  - `src/pages/` — una pantalla por sección (Mesas, Ventas, Caja...).
  - `src/components/` — partes reutilizables (ventanas, gráficos, filtros).
  - `src/lib/api/` — todo lo que habla con la base de datos.
  - `public/logo.png` — el logo.
- `supabase/` — la base de datos.
  - `schema.sql` — tablas iniciales.
  - `migrations/002_app_completa.sql` — cobros, caja, reportes y seguridad (login).
  - `datos/carta_don_blas.sql` — carga los productos de la carta.

---

## Puesta en marcha (una sola vez)

> Si ya tenías la app andando con `schema.sql`, arrancá desde el **Paso A**.
> Si es una instalación nueva, primero corré `schema.sql` en el SQL Editor
> de Supabase y después seguí con el Paso A.

### Paso A — Crear el usuario para entrar a la app

1. En Supabase, menú **Authentication → Users → Add user → Create new user**.
2. Poné el email y una contraseña. Marcá **Auto Confirm User**.
3. Repetí para cada persona que vaya a usar la app (por ejemplo, uno para
   tu papá y otro para el encargado o el mozo).

### Paso B — Cerrar el registro público (MUY IMPORTANTE)

Menú **Authentication → Sign In / Providers** (en algunas versiones,
**Settings**) → desactivá **Allow new users to sign up** → **Save**.

Si no lo desactivás, cualquiera que encuentre la app podría crearse una
cuenta y ver o modificar todo.

### Paso C — Correr la migración

1. **SQL Editor → New query**.
2. Pegá todo el contenido de `supabase/migrations/002_app_completa.sql` y
   apretá **Run**. Tiene que decir "Success".
3. Desde ese momento, sin iniciar sesión no se puede leer ni escribir nada.

### Paso D — Publicar

```
git add .
git commit -m "App completa"
git push
```

Vercel actualiza la app sola en uno o dos minutos. Entrá con el usuario
del Paso A.

### Probar en la compu (opcional)

```
cd client
npm install
npm run dev
```

Y abrí `http://localhost:5173`. El archivo `client/.env` tiene que tener
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (ver `.env.example`).

---

## Cómo se usa en el día a día

1. **Al abrir: Caja → Abrir caja** con el efectivo de cambio. Sin la caja
   abierta se pueden tomar pedidos, pero no cobrar.
2. **Mesas:** tocá una mesa libre para abrirla y cargá los productos.
   Cambiá el estado (en preparación, listo, pidió la cuenta) para que
   todos vean cómo va cada mesa. **Cobrar** pide el medio de pago, descuenta
   el stock y libera la mesa.
3. **Ventas → Venta de mostrador** para lo que se vende sin mesa (para
   llevar, bebidas sueltas). Desde el listado se puede ver el detalle y
   **anular** una venta cobrada por error (mientras la caja siga abierta).
4. **Gastos:** cada compra o pago. Si se pagó con plata de la caja, marcalo
   así se descuenta del efectivo esperado. Si es mercadería, elegí el
   producto y la cantidad, y el stock se suma solo.
5. **Al cerrar: Caja → Cerrar caja**, contando el efectivo. La app muestra
   si sobra o falta plata y guarda el cierre en el historial.
6. **Dashboard** para el resumen del día y **Reportes** para ver cualquier
   período: ventas, gastos, lo más vendido, medios de pago y margen.

### Stock

- **Entrada / Salida:** compras sueltas, mermas, vencidos.
- **Ajustar:** cuando contás lo que hay de verdad y querés corregir el número.
- **Historial:** cada movimiento, con la fecha y el motivo.
- "Descontar stock al vender" se desmarca en productos que no se cuentan
  (por ejemplo, una ensalada armada en el momento).
- "Se vende en la carta" se desmarca en insumos (carbón, sal): aparecen en
  stock y en compras, pero no en los pedidos.
- Si se cobra algo que figuraba sin stock, la venta igual se hace (no
  trabamos un cobro) y el producto queda en negativo: es la señal de que
  hay que cargar la compra o ajustar.
