-- Seed data for Cake Workshop
-- Run after migrations. Replace UUIDs if you need fixed IDs.

-- Products
insert into public.products (name, category) values
  ('Birthday Cake 8"', 'Cakes'),
  ('Wedding Tier 3', 'Cakes'),
  ('Cupcakes Dozen', 'Cupcakes'),
  ('Cookie Box', 'Cookies'),
  ('Croissant', 'Pastries'),
  ('Brownie Tray', 'Trays');

-- Employees
insert into public.employees (name, skills) values
  ('Maria', 'Decorating, Icing'),
  ('James', 'Baking, Icing'),
  ('Sofia', 'Decorating, Assembly'),
  ('Alex', 'Baking, Pastries'),
  ('Jordan', 'Decorating, Packaging');
