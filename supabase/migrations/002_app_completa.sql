-- ============================================================
-- MIGRACIÓN 002 — App completa (Mesas, Ventas, Gastos, Caja,
-- Reportes, Login)
--
-- Se corre UNA vez, DESPUÉS de schema.sql, en Supabase:
-- Dashboard > SQL Editor > New query > pegar todo > Run.
--
-- IMPORTANTE: antes de correrla, creá el usuario para entrar a la app
-- (ver README, "Login"). Al final de este archivo se cierra el acceso
-- a la base para cualquiera que no haya iniciado sesión.
--
-- Está escrita para poder correrse más de una vez sin romper nada.
-- ============================================================


-- ------------------------------------------------------------
-- 1. AJUSTES DE TABLAS
-- ------------------------------------------------------------

-- Costo del producto al momento de la venta (para calcular la ganancia
-- real aunque después cambie el precio de compra).
alter table order_items add column if not exists unit_cost numeric not null default 0;

-- Solo puede haber una caja abierta a la vez.
create unique index if not exists cash_sessions_una_abierta
  on cash_sessions ((true)) where status = 'abierta';

-- Una mesa no puede tener dos pedidos activos al mismo tiempo
-- (evita que dos mozos abran la misma mesa desde dos celulares).
create unique index if not exists orders_un_activo_por_mesa
  on orders (table_id)
  where table_id is not null and status not in ('pagado', 'cancelado');

-- Índices para que listados y reportes sigan rápidos con el tiempo.
create index if not exists orders_paid_at_idx on orders (paid_at);
create index if not exists orders_cash_session_idx on orders (cash_session_id);
create index if not exists order_items_order_idx on order_items (order_id);
create index if not exists expenses_date_idx on expenses (date);
create index if not exists expenses_cash_session_idx on expenses (cash_session_id);
create index if not exists stock_movements_product_idx on stock_movements (product_id, created_at desc);

-- Si se borra un gasto, sus movimientos de stock quedan en el historial
-- (sin el vínculo) en vez de impedir el borrado.
alter table stock_movements drop constraint if exists stock_movements_expense_fkey;
alter table stock_movements
  add constraint stock_movements_expense_fkey
  foreign key (expense_id) references expenses(id) on delete set null;

