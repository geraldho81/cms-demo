CREATE TABLE "contact_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submit_label" text DEFAULT 'Send message' NOT NULL,
	"receiver_email" text DEFAULT '' NOT NULL,
	"form_name" text DEFAULT 'Contact' NOT NULL,
	"success_mode" text DEFAULT 'inline' NOT NULL,
	"success_message" text DEFAULT 'Thanks. We''ll be in touch shortly.' NOT NULL,
	"success_path" text DEFAULT '/thank-you' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
