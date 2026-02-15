-- Database Schema for VR Experience System (Scalable JSON Version)
-- Generated for MySQL 5.7+

-- Ensure database exists
CREATE DATABASE IF NOT EXISTS `synapse_vr`;
USE `synapse_vr`;

SET FOREIGN_KEY_CHECKS = 0;


-- Drop previous tables if they exist to ensure clean state
DROP TABLE IF EXISTS `calibration_profiles`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `settings`; -- Dropping old table if present
DROP TABLE IF EXISTS `assets`;
DROP TABLE IF EXISTS `folders`;
DROP TABLE IF EXISTS `modules`;

-- -----------------------------------------------------
-- Table: modules
-- -----------------------------------------------------
CREATE TABLE `modules` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `category_type` VARCHAR(50) NOT NULL, -- e.g., 'relaxation', 'horror', 'cognitive'
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `global_settings` JSON NULL, -- Flexible module-wide config (e.g., {"speed": 1.5, "float_direction": "up"})
  PRIMARY KEY (`id`),
  INDEX `idx_modules_name` (`name`) -- Optimize lookups by name
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: folders
-- -----------------------------------------------------
CREATE TABLE `folders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `module_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `intensity_level` INT NOT NULL DEFAULT 0,
  `folder_settings` JSON NULL, -- Flexible folder config (e.g., {"play_mode": "random", "transition_speed": 2.0})
  PRIMARY KEY (`id`),
  INDEX `fk_folders_modules_idx` (`module_id` ASC),
  INDEX `idx_folders_name` (`name`), -- Optimize lookups by name
  CONSTRAINT `fk_folders_modules`
    FOREIGN KEY (`module_id`)
    REFERENCES `modules` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: assets
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Table: assets
-- -----------------------------------------------------
CREATE TABLE `assets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `folder_id` INT NULL, -- Now Nullable for unlinked assets
  `name` VARCHAR(255) NULL, -- Added Name column
  `type` ENUM('image', 'audio', 'video', 'gif', 'special') NOT NULL,
  `mimetype` VARCHAR(100) NULL, -- real mime-type (e.g., 'image/png')
  `module` ENUM('Bubbles', 'Paisajes', 'Terror', 'Adrenalina', 'Sleep') NOT NULL DEFAULT 'Bubbles', -- Direct Module Link
  `url` VARCHAR(255) NOT NULL,
  `intensity_level` INT NOT NULL DEFAULT 1, -- 1-10 Scale
  `phase_name` VARCHAR(50) NULL, -- e.g., 'warmup', 'plateau', 'peak'
  `asset_settings` JSON NULL, -- Flexible asset config
  PRIMARY KEY (`id`),
  INDEX `fk_assets_folders_idx` (`folder_id` ASC),
  INDEX `idx_assets_intensity_type` (`intensity_level`, `type`), -- Optimize intensity queries
  INDEX `idx_assets_module` (`module`), -- Optimize module filtering
  CONSTRAINT `fk_assets_folders`
    FOREIGN KEY (`folder_id`)
    REFERENCES `folders` (`id`)
    ON DELETE SET NULL -- If folder deleted, assets become unlinked
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: users
-- -----------------------------------------------------
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `username_UNIQUE` (`username` ASC)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: calibration_profiles
-- -----------------------------------------------------
CREATE TABLE `calibration_profiles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `profile_name` VARCHAR(100) NOT NULL,
  `calibration_data` JSON NOT NULL, -- Stores IPD, scale, vOffset, etc.
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_profiles_users_idx` (`user_id` ASC),
  CONSTRAINT `fk_profiles_users`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: session_logs
-- -----------------------------------------------------
CREATE TABLE `session_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `session_id` VARCHAR(100) NOT NULL, -- Socket ID or Session UUID
  `user_id` INT NULL,
  `action` VARCHAR(50) NOT NULL, -- 'start', 'asset_change', 'intensity_change', 'end'
  `details` JSON NULL, -- Stores asset_id, new_intensity, etc.
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_session_logs_session` (`session_id`),
  INDEX `idx_session_logs_timestamp` (`timestamp`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: overlays
-- -----------------------------------------------------
CREATE TABLE `overlays` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `url` VARCHAR(255) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `linked_folder_ids` JSON NULL, -- Array of folder IDs this overlay applies to. NULL = Global.
  `settings` JSON NULL, -- e.g., opacity, blend mode
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: playlists
-- -----------------------------------------------------
CREATE TABLE `playlists` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `folder_id` INT NOT NULL,
  `name` VARCHAR(255) NULL, -- Optional name
  `asset_order` JSON NOT NULL, -- Array of Asset IDs
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  INDEX `fk_playlists_folders_idx` (`folder_id` ASC),
  CONSTRAINT `fk_playlists_folders`
    FOREIGN KEY (`folder_id`)
    REFERENCES `folders` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: system_settings
-- -----------------------------------------------------
CREATE TABLE `system_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'default_effects'
  `setting_value` JSON NOT NULL, -- Stores the actual value or object
  `description` VARCHAR(255) NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------
