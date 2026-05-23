-- 1. Remove seats órfãos (sem ônibus) que não estão ocupados nem reservados
DELETE FROM seats
WHERE onibus_id IS NULL
  AND occupied = false
  AND reserved_by IS NULL
  AND passageiro_id IS NULL;

-- 2. Substitui a constraint de unicidade
ALTER TABLE seats DROP CONSTRAINT IF EXISTS seats_excursao_id_seat_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS seats_onibus_id_seat_number_key
  ON seats (onibus_id, seat_number)
  WHERE onibus_id IS NOT NULL;

-- 3. Backfill: cria as poltronas que faltam em cada ônibus
INSERT INTO seats (excursao_id, onibus_id, seat_number)
SELECT o.excursao_id, o.id, gs::text
FROM onibus o
CROSS JOIN LATERAL generate_series(1, o.capacidade) gs
WHERE NOT EXISTS (
  SELECT 1 FROM seats s
  WHERE s.onibus_id = o.id AND s.seat_number = gs::text
);