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
  PRIMARY KEY (`id`)
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
  CONSTRAINT `fk_folders_modules`
    FOREIGN KEY (`module_id`)
    REFERENCES `modules` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Table: assets
-- -----------------------------------------------------
CREATE TABLE `assets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `folder_id` INT NULL, -- Now Nullable for unlinked assets
  `name` VARCHAR(255) NULL, -- Added Name column
  `type` ENUM('image', 'audio', 'video', 'gif', 'special') NOT NULL,
  `url` VARCHAR(255) NOT NULL,
  `asset_settings` JSON NULL, -- Flexible asset config (e.g., {"volume": 0.8, "heartbeat_rate": 60})
  PRIMARY KEY (`id`),
  INDEX `fk_assets_folders_idx` (`folder_id` ASC),
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


-- Get the ID of the inserted module (assuming it's ID 1 for this script, or using a variable in a stored procedure context, 
-- but for standard SQL scripts we often assume sequential execution or subqueries)

-- 2. Insert 'Carpeta 1' Folder for Bubbles
INSERT INTO `folders` (`module_id`, `name`, `intensity_level`, `folder_settings`) 
SELECT `id`, 'Carpeta 1', 1, '{"play_mode": "random", "transition_speed": 2.0}' 
FROM `modules` WHERE `name` = 'Bubbles' LIMIT 1;

-- 3. Insert Assets for 'Carpeta 1'
-- We'll use a variable or subquery to get the folder ID. Here using subquery for portability in simple scripts.

-- Asset 1: Image
INSERT INTO `assets` (`folder_id`, `type`, `url`, `asset_settings`)
SELECT `id`, 'image', 'https://example.com/assets/bubble_01.png', '{"opacity": 0.9, "scale": 1.2}'
FROM `folders` WHERE `name` = 'Carpeta 1' AND `module_id` = (SELECT `id` FROM `modules` WHERE `name` = 'Bubbles');

-- Asset 2: Audio
INSERT INTO `assets` (`folder_id`, `type`, `url`, `asset_settings`)
SELECT `id`, 'audio', 'https://example.com/assets/ocean_waves.mp3', '{"volume": 0.5, "loop": true}'
FROM `folders` WHERE `name` = 'Carpeta 1' AND `module_id` = (SELECT `id` FROM `modules` WHERE `name` = 'Bubbles');

-- Asset 3: Special (e.g., Haptic feedback or integrated effect)
INSERT INTO `assets` (`folder_id`, `type`, `url`, `asset_settings`)
SELECT `id`, 'special', 'https://example.com/assets/heartbeat_pattern.json', '{"effect": "heartbeat", "intensity": 0.7}'
FROM `folders` WHERE `name` = 'Carpeta 1' AND `module_id` = (SELECT `id` FROM `modules` WHERE `name` = 'Bubbles');

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
-- Debug Query: Count assets per active module
-- -----------------------------------------------------
/*
SELECT 
    m.name AS ModuleName, 
    COUNT(a.id) AS TotalAssets,
    m.is_active
FROM modules m
LEFT JOIN folders f ON m.id = f.module_id
LEFT JOIN assets a ON f.id = a.folder_id
GROUP BY m.id;
*/

