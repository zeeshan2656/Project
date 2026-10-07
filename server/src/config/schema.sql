-- Third-Party Fabrication Inspection & Audit Platform
-- Normalized MySQL Schema for MariaDB/MySQL 8+

CREATE DATABASE IF NOT EXISTS `fabrication_audit` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `fabrication_audit`;

-- 1. Site Branding & CMS Settings (Fully Admin-Editable)
CREATE TABLE IF NOT EXISTS `site_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_name` VARCHAR(255) NOT NULL DEFAULT 'ApexFabric Quality Audits',
  `tagline` VARCHAR(255) NOT NULL DEFAULT 'Premier Third-Party Fabrication, Apparel & Mill Inspection Services in Pakistan',
  `logo_url` VARCHAR(500) NULL,
  `contact_email` VARCHAR(255) NOT NULL DEFAULT 'operations@apexfabric-audit.com',
  `contact_phone` VARCHAR(100) NOT NULL DEFAULT '+92 300 8472910',
  `whatsapp_number` VARCHAR(100) NOT NULL DEFAULT '+92 300 8472910',
  `whatsapp_message` TEXT NULL,
  `hero_badge` VARCHAR(150) DEFAULT 'ISO 9001:2015 Accredited Quality Audits',
  `hero_title` VARCHAR(255) DEFAULT 'Precision Fabrication Inspection & Mill Quality Auditing Across Pakistan',
  `hero_subtitle` TEXT DEFAULT 'Empowering USA & international apparel buyers with uncompromised on-site quality assurance, real-time defect telemetry, and rigorous third-party fabrication verifications.',
  `about_title` VARCHAR(255) DEFAULT 'Independent Quality Assurance You Can Trust',
  `about_content` TEXT DEFAULT 'We serve as your dedicated boots-on-the-ground in Pakistan textile and industrial manufacturing hubs. From yarn mills in Faisalabad to denim processing in Karachi and knitwear finishing in Lahore, our certified inspectors execute thorough audits with zero conflict of interest.',
  `about_bullets` JSON NULL,
  `services_content` JSON NULL,
  `process_content` JSON NULL,
  `trust_stats` JSON NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Dynamic Landing Page Slider Slides