-- Seed Data
-- -----------------------------------------------------

-- 0. Insert Default User
INSERT INTO `users` (`username`) VALUES ('Guest');

-- 1. Insert 'Bubbles' Module (Relaxation) - Active
INSERT INTO `modules` (`name`, `category_type`, `is_active`, `global_settings`) 
VALUES (
    'Bubbles', 
    'relaxation', 
    1, 
    '{"speed": 1.5, "float_direction": "up", "background_color": "#001133"}'
);

-- 2. Insert 'Paisajes' Module (Landscapes) - Inactive
INSERT INTO `modules` (`name`, `category_type`, `is_active`, `global_settings`) 
VALUES (
    'Paisajes', 
    'landscapes', 
    0, 
    '{"day_cycle": true, "weather": "sunny", "ambient_volume": 0.5}'
);

-- 3. Insert 'Terror' Module (Horror) - Inactive
INSERT INTO `modules` (`name`, `category_type`, `is_active`, `global_settings`) 
VALUES (
    'Terror', 
    'horror', 
    0, 
    '{"darkness_level": 0.9, "jump_scare_enabled": true, "pulse_sync": false}'
);

-- 4. Insert 'Adrenalina' Module (Adrenaline) - Inactive
INSERT INTO `modules` (`name`, `category_type`, `is_active`, `global_settings`) 
VALUES (
    'Adrenalina', 
    'adrenaline', 
    0, 
    '{"motion_blur": true, "speed_multiplier": 2.0, "intensity": "high"}'
);


-- 5. Create Folders for Phases (Low, Medium, High)
INSERT INTO `folders` (`module_id`, `name`, `intensity_level`, `folder_settings`) 
SELECT `id`, 'Warmup (Low)', 2, '{"play_mode": "sequential", "transition_speed": 3.0}' 
FROM `modules` WHERE `name` = 'Bubbles' LIMIT 1;

INSERT INTO `folders` (`module_id`, `name`, `intensity_level`, `folder_settings`) 
SELECT `id`, 'Plateau (Medium)', 5, '{"play_mode": "random", "transition_speed": 2.0}' 
FROM `modules` WHERE `name` = 'Bubbles' LIMIT 1;

INSERT INTO `folders` (`module_id`, `name`, `intensity_level`, `folder_settings`) 
SELECT `id`, 'Peak (High)', 9, '{"play_mode": "random", "transition_speed": 1.0}' 
FROM `modules` WHERE `name` = 'Bubbles' LIMIT 1;


-- 6. Insert Assets Distributed by Phase/Intensity

-- --- Warmup (Level 1-3) ---
INSERT INTO `assets` (`folder_id`, `name`, `type`, `url`, `intensity_level`, `phase_name`, `asset_settings`)
SELECT f.id, 'Soft Bubbles', 'image', 'https://example.com/assets/bubble_soft.png', 1, 'warmup', '{"opacity": 0.8, "scale": 1.0}'
FROM `folders` f JOIN `modules` m ON f.module_id = m.id WHERE f.name = 'Warmup (Low)' AND m.name = 'Bubbles';

INSERT INTO `assets` (`folder_id`, `name`, `type`, `url`, `intensity_level`, `phase_name`, `asset_settings`)
SELECT f.id, 'Slow Waves', 'audio', 'https://example.com/assets/waves_slow.mp3', 2, 'warmup', '{"volume": 0.4, "loop": true}'
FROM `folders` f JOIN `modules` m ON f.module_id = m.id WHERE f.name = 'Warmup (Low)' AND m.name = 'Bubbles';

-- --- Plateau (Level 4-7) ---
INSERT INTO `assets` (`folder_id`, `name`, `type`, `url`, `intensity_level`, `phase_name`, `asset_settings`)
SELECT f.id, 'Active Bubbles', 'image', 'https://example.com/assets/bubble_active.png', 5, 'plateau', '{"opacity": 1.0, "scale": 1.2}'
FROM `folders` f JOIN `modules` m ON f.module_id = m.id WHERE f.name = 'Plateau (Medium)' AND m.name = 'Bubbles';

INSERT INTO `assets` (`folder_id`, `name`, `type`, `url`, `intensity_level`, `phase_name`, `asset_settings`)
SELECT f.id, 'Rhythmic Beat', 'audio', 'https://example.com/assets/beat_medium.mp3', 6, 'plateau', '{"volume": 0.6, "bpm": 80}'
FROM `folders` f JOIN `modules` m ON f.module_id = m.id WHERE f.name = 'Plateau (Medium)' AND m.name = 'Bubbles';

