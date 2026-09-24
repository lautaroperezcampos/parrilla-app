-- ============================================================
-- ESQUEMA DE BASE DE DATOS — Parrilla App
-- Ejecutar completo en Supabase: Dashboard > SQL Editor > New query
-- ============================================================

-- Categorías: sirven tanto para productos como para gastos.
create table categories (
  id bigint generated always as identity primary key,
  name text not null,
  type text not null check (type in ('producto', 'gasto'))
);

-- Proveedores.
create table suppliers (
  id bigint generated always as identity primary key,
  name text not null,
  phone text,
  products_sold text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Productos: tanto los que se venden (asado, coca-cola) como
-- insumos que solo se compran (carbón, por ejemplo).
create table products (
  id bigint generated always as identity primary key,
  name text not null,
  category_id bigint references categories(id),
  unit text not null default 'unidad', -- kg, unidades, litros, etc.
  stock numeric not null default 0,
  min_stock numeric not null default 0,
  cost_price numeric not null default 0,
  sale_price numeric not null default 0,
  is_sellable boolean not null default true,  -- aparece en la carta de venta
  track_stock boolean not null default true,  -- descuenta stock automático al vender
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Historial de movimientos de stock (entradas, salidas, ajustes, ventas).
create table stock_movements (
  id bigint generated always as identity primary key,
  product_id bigint not null references products(id),
  type text not null check (type in ('entrada', 'salida', 'ajuste', 'venta')),
  quantity numeric not null,
  stock_before numeric not null,
  stock_after numeric not null,
  reason text,
  order_id bigint,   -- se completa cuando el movimiento viene de una venta
  expense_id bigint, -- se completa cuando el movimiento viene de una compra
  created_at timestamptz not null default now()
);

-- Mesas físicas del salón.
create table tables (
  id bigint generated always as identity primary key,
  number integer not null unique,
  seats integer not null default 4,
  active boolean not null default true
);

-- Pedidos y ventas: un pedido abierto que se cobra ES la venta.
-- table_id null = venta de mostrador (sin mesa).
create table orders (
  id bigint generated always as identity primary key,
  table_id bigint references tables(id),
  status text not null default 'abierto'
    check (status in ('abierto', 'en_preparacion', 'listo', 'pagando', 'pagado', 'cancelado')),
  opened_at timestamptz not null default now(),
  paid_at timestamptz,
  total numeric not null default 0,
  payment_method text check (payment_method in ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  cash_session_id bigint,
  notes text
);

-- Ítems de cada pedido/venta. Guardamos nombre y precio del momento
-- para que un cambio de precio futuro no altere ventas pasadas.
create table order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  product_id bigint references products(id),
  product_name text not null,
  quantity numeric not null,
  unit_price numeric not null
);

-- Gastos.
create table expenses (
  id bigint generated always as identity primary key,
  date date not null default current_date,
  description text not null,
  category_id bigint references categories(id),
  supplier_id bigint references suppliers(id),
  amount numeric not null,
  payment_method text check (payment_method in ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  paid_from_cash boolean not null default false,
  cash_session_id bigint,
  notes text,
  created_at timestamptz not null default now()
);

-- Apertura y cierre de caja.
create table cash_sessions (
  id bigint generated always as identity primary key,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_amount numeric not null default 0,
  expected_amount numeric,
  counted_amount numeric,
  difference numeric,
  status text not null default 'abierta' check (status in ('abierta', 'cerrada')),
  notes text
);

-- Conectamos las referencias que quedaron pendientes (orders y expenses
-- necesitaban existir antes de poder apuntar a cash_sessions).
alter table orders
  add constraint orders_cash_session_fkey foreign key (cash_session_id) references cash_sessions(id);
alter table expenses
  add constraint expenses_cash_session_fkey foreign key (cash_session_id) references cash_sessions(id);
alter table stock_movements
  add constraint stock_movements_order_fkey foreign key (order_id) references orders(id),
  add constraint stock_movements_expense_fkey foreign key (expense_id) references expenses(id);

-- ============================================================
-- DATOS INICIALES
-- ============================================================

insert into categories (name, type) values
  ('Carne', 'gasto'),
  ('Bebidas', 'gasto'),
  ('Verduras', 'gasto'),
  ('Pan', 'gasto'),
  ('Carbón/leña', 'gasto'),
  ('Limpieza', 'gasto'),
  ('Servicios', 'gasto'),
  ('Sueldos', 'gasto'),
  ('Mantenimiento', 'gasto'),
  ('Otros', 'gasto'),
  ('Parrilla', 'producto'),
  ('Bebidas', 'producto'),
  ('Guarniciones', 'producto');

insert into tables (number, seats) values
  (1, 4), (2, 4), (3, 4), (4, 6), (5, 6), (6, 2);

-- ============================================================
-- SEGURIDAD (RLS)
-- Por ahora dejamos acceso abierto para poder desarrollar sin login.
-- En la Fase 6 (login) vamos a reemplazar estas políticas por unas
-- que exijan estar autenticado. Lo dejamos anotado acá para no
-- olvidarnos.
-- ============================================================

alter table categories enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table stock_movements enable row level security;
alter table tables enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table expenses enable row level security;
alter table cash_sessions enable row level security;

create policy "acceso total (temporal, sin login)" on categories for all using (true) with check (true);
create policy "acceso total (temporal, sin login)" on suppliers for all using (true) with check (true);
create policy "acceso total (temporal, sin login)" on products for all using (true) with check (true);
create policy "acceso total (temporal, sin login)" on stock_movements for all using (true) with check (true);
create policy "acceso total (temporal, sin login)" on tables for all using (true) with check (true);
create policy "acceso total (temporal, sin login)" on orders for all using (true) with check (true);
create policy "acceso total (temporal, sin login)" on order_items for all using (true) with check (true);
create policy "acceso total (temporal, sin login)" on expenses for all using (true) with check (true);
create policy "acceso total (temporal, sin login)" on cash_sessions for all using (true) with check (true);
