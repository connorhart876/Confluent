CREATE TABLE `knowledge_base_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`category` text,
	`setup_type_id` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`setup_type_id`) REFERENCES `setup_types`(`id`) ON UPDATE no action ON DELETE no action
);
