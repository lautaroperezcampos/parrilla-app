-- ============================================================
-- CARTA "DON BLAS" — carga los productos de la carta.
-- Correr en Supabase: SQL Editor > New query > pegar > Run.
-- Si un producto ya existe (mismo nombre), no lo duplica.
-- Bebidas y vinos descuentan stock al vender; los platos no.
-- ============================================================

insert into categories (name, type)
select v.name, 'producto'
from (values ('Entradas'), ('Parrilla'), ('Cocina rápida'), ('Bebidas'), ('Vinos'), ('Postres')) as v(name)
where not exists (select 1 from categories c where c.name = v.name and c.type = 'producto');

insert into products (name, category_id, unit, sale_price, track_stock, is_sellable)
select p.name,
       (select id from categories c where c.name = p.cat and c.type = 'producto' order by id limit 1),
       'unidad', p.price, p.track, true
from (values
  -- Entrada
  ('Picada (salame, queso, aceitunas, papas fritas)', 'Entradas', 5500, false),

  -- Parrilla
  ('Asado vacuno c/guarnición',          'Parrilla', 21000, false),
  ('Chorizo',                            'Parrilla',  3500, false),
  ('Morcilla',                           'Parrilla',  2500, false),
  ('Matambre de cerdo c/guarnición',     'Parrilla', 22000, false),
  ('Matambre de cerdo a la pizza',       'Parrilla', 27000, false),
  ('Pata muslo deshuesada c/guarnición', 'Parrilla', 13000, false),

  -- Cocina rápida
  ('Milanesa de carne c/guarnición',      'Cocina rápida', 14500, false),
  ('Milanesa de pollo c/guarnición',      'Cocina rápida', 13500, false),
  ('Milanesa napolitana c/guarnición',    'Cocina rápida', 19000, false),
  ('Canelones c/estofado',                'Cocina rápida', 15000, false),
  ('Tallarines c/estofado',               'Cocina rápida', 15000, false),
  ('Ravioles c/estofado',                 'Cocina rápida', 15000, false),
  ('Sorrentinos',                         'Cocina rápida', 15000, false),
  ('Lasaña',                              'Cocina rápida', 16000, false),

  -- Bebidas
  ('Cerveza lata',                    'Bebidas',  3000, true),
  ('Cerveza Santa Fe 1 lt',           'Bebidas',  6000, true),
  ('Cerveza Budweiser 1 lt',          'Bebidas',  6000, true),
  ('Cerveza Heineken 1 lt',           'Bebidas', 10000, true),
  ('Cerveza Corona',                  'Bebidas', 10000, true),
  ('Cerveza Miller',                  'Bebidas',     1, true),  -- sin precio en la carta
  ('Cerveza Stella Artois',           'Bebidas',     1, true),  -- sin precio en la carta
  ('Fernet c/cola',                   'Bebidas',  7000, false),
  ('Gancia',                          'Bebidas',  4500, false),
  ('Gaseosa 500 cc',                  'Bebidas',  3000, true),
  ('Gaseosa 1.500 cc',                'Bebidas',  6000, true),
  ('Agua mineral 500 cc',             'Bebidas',  2500, true),
  ('Agua mineral 1.500 cc',           'Bebidas',  5000, true),
  ('Agua saborizada 500 cc',          'Bebidas',  2500, true),
  ('Agua saborizada 1.500 cc',        'Bebidas',  5000, true),

  -- Vinos
  ('Vino Nampe',                  'Vinos',  5500, true),
  ('Vino Chacabuco',              'Vinos',  7000, true),
  ('Vino Emilia',                 'Vinos', 11000, true),
  ('Vino Alma Mora',              'Vinos',  9000, true),
  ('Vino Fond de Cave',           'Vinos', 13000, true),
  ('Vino Trumpeter',              'Vinos', 14000, true),
  ('Vino Don Valentín Lacrado',   'Vinos',  7000, true),
  ('Vino Cosecha Tardía',         'Vinos',     1, true),  -- sin precio en la carta
  ('Vino Portillo',               'Vinos', 10000, true),
  ('Vino Catena',                 'Vinos', 22000, true),
  ('Vino Fabre',                  'Vinos', 12000, true),
  ('Champagne ($20.000)',         'Vinos', 20000, true),
  ('Champagne ($40.000)',         'Vinos', 40000, true),
  ('Sidra',                       'Vinos', 12000, true),

  -- Postres
  ('Escocés / Almendrado / Casata',  'Postres', 5000, false),
  ('Ensalada de frutas',             'Postres', 6000, false),
  ('Flan casero',                    'Postres', 5000, false),
  ('Budín casero',                   'Postres',    1, false),  -- sin precio en la carta
  ('Zapallo / Higos en almíbar',     'Postres', 7000, false),
  ('Vigilante',                      'Postres', 5000, false),
  ('Durazno c/dulce de leche',       'Postres', 4500, false),
  ('Adicional postre',               'Postres', 1000, false),
  ('Bocha de helado',                'Postres', 4000, false)
) as p(name, cat, price, track)
where not exists (select 1 from products x where lower(x.name) = lower(p.name) and x.active);