INSERT INTO `assets` (`folder_id`, `name`, `type`, `url`, `intensity_level`, `phase_name`, `asset_settings`)
SELECT f.id, 'Floating Animation', 'gif', 'https://example.com/assets/floating.gif', 5, 'plateau', '{"speed": 1.0}'
FROM `folders` f JOIN `modules` m ON f.module_id = m.id WHERE f.name = 'Plateau (Medium)' AND m.name = 'Bubbles';


-- --- Peak (Level 8-10) ---
INSERT INTO `assets` (`folder_id`, `name`, `type`, `url`, `intensity_level`, `phase_name`, `asset_settings`)
SELECT f.id, 'Stormy Bubbles', 'image', 'https://example.com/assets/bubble_storm.png', 9, 'peak', '{"opacity": 1.0, "scale": 1.5}'
FROM `folders` f JOIN `modules` m ON f.module_id = m.id WHERE f.name = 'Peak (High)' AND m.name = 'Bubbles';

INSERT INTO `assets` (`folder_id`, `name`, `type`, `url`, `intensity_level`, `phase_name`, `asset_settings`)
SELECT f.id, 'Intense Pulse', 'special', 'https://example.com/assets/haptic_pulse.json', 10, 'peak', '{"intensity": 1.0, "duration": 500}'
FROM `folders` f JOIN `modules` m ON f.module_id = m.id WHERE f.name = 'Peak (High)' AND m.name = 'Bubbles';


-- 7. Insert Overlays
-- 'Hypnotic Spiral' linked to Peak (High) - Assuming ID derived from previous inserts, but for seed we used subqueries or assumptions. 
-- Valid JSON for linked_folders: we need to know the ID.
-- Since this is a script, we will insert them as Global (NULL) first, or use a complex INSERT-SELECT if strictness required.
-- For simplicity in this generated script, we will keep them Global or update the linked_folder_ids logic if we had simpler IDs.
-- Let's stick to NULL (Global) for Sacred Geometry, and try to target Peak for Spiral if possible.
-- Given the complexity of getting the exact ID in a pure SQL script without variables on all environments,
-- We will insert them as NULL (Global) for now, or use a placeholder.
INSERT INTO `overlays` (`name`, `url`, `is_active`, `linked_folder_ids`, `settings`) VALUES
('Hypnotic Spiral', 'https://example.com/assets/spiral_01.png', 1, NULL, '{"opacity": 0.5, "blend_mode": "multiply"}'),
('Sacred Geometry', 'https://example.com/assets/geometry_01.png', 1, NULL, '{"opacity": 0.3, "blend_mode": "screen"}');

-- 8. Insert Playlists (Example logic)
-- We need asset IDs. In a real scenario, we'd query them.
-- Here we'll just insert a dummy playlist for 'Warmup' assuming we have assets there.
-- INSERT INTO `playlists` ... 
-- Skipped to avoid ID mismatch errors in direct execution without variables. System handles dynamic creation.

-- 9. Insert System Settings
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('default_effects', '{"breathing_rate": 4000, "flash_colors": ["#FFFFFF", "#FF0000", "#0000FF"], "spiral_rotation_speed": 0.5}', 'Default VR effects configuration');

-- -----------------------------------------------------
-- Triggers for Default JSON Values (MySQL 5.7 Compatibility)
-- Since MySQL 5.7 does not support DEFAULT values for JSON columns
-- -----------------------------------------------------

DELIMITER //

CREATE TRIGGER `modules_before_insert` BEFORE INSERT ON `modules`
FOR EACH ROW
BEGIN
  IF NEW.global_settings IS NULL THEN
    SET NEW.global_settings = '{}';
  END IF;
END;
//

CREATE TRIGGER `folders_before_insert` BEFORE INSERT ON `folders`
FOR EACH ROW
BEGIN
  IF NEW.folder_settings IS NULL THEN
    SET NEW.folder_settings = '{}';
  END IF;
END;
//

CREATE TRIGGER `assets_before_insert` BEFORE INSERT ON `assets`
FOR EACH ROW
BEGIN
  IF NEW.asset_settings IS NULL THEN
    SET NEW.asset_settings = '{}';
  END IF;
END;
//

DELIMITER ;

-- -----------------------------------------------------
-- Debug Query: Count assets per phase
-- -----------------------------------------------------
/*
SELECT 
    m.name AS Module,
    f.name AS Phase,
    a.phase_name,
    COUNT(a.id) AS AssetCount,
    MIN(a.intensity_level) AS MinIntensity,
    MAX(a.intensity_level) AS MaxIntensity
FROM modules m
JOIN folders f ON m.id = f.module_id
JOIN assets a ON f.id = a.folder_id
GROUP BY m.name, f.name, a.phase_name;
*/

