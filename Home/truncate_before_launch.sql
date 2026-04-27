-- Script de truncado pre-launch
-- Ejecutar manualmente en Supabase SQL Editor ANTES de abrir la app al publico.
-- Borra todos los datos de prueba y reinicia los sequences.
-- NO borra el esquema ni las migrations (SequelizeMeta queda intacto).

TRUNCATE
  vet_assistances,
  case_images,
  case_updates,
  contacts,
  reports,
  cases,
  refresh_tokens,
  users
RESTART IDENTITY CASCADE;
