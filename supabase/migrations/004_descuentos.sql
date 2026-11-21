-- ============================================================
-- MIGRACIÓN 004 — Descuentos y recargos en pedidos
--
-- Se corre UNA vez, después de 003, en Supabase:
-- SQL Editor > New query > pegar todo > Run.
-- Se puede correr más de una vez sin romper nada.
-- ============================================================

-- subtotal: suma de los productos. total: subtotal + ajuste.
-- adjustment_kind: 'porcentaje' o 'monto' (vacío = sin ajuste).
-- adjustment_value: negativo = descuento, positivo = recargo.
--   Ej: porcentaje -10 = 10% de descuento; monto 2000 = $2.000 de recargo.
alter table orders add column if not exists subtotal numeric not null default 0;
alter table orders add column if not exists adjustment_kind text;
alter table orders add column if not exists adjustment_value numeric not null default 0;

do $$ begin
  alter table orders add constraint orders_adjustment_kind_valido
    check (adjustment_kind in ('porcentaje', 'monto'));
exception when duplicate_object then null; end $$;

-- Pedidos anteriores: el subtotal es igual al total (no tenían ajuste).
update orders set subtotal = total where subtotal = 0 and total <> 0;

-- Calcula subtotal y total de un pedido. El total se redondea a pesos
-- enteros y nunca baja de cero.
create or replace function compute_order_total(p_order_id bigint) returns void
language plpgsql as $$
declare
  v_subtotal numeric;
begin
  select coalesce(sum(quantity * unit_price), 0) into v_subtotal
    from order_items where order_id = p_order_id;

  update orders
     set subtotal = v_subtotal,
         total = greatest(0, round(v_subtotal + case adjustment_kind
                   when 'porcentaje' then v_subtotal * adjustment_value / 100
                   when 'monto' then adjustment_value
                   else 0
                 end))
   where id = p_order_id;
end $$;

-- El trigger de los ítems ahora usa el cálculo con ajuste.
create or replace function recalc_order_total() returns trigger
language plpgsql as $$
begin
  perform compute_order_total(coalesce(new.order_id, old.order_id));
  return null;
end $$;

-- Aplica (o quita, con p_kind null) un descuento o recargo.
create or replace function set_order_adjustment(p_order_id bigint, p_kind text, p_value numeric)
returns orders
language plpgsql as $$
declare
  v_order orders;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'El pedido no existe';
  end if;
  if v_order.status in ('pagado', 'cancelado') then
    raise exception 'Este pedido ya está cerrado: no se puede modificar';
  end if;
  if p_kind is not null and p_kind not in ('porcentaje', 'monto') then
    raise exception 'Tipo de ajuste inválido';
  end if;
  if p_kind = 'porcentaje' and (p_value < -100 or p_value > 100) then
    raise exception 'El porcentaje tiene que estar entre 0 y 100';
  end if;

  update orders
     set adjustment_kind = p_kind,
         adjustment_value = case when p_kind is null then 0 else coalesce(p_value, 0) end
   where id = p_order_id;
  perform compute_order_total(p_order_id);

  select * into v_order from orders where id = p_order_id;
  return v_order;
end $$;

-- Cobrar: igual que antes, pero el total respeta el descuento o recargo.
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

  perform compute_order_total(p_order_id);

  update orders
     set status = 'pagado',
         paid_at = now(),
         payment_method = p_payment_method,
         cash_session_id = v_session_id
   where id = p_order_id
  returning * into v_order;
  return v_order;
end $$;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('compute_order_total', 'set_order_adjustment', 'pay_order')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
