CREATE TABLE `setup_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `setup_types_name_unique` ON `setup_types` (`name`);--> statement-breakpoint
CREATE TABLE `strategy_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`setup_type_id` integer NOT NULL,
	`entry_criteria` text DEFAULT '' NOT NULL,
	`htf_confirmation` text DEFAULT '' NOT NULL,
	`valid_vs_premature` text DEFAULT '' NOT NULL,
	`session_filter` text DEFAULT '' NOT NULL,
	`freeform_notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`setup_type_id`) REFERENCES `setup_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `strategy_rules_setup_type_id_unique` ON `strategy_rules` (`setup_type_id`);--> statement-breakpoint
CREATE TABLE `trades` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`instrument` text NOT NULL,
	`direction` text NOT NULL,
	`entry_price` real NOT NULL,
	`exit_price` real NOT NULL,
	`entry_time` text NOT NULL,
	`exit_time` text NOT NULL,
	`session` text NOT NULL,
	`setup_type_id` integer NOT NULL,
	`outcome` text NOT NULL,
	`pnl` real NOT NULL,
	`notes` text NOT NULL,
	`screenshot_path` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`setup_type_id`) REFERENCES `setup_types`(`id`) ON UPDATE no action ON DELETE no action
);
