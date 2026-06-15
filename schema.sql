CREATE DATABASE IF NOT EXISTS `ai_collective_spec_sheet`;
USE `ai_collective_spec_sheet`;

CREATE TABLE IF NOT EXISTS `spec_sheets` (
  `id` VARCHAR(50) NOT NULL,
  `date` DATE NOT NULL,
  `client` VARCHAR(255) NOT NULL,
  `brand` VARCHAR(255) NOT NULL,
  `project_title` VARCHAR(255) NOT NULL,
  
  -- SPOC details
  `spoc_cn` VARCHAR(255) DEFAULT NULL,
  `spoc_cp` VARCHAR(50) DEFAULT NULL,
  `spoc_ce` VARCHAR(255) DEFAULT NULL,
  `spoc_an` VARCHAR(255) DEFAULT NULL,
  `spoc_ap` VARCHAR(50) DEFAULT NULL,
  `spoc_ae` VARCHAR(255) DEFAULT NULL,
  `spoc_in` VARCHAR(255) DEFAULT NULL,
  `spoc_ip` VARCHAR(50) DEFAULT NULL,
  `spoc_ie` VARCHAR(255) DEFAULT NULL,
  
  -- Script details
  `master_script` TEXT DEFAULT NULL,
  `master_script_file` VARCHAR(255) DEFAULT NULL,
  
  -- Specs
  `num_films` VARCHAR(50) DEFAULT NULL,
  `resolution` VARCHAR(50) DEFAULT NULL,
  `primary_lang` VARCHAR(100) DEFAULT NULL,
  `contemporary` TINYINT(1) DEFAULT 0,
  `contemp_spec` VARCHAR(255) DEFAULT NULL,
  `film_duration` INT DEFAULT NULL,
  `num_down_edits` VARCHAR(50) DEFAULT NULL,
  `master_ar` VARCHAR(50) DEFAULT NULL,
  `logo_pos` VARCHAR(50) DEFAULT NULL,
  `brand_color` VARCHAR(50) DEFAULT NULL,
  
  -- Subtitles
  `subtitle` TINYINT(1) DEFAULT 0,
  `subtitle_size` INT DEFAULT NULL,
  `subtitle_font` VARCHAR(100) DEFAULT NULL,
  `subtitle_style` VARCHAR(50) DEFAULT NULL,
  
  -- Files
  `logo_file` VARCHAR(255) DEFAULT NULL,
  `pack_file` VARCHAR(255) DEFAULT NULL,
  `font_file` VARCHAR(255) DEFAULT NULL,
  
  -- Notes
  `additional_notes` TEXT DEFAULT NULL,
  
  -- JSON Arrays/Objects
  `pipeline` JSON DEFAULT NULL,
  `adapt_ar` JSON DEFAULT NULL,
  `down_edit_ar` JSON DEFAULT NULL,
  `pub_rights` JSON DEFAULT NULL,
  
  -- Status and Timestamps
  `status` VARCHAR(50) DEFAULT 'draft',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
