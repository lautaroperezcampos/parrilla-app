-- ============================================================
-- MIGRACIÓN 003 — Comandas para parrilla y cocina
--
-- Se corre UNA vez, después de 002, en Supabase:
-- SQL Editor > New query > pegar todo > Run.
-- Se puede correr más de una vez sin romper nada.
-- ============================================================

-- Dónde se prepara cada producto: 'parrilla', 'cocina', o vacío
-- (bebidas y otros: van a la cuenta pero no salen en ninguna comanda).
alter table products add column if not exists print_station text;

do $$ begin
  alter table products add constraint products_print_station_valida
    check (print_station in ('parrilla', 'cocina'));
exception when duplicate_object then null; end $$;

-- Cuánto de cada ítem ya se mandó en una comanda. Así, si la mesa pide
-- algo más, la próxima comanda trae solo lo nuevo.
alter table order_items add column if not exists sent_quantity numeric not null default 0;

-- Asigna la estación según la categoría, solo a los productos que
-- todavía no tienen una.
update products p set print_station = 'parrilla'
  from categories c
 where c.id = p.category_id and c.name = 'Parrilla' and p.print_station is null;

update products p set print_station = 'cocina'
  from categories c
 where c.id = p.category_id
   and c.name in ('Entradas', 'Cocina rápida', 'Postres', 'Guarniciones')
   and p.print_station is null;

-- Marca todo el pedido como enviado a cocina/parrilla y, si recién se
-- estaba tomando, lo pasa a "En preparación".
create or replace function mark_order_sent(p_order_id bigint) returns void
language plpgsql as $$
begin
  update order_items set sent_quantity = quantity
   where order_id = p_order_id and sent_quantity <> quantity;
  update orders set status = 'en_preparacion'
   where id = p_order_id and status = 'abierto';
end $$;

revoke execute on function mark_order_sent(bigint) from public, anon;
grant execute on function mark_order_sent(bigint) to authenticated;
