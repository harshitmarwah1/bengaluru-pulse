-- Bengaluru Pulse - reference-data seed (Wave 0 foundation).
-- Agencies + the pilot ORR East corridor. The full risk event, recommendations,
-- timeline and outcome are produced at runtime by the Predictor from feed data
-- (a one-off seed script that ports shared/scenario.ts is a Wave 1 task).

insert into agencies (code, name) values
  ('DULT',  'Directorate of Urban Land Transport'),
  ('BTP',   'Bengaluru Traffic Police'),
  ('GBA',   'Greater Bengaluru Authority'),
  ('BMTC',  'Bengaluru Metropolitan Transport Corporation'),
  ('BMRCL', 'Bangalore Metro Rail Corporation Ltd')
on conflict (code) do nothing;

insert into corridors (id, name, nodes) values
  ('orr-east',
   'ORR East - Silk Board to Marathahalli',
   '[{"name":"Silk Board","x":0.12,"y":0.82},
     {"name":"Bellandur","x":0.48,"y":0.55},
     {"name":"Marathahalli","x":0.86,"y":0.24}]')
on conflict (id) do nothing;
