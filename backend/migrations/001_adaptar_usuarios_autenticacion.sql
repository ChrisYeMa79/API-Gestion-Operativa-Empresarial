-- Migración preparada para MySQL 8.4.8. NO ejecutada.
-- Requisitos: seleccionar la base correcta, disponer de respaldo y detener
-- las escrituras sobre usuarios durante toda la migración.
-- Esquema de partida inspeccionado:
--   rol ENUM('ADMIN','RESPONSABLE') CHARACTER SET utf8mb4
--       COLLATE utf8mb4_unicode_ci NOT NULL, sin DEFAULT explícito.
--   updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
--       ON UPDATE CURRENT_TIMESTAMP.
--   token_version todavía no existe.
-- Ejecutar una sola vez, en orden y deteniéndose ante cualquier error.
-- Los ALTER TABLE hacen commit implícito: esta migración NO es atómica.
-- Si falla parcialmente, inspeccionar el estado antes de reanudarla.
-- No recrea usuarios ni altera IDs, contraseñas, FK o tablas operativas.

-- 1. Admitir ambos nombres antes de convertir los registros existentes.
ALTER TABLE `usuarios`
    MODIFY COLUMN `rol` ENUM('ADMIN','RESPONSABLE','SUPERVISOR')
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- 2. Convertir únicamente RESPONSABLE, conservando la fecha histórica.
-- La asignación explícita evita que ON UPDATE cambie updated_at.
UPDATE `usuarios`
SET `rol` = 'SUPERVISOR',
    `updated_at` = `updated_at`
WHERE `rol` = 'RESPONSABLE';

-- 3. Retirar el nombre antiguo después de convertir todas sus filas.
ALTER TABLE `usuarios`
    MODIFY COLUMN `rol` ENUM('ADMIN','SUPERVISOR')
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- 4. Inicializar la versión de token en 0 para usuarios actuales y futuros.
ALTER TABLE `usuarios`
    ADD COLUMN `token_version` INT UNSIGNED NOT NULL DEFAULT 0;
