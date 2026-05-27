CREATE TABLE `pending_imports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`instrument` text NOT NULL,
	`direction` text NOT NULL,
	`entry_price` real NOT NULL,
	`exit_price` real NOT NULL,
	`entry_time` text NOT NULL,
	`exit_time` text NOT NULL,
	`quantity` integer NOT NULL,
	`pnl` real NOT NULL,
	`outcome` text NOT NULL,
	`session` text,
	`setup_type_id` integer,
	`notes` text,
	`screenshot_path` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`setup_type_id`) REFERENCES `setup_types`(`id`) ON UPDATE no action ON DELETE no action
);
