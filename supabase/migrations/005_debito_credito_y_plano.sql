-- ============================================================
-- MIGRACIÓN 005 — Débito / crédito y plano de mesas
--
-- Se corre UNA vez, después de 004, en Supabase:
-- SQL Editor > New query > pegar todo > Run.
-- Se puede correr más de una vez sin romper nada.
-- ============================================================

-- 1. Medios de pago: se separa la tarjeta en débito y crédito.
--    'tarjeta' y 'otro' siguen siendo válidos para las ventas viejas.
alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check
  check (payment_method in ('efectivo', 'transferencia', 'debito', 'credito', 'tarjeta', 'otro'));

alter table expenses drop constraint if exists expenses_payment_method_check;
alter table expenses add constraint expenses_payment_method_check
  check (payment_method in ('efectivo', 'transferencia', 'debito', 'credito', 'tarjeta', 'otro'));

-- 2. Plano de mesas: cada mesa tiene una zona (Salón, Patio...) y su
--    posición dentro de ella, en porcentaje (0 a 100). Sin posición, la
--    app la acomoda sola.
alter table tables add column if not exists zone text not null default 'Salón';
alter table tables add column if not exists pos_x numeric;
alter table tables add column if not exists pos_y numeric;

-- 3. Cobrar: igual que en la 004, con los medios de pago nuevos.
create or replace function pay_order(p_order_id bigint, p_payment_method text)
returns orders
language plpgsql as $$
declare
  v_order orders;
  v_session_id bigint;
  v_before numeric;
  r record;
begin
  if p_payment_method not in ('efectivo', 'transferencia', 'debito', 'credito') then
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

revoke execute on function pay_order(bigint, text) from public, anon;
grant execute on function pay_order(bigint, text) to authenticated;