CREATE TABLE IF NOT EXISTS `slider_slides` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(255) NOT NULL,
  `badge` VARCHAR(100) DEFAULT 'Fabrication Audit',
  `image_url` VARCHAR(500) NOT NULL,
  `button_text` VARCHAR(100) DEFAULT 'Schedule Audit',
  `button_link` VARCHAR(255) DEFAULT '/register',
  `sort_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Users Table (Role-based: admin, customer, employee)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role` ENUM('admin', 'customer', 'employee') NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `employee_code` VARCHAR(50) UNIQUE NULL,
  `phone` VARCHAR(100) NULL,
  `company_name` VARCHAR(255) NULL,
  `city` VARCHAR(100) NULL,
  `country` VARCHAR(100) DEFAULT 'USA',
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_emp_code` (`employee_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(50) NOT NULL UNIQUE,
  `customer_id` INT NOT NULL,
  `po_number` VARCHAR(100) NOT NULL,
  `product_type` VARCHAR(150) NOT NULL,
  `product_description` TEXT NULL,
  `factory_name` VARCHAR(255) NOT NULL,
  `factory_city` VARCHAR(100) NOT NULL,
  `factory_address` TEXT NOT NULL,
  `factory_contact_name` VARCHAR(150) NULL,
  `factory_contact_phone` VARCHAR(100) NULL,
  `factory_map_url` VARCHAR(500) NULL,
  `total_quantity` INT NOT NULL,
  `unit` VARCHAR(50) DEFAULT 'pieces',
  `order_date` DATE NOT NULL,
  `inspection_status` ENUM('Unassigned', 'Assigned', 'In Progress', 'Draft Saved', 'Submitted', 'Approved', 'Needs Re-inspection') DEFAULT 'Unassigned',
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_orders_customer` (`customer_id`),
  INDEX `idx_orders_status` (`inspection_status`),
  INDEX `idx_orders_city` (`factory_city`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Inspection Templates
CREATE TABLE IF NOT EXISTS `inspection_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `product_type` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `version` INT DEFAULT 1,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_templates_product` (`product_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Template Fields (Dynamic Form Builder)
CREATE TABLE IF NOT EXISTS `template_fields` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_id` INT NOT NULL,
  `field_name` VARCHAR(255) NOT NULL,
  `field_label` VARCHAR(255) NOT NULL,
  `field_type` ENUM('numeric_defect', 'measurement_text', 'dropdown_defect', 'image_upload', 'textarea') NOT NULL,
  `unit` VARCHAR(50) NULL,
  `is_required` TINYINT(1) DEFAULT 0,
  `options` JSON NULL,
  `sort_order` INT DEFAULT 0,
  `help_text` VARCHAR(255) NULL,
  FOREIGN KEY (`template_id`) REFERENCES `inspection_templates`(`id`) ON DELETE CASCADE,
  INDEX `idx_fields_template` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Inspection Sheets
CREATE TABLE IF NOT EXISTS `inspection_sheets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sheet_number` VARCHAR(50) NOT NULL UNIQUE,
  `order_id` INT NOT NULL,
  `template_id` INT NOT NULL,
  `assigned_employee_id` INT NOT NULL,
  `status` ENUM('Not Started', 'In Progress', 'Draft Saved', 'Submitted', 'Approved', 'Needs Re-inspection') DEFAULT 'Not Started',
  `ordered_quantity` INT NOT NULL,
  `inspected_quantity` INT NULL,
  `total_defect_count` INT DEFAULT 0,
  `overall_defect_percentage` DECIMAL(6,2) DEFAULT 0.00,
  `pass_fail_result` ENUM('Pending', 'Pass', 'Fail', 'Conditional') DEFAULT 'Pending',
  `employee_notes` TEXT NULL,
  `admin_remarks` TEXT NULL,
  `started_at` DATETIME NULL,
  `submitted_at` DATETIME NULL,
  `reviewed_at` DATETIME NULL,
  `reviewed_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`template_id`) REFERENCES `inspection_templates`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`assigned_employee_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_sheets_order` (`order_id`),
  INDEX `idx_sheets_employee` (`assigned_employee_id`),
  INDEX `idx_sheets_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Inspection Field Values
CREATE TABLE IF NOT EXISTS `inspection_field_values` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sheet_id` INT NOT NULL,
  `field_id` INT NOT NULL,
  `value_text` TEXT NULL,
  `value_number` DECIMAL(12,2) NULL,
  `calculated_percentage` DECIMAL(6,2) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`sheet_id`) REFERENCES `inspection_sheets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`field_id`) REFERENCES `template_fields`(`id`) ON DELETE CASCADE,
  INDEX `idx_field_values_sheet` (`sheet_id`),
  INDEX `idx_field_values_field` (`field_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Inspection Photos
CREATE TABLE IF NOT EXISTS `inspection_photos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sheet_id` INT NOT NULL,
  `field_id` INT NULL,
  `photo_url` VARCHAR(500) NOT NULL,
  `caption` VARCHAR(255) NULL,
  `defect_tag` VARCHAR(100) NULL,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sheet_id`) REFERENCES `inspection_sheets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`field_id`) REFERENCES `template_fields`(`id`) ON DELETE SET NULL,
  INDEX `idx_photos_sheet` (`sheet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Inspection Audit Logs (Full Audit Trail)
CREATE TABLE IF NOT EXISTS `inspection_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sheet_id` INT NOT NULL,
  `actor_id` INT NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `previous_status` VARCHAR(50) NULL,
  `new_status` VARCHAR(50) NOT NULL,
  `remarks` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sheet_id`) REFERENCES `inspection_sheets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_audit_sheet` (`sheet_id`),
  INDEX `idx_audit_actor` (`actor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
