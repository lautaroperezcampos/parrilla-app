-- ============================================================
-- MIGRACIÓN 006 — Borrar mesas sin perder el historial
--
-- Se corre UNA vez, después de 005, en Supabase:
-- SQL Editor > New query > pegar todo > Run.
-- Se puede correr más de una vez sin romper nada.
-- ============================================================

-- Cada pedido guarda el número de mesa que tenía, así las ventas viejas
-- siguen diciendo "Mesa 4" aunque esa mesa después se borre.
alter table orders add column if not exists table_number integer;

update orders o set table_number = t.number
  from tables t
 where t.id = o.table_id and o.table_number is null;

create or replace function set_order_table_number() returns trigger
language plpgsql as $$
begin
  -- Cuando se borra la mesa, table_id pasa a null: el número se conserva.
  if new.table_id is not null then
    new.table_number := (select number from tables where id = new.table_id);
  end if;
  return new;
end $$;

drop trigger if exists orders_table_number on orders;
create trigger orders_table_number
  before insert or update of table_id on orders
  for each row execute function set_order_table_number();

-- Al borrar una mesa, sus ventas viejas quedan (sin el vínculo a la mesa).
alter table orders drop constraint if exists orders_table_id_fkey;
alter table orders
  add constraint orders_table_id_fkey
  foreign key (table_id) references tables(id) on delete set null;

-- Borra una mesa. No deja si tiene un pedido abierto con productos; los
-- pedidos abiertos vacíos se descartan.
create or replace function delete_table(p_table_id bigint) returns void
language plpgsql as $$
declare
  v_number integer;
begin
  select number into v_number from tables where id = p_table_id;
  if not found then
    raise exception 'La mesa no existe';
  end if;

  if exists (select 1 from orders o
              where o.table_id = p_table_id
                and o.status not in ('pagado', 'cancelado')
                and exists (select 1 from order_items where order_id = o.id)) then
    raise exception 'La mesa % tiene un pedido abierto. Cobralo o cancelalo antes de borrarla', v_number;
  end if;

  delete from orders
   where table_id = p_table_id and status not in ('pagado', 'cancelado');
  delete from tables where id = p_table_id;
end $$;

revoke execute on function delete_table(bigint) from public, anon;
grant execute on function delete_table(bigint) to authenticated;