do $$ begin
  alter table order_items add constraint order_items_quantity_positiva check (quantity > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table expenses add constraint expenses_amount_positivo check (amount > 0);
exception when duplicate_object then null; end $$;


-- ------------------------------------------------------------
-- 2. TOTAL DEL PEDIDO SIEMPRE AL DÍA
-- ------------------------------------------------------------

-- No se pueden tocar los ítems de un pedido ya cobrado o cancelado.
create or replace function guard_order_items() returns trigger
language plpgsql as $$
declare
  v_order_id bigint := coalesce(new.order_id, old.order_id);
begin
  if exists (select 1 from orders where id = v_order_id and status in ('pagado', 'cancelado')) then
    raise exception 'Este pedido ya está cerrado: no se puede modificar';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists order_items_guard on order_items;
create trigger order_items_guard
  before insert or update or delete on order_items
  for each row execute function guard_order_items();

-- Recalcula orders.total cada vez que cambia un ítem.
create or replace function recalc_order_total() returns trigger
language plpgsql as $$
declare
  v_order_id bigint := coalesce(new.order_id, old.order_id);
begin
  update orders
     set total = coalesce((select sum(quantity * unit_price) from order_items where order_id = v_order_id), 0)
   where id = v_order_id;
  return null;
end $$;

drop trigger if exists order_items_total on order_items;
create trigger order_items_total
  after insert or update or delete on order_items
  for each row execute function recalc_order_total();


-- ------------------------------------------------------------
-- 3. STOCK: movimientos en un solo paso
-- ------------------------------------------------------------
-- Antes la app guardaba el movimiento y después actualizaba el stock
-- por separado, con el número que tenía en pantalla. Si dos personas
-- cargaban a la vez, o fallaba el segundo paso, el stock quedaba mal.
-- Ahora todo pasa junto dentro de la base, bloqueando el producto.

create or replace function register_stock_movement(
  p_product_id bigint,
  p_type text,
  p_quantity numeric,
  p_reason text default null
) returns products
language plpgsql as $$
declare
  v_before numeric;
  v_after numeric;
  v_row products;
begin
  if p_type not in ('entrada', 'salida', 'ajuste') then
    raise exception 'Tipo de movimiento inválido';
  end if;
  if p_quantity is null or p_quantity < 0 or (p_type <> 'ajuste' and p_quantity = 0) then
    raise exception 'Ingresá una cantidad válida';
  end if;

  select stock into v_before from products where id = p_product_id for update;
  if not found then
    raise exception 'El producto no existe';
  end if;

  -- En "ajuste" la cantidad es el stock contado (el nuevo total).
  v_after := case p_type
    when 'entrada' then v_before + p_quantity
    when 'salida' then v_before - p_quantity
    else p_quantity
  end;

  if p_type = 'salida' and v_after < 0 then
    raise exception 'No podés sacar más stock del que hay disponible (hay %)', v_before;
  end if;

  insert into stock_movements (product_id, type, quantity, stock_before, stock_after, reason)
  values (
    p_product_id, p_type,
    case when p_type = 'ajuste' then v_after - v_before else p_quantity end,
    v_before, v_after, nullif(trim(p_reason), '')
  );

  update products set stock = v_after where id = p_product_id returning * into v_row;
  return v_row;
end $$;


-- ------------------------------------------------------------
-- 4. CAJA
-- ------------------------------------------------------------

-- Efectivo que debería haber en la caja: apertura + ventas en efectivo
-- - gastos pagados con plata de la caja.
create or replace function cash_expected(p_session_id bigint) returns numeric
language sql stable as $$
  select s.opening_amount
       + coalesce((select sum(total) from orders
                    where cash_session_id = s.id and status = 'pagado' and payment_method = 'efectivo'), 0)
       - coalesce((select sum(amount) from expenses
                    where cash_session_id = s.id and paid_from_cash), 0)
    from cash_sessions s
   where s.id = p_session_id
$$;

create or replace function open_cash_session(p_opening_amount numeric, p_notes text default null)
returns cash_sessions
language plpgsql as $$
declare
  v_row cash_sessions;
begin
  if exists (select 1 from cash_sessions where status = 'abierta') then
    raise exception 'Ya hay una caja abierta';
  end if;
  if p_opening_amount is null or p_opening_amount < 0 then
    raise exception 'Ingresá un monto inicial válido';
  end if;
  insert into cash_sessions (opening_amount, notes)
  values (p_opening_amount, nullif(trim(p_notes), ''))
  returning * into v_row;
  return v_row;
end $$;

create or replace function close_cash_session(p_counted_amount numeric, p_notes text default null)
returns cash_sessions
language plpgsql as $$
declare
  v_session cash_sessions;
  v_expected numeric;
begin
  select * into v_session from cash_sessions where status = 'abierta' for update;
  if not found then
    raise exception 'No hay ninguna caja abierta';
  end if;
  if p_counted_amount is null or p_counted_amount < 0 then
    raise exception 'Ingresá el efectivo contado';
  end if;
  if exists (select 1 from orders o
              where o.status not in ('pagado', 'cancelado')
                and exists (select 1 from order_items where order_id = o.id)) then
    raise exception 'Hay pedidos sin cobrar. Cobralos o cancelalos antes de cerrar la caja';
  end if;

  v_expected := cash_expected(v_session.id);

  update cash_sessions
     set closed_at = now(),
         expected_amount = v_expected,
         counted_amount = p_counted_amount,
         difference = p_counted_amount - v_expected,
         status = 'cerrada',
         notes = coalesce(nullif(trim(p_notes), ''), notes)
   where id = v_session.id
  returning * into v_session;
  return v_session;
end $$;

-- Resumen de una caja (abierta o cerrada) para mostrar en pantalla.
create or replace function cash_session_summary(p_session_id bigint) returns json
language sql stable as $$
  select json_build_object(
    'opening_amount', s.opening_amount,
    'ventas_total', coalesce((select sum(total) from orders
                               where cash_session_id = s.id and status = 'pagado'), 0),
    'ventas_cantidad', (select count(*) from orders
                         where cash_session_id = s.id and status = 'pagado'),
    'por_metodo', coalesce((select json_agg(m order by m.total desc) from (
                    select payment_method as metodo, sum(total) as total, count(*) as cantidad
                      from orders
                     where cash_session_id = s.id and status = 'pagado'
                     group by payment_method) m), '[]'::json),
    'gastos_caja', coalesce((select sum(amount) from expenses
                              where cash_session_id = s.id and paid_from_cash), 0),
    'esperado', cash_expected(s.id)
  )
  from cash_sessions s
  where s.id = p_session_id
$$;


-- ------------------------------------------------------------
-- 5. COBRAR Y ANULAR VENTAS
-- ------------------------------------------------------------

-- Cobra un pedido: calcula el total, lo asocia a la caja abierta y
-- descuenta el stock de los productos que lo llevan. Todo junto.
-- El stock puede quedar negativo: preferimos no trabar un cobro porque
-- el conteo de stock estaba desactualizado (se ve como "Sin stock").
create or replace function pay_order(p_order_id bigint, p_payment_method text)
returns orders
language plpgsql as $$
declare
  v_order orders;
  v_session_id bigint;
  v_before numeric;
  r record;
begin
  if p_payment_method not in ('efectivo', 'transferencia', 'tarjeta', 'otro') then
    raise exception 'Método de pago inválido';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'El pedido no existe';
  end if;
  if v_order.status in ('pagado', 'cancelado') then
    raise exception 'Este pedido ya está cerrado';
  end if;
  if not exists (select 1 from order_items where order_id = p_order_id) then
    raise exception 'El pedido no tiene productos';
  end if;

  select id into v_session_id from cash_sessions where status = 'abierta';
  if v_session_id is null then
    raise exception 'La caja está cerrada. Abrí la caja para poder cobrar';
  end if;

  for r in
    select oi.product_id, sum(oi.quantity) as cantidad
      from order_items oi
      join products p on p.id = oi.product_id
     where oi.order_id = p_order_id and p.track_stock
     group by oi.product_id
     order by oi.product_id
  loop
    select stock into v_before from products where id = r.product_id for update;
    update products set stock = v_before - r.cantidad where id = r.product_id;
    insert into stock_movements (product_id, type, quantity, stock_before, stock_after, order_id, reason)
    values (r.product_id, 'venta', r.cantidad, v_before, v_before - r.cantidad, p_order_id,
            'Venta #' || p_order_id);
  end loop;

  update orders
     set status = 'pagado',
         paid_at = now(),
         payment_method = p_payment_method,
         cash_session_id = v_session_id,
         total = (select coalesce(sum(quantity * unit_price), 0) from order_items where order_id = p_order_id)
   where id = p_order_id
  returning * into v_order;
  return v_order;
end $$;

-- Anula una venta cobrada por error: devuelve el stock y la marca como
-- cancelada. Solo mientras su caja siga abierta (una caja cerrada ya
-- fue contada y no debe cambiar).
create or replace function void_order(p_order_id bigint, p_reason text default null)
returns orders
language plpgsql as $$
declare
  v_order orders;
  v_before numeric;
  r record;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'La venta no existe';
  end if;
  if v_order.status <> 'pagado' then
    raise exception 'Solo se pueden anular ventas cobradas';
  end if;
  if exists (select 1 from cash_sessions where id = v_order.cash_session_id and status = 'cerrada') then
    raise exception 'No se puede anular: la caja de esa venta ya se cerró';
  end if;

  for r in
    select product_id, quantity from stock_movements
     where order_id = p_order_id and type = 'venta'
     order by product_id
  loop
    select stock into v_before from products where id = r.product_id for update;
    update products set stock = v_before + r.quantity where id = r.product_id;
    insert into stock_movements (product_id, type, quantity, stock_before, stock_after, order_id, reason)
    values (r.product_id, 'ajuste', r.quantity, v_before, v_before + r.quantity, p_order_id,
            'Anulación de venta #' || p_order_id);
  end loop;

  update orders
     set status = 'cancelado',
         notes = concat_ws(' · ', notes, 'Anulada' || coalesce(': ' || nullif(trim(p_reason), ''), ''))
   where id = p_order_id
  returning * into v_order;
  return v_order;
end $$;


-- ------------------------------------------------------------
-- 6. GASTOS
-- ------------------------------------------------------------

-- Crea un gasto. Si se pagó con plata de la caja, queda asociado a la
-- caja abierta. Si es una compra de mercadería, puede sumar al stock.
create or replace function create_expense(
  p_date date,
  p_description text,
  p_amount numeric,
  p_category_id bigint default null,
  p_supplier_id bigint default null,
  p_payment_method text default 'efectivo',
  p_paid_from_cash boolean default false,
  p_notes text default null,
  p_product_id bigint default null,
  p_quantity numeric default null
) returns expenses
language plpgsql as $$
declare
  v_session_id bigint;
  v_expense expenses;
  v_before numeric;
begin
  if nullif(trim(p_description), '') is null then
    raise exception 'La descripción es obligatoria';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Ingresá un monto válido';
  end if;

  if p_paid_from_cash then
    select id into v_session_id from cash_sessions where status = 'abierta';
    if v_session_id is null then
      raise exception 'Para pagar con plata de la caja, primero abrí la caja';
    end if;
  end if;

  insert into expenses (date, description, category_id, supplier_id, amount, payment_method,
                        paid_from_cash, cash_session_id, notes)
  values (coalesce(p_date, current_date), trim(p_description), p_category_id, p_supplier_id, p_amount,
          case when p_paid_from_cash then 'efectivo' else p_payment_method end,
          coalesce(p_paid_from_cash, false), v_session_id, nullif(trim(p_notes), ''))
  returning * into v_expense;

  if p_product_id is not null then
    if p_quantity is null or p_quantity <= 0 then
      raise exception 'Ingresá la cantidad que entra al stock';
    end if;
    select stock into v_before from products where id = p_product_id for update;
    update products set stock = v_before + p_quantity where id = p_product_id;
    insert into stock_movements (product_id, type, quantity, stock_before, stock_after, expense_id, reason)
    values (p_product_id, 'entrada', p_quantity, v_before, v_before + p_quantity, v_expense.id,
            'Compra: ' || v_expense.description);
  end if;

  return v_expense;
end $$;

-- Un gasto pagado desde una caja ya cerrada no se puede editar ni
-- borrar: cambiaría una caja que ya se contó.
create or replace function guard_expense_closed_cash() returns trigger
language plpgsql as $$
begin
  if old.cash_session_id is not null
     and exists (select 1 from cash_sessions where id = old.cash_session_id and status = 'cerrada') then
    raise exception 'Este gasto se pagó desde una caja que ya se cerró: no se puede modificar';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists expenses_guard_closed_cash on expenses;
create trigger expenses_guard_closed_cash
  before update or delete on expenses
  for each row execute function guard_expense_closed_cash();


-- ------------------------------------------------------------
-- 7. REPORTES
-- ------------------------------------------------------------
-- Se calcula en la base (y no en el navegador) para que funcione igual
-- con 10 ventas o con 10.000, y usando la hora de Argentina.

create or replace function report_summary(p_from date, p_to date) returns json
language sql stable as $$
  with o as (
    select * from orders
     where status = 'pagado'
       and (paid_at at time zone 'America/Argentina/Buenos_Aires')::date between p_from and p_to
  ),
  e as (
    select * from expenses where date between p_from and p_to
  )
  select json_build_object(
    'ventas_total', (select coalesce(sum(total), 0) from o),
    'ventas_cantidad', (select count(*) from o),
    'gastos_total', (select coalesce(sum(amount), 0) from e),
    'costo_mercaderia', (select coalesce(sum(oi.quantity * oi.unit_cost), 0)
                           from order_items oi join o on o.id = oi.order_id),
    'ventas_por_dia', coalesce((select json_agg(d order by d.dia) from (
        select (paid_at at time zone 'America/Argentina/Buenos_Aires')::date as dia,
               sum(total) as total, count(*) as cantidad
          from o group by 1) d), '[]'::json),
    'gastos_por_dia', coalesce((select json_agg(d order by d.dia) from (
        select date as dia, sum(amount) as total from e group by 1) d), '[]'::json),
    'por_metodo', coalesce((select json_agg(m order by m.total desc) from (
        select payment_method as metodo, sum(total) as total, count(*) as cantidad
          from o group by 1) m), '[]'::json),
    'top_productos', coalesce((select json_agg(t order by t.total desc) from (
        select oi.product_name as nombre, sum(oi.quantity) as cantidad,
               sum(oi.quantity * oi.unit_price) as total
          from order_items oi join o on o.id = oi.order_id
         group by 1 order by 3 desc limit 10) t), '[]'::json),
    'gastos_por_categoria', coalesce((select json_agg(c order by c.total desc) from (
        select coalesce(cat.name, 'Sin categoría') as categoria, sum(e.amount) as total
          from e left join categories cat on cat.id = e.category_id
         group by 1) c), '[]'::json)
  )
$$;


-- ------------------------------------------------------------
-- 8. TIEMPO REAL (Mesas se actualiza sola en todos los dispositivos)
-- ------------------------------------------------------------
do $$ begin
  begin alter publication supabase_realtime add table orders;
  exception when others then null; end;
  begin alter publication supabase_realtime add table order_items;
  exception when others then null; end;
end $$;


-- ------------------------------------------------------------
-- 9. SEGURIDAD: solo usuarios logueados
-- ------------------------------------------------------------
-- Reemplaza las políticas abiertas de schema.sql. Desde acá, sin
-- iniciar sesión no se puede leer ni escribir nada.
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'suppliers', 'products', 'stock_movements', 'tables',
                           'orders', 'order_items', 'expenses', 'cash_sessions']
  loop
    execute format('drop policy if exists "acceso total (temporal, sin login)" on %I', t);
    execute format('drop policy if exists "solo usuarios logueados" on %I', t);
    execute format('create policy "solo usuarios logueados" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Las funciones tampoco se pueden llamar sin sesión.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('register_stock_movement', 'cash_expected', 'open_cash_session',
                         'close_cash_session', 'cash_session_summary', 'pay_order', 'void_order',
                         'create_expense', 'report_summary')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
