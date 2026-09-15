CREATE TYPE "public"."challenge_difficulty" AS ENUM('easy', 'medium', 'hard', 'expert');--> statement-breakpoint
CREATE TYPE "public"."challenge_state" AS ENUM('hidden', 'visible', 'locked');--> statement-breakpoint
CREATE TYPE "public"."decay_type" AS ENUM('logarithmic', 'linear', 'static');--> statement-breakpoint
CREATE TYPE "public"."submission_verdict" AS ENUM('correct', 'incorrect', 'duplicate', 'rate_limited');--> statement-breakpoint
CREATE TYPE "public"."sz_fragment_key" AS ENUM('who', 'how', 'why');--> statement-breakpoint
CREATE TYPE "public"."sz_path_entry_reason" AS ENUM('initial', 'free_switch', 'penalized_switch');--> statement-breakpoint
CREATE TYPE "public"."sz_tier" AS ENUM('past', 'present', 'future');--> statement-breakpoint
CREATE TYPE "public"."sz_unlock_source" AS ENUM('initial', 'solve', 'skip', 'prereq', 'admin');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('captain', 'member');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"display_name" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"banned_at" timestamp with time zone,
	"banned_reason" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_frozen" boolean DEFAULT false NOT NULL,
	"frozen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "core_event_slug_unique" UNIQUE("slug"),
	CONSTRAINT "core_event_time_order_check" CHECK ("core_event"."ends_at" IS NULL OR "core_event"."starts_at" IS NULL OR "core_event"."ends_at" > "core_event"."starts_at"),
	CONSTRAINT "core_event_published_has_window_check" CHECK (NOT "core_event"."is_published" OR ("core_event"."starts_at" IS NOT NULL AND "core_event"."ends_at" IS NOT NULL)),
	CONSTRAINT "core_event_frozen_at_check" CHECK (NOT "core_event"."is_frozen" OR "core_event"."frozen_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_event_user" (
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "core_event_user_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_solo" boolean DEFAULT false NOT NULL,
	"join_code" text,
	"created_by_user" uuid,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"disqualified_at" timestamp with time zone,
	"disqualified_by" uuid,
	"disqualified_reason" text,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "core_team_join_code_unique" UNIQUE("join_code"),
	CONSTRAINT "core_team_event_id_name_unique" UNIQUE("event_id","name"),
	CONSTRAINT "core_team_id_event_id_unique" UNIQUE("id","event_id"),
	CONSTRAINT "core_team_disqualified_reason_check" CHECK ("core_team"."disqualified_at" IS NULL OR "core_team"."disqualified_reason" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_team_member" (
	"team_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "team_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "core_team_member_team_id_user_id_pk" PRIMARY KEY("team_id","user_id"),
	CONSTRAINT "core_team_member_event_user_uq" UNIQUE("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_category" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "core_category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_challenge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category_id" smallint NOT NULL,
	"difficulty" "challenge_difficulty" NOT NULL,
	"initial_points" integer NOT NULL,
	"min_points" integer NOT NULL,
	"decay_threshold" integer DEFAULT 25 NOT NULL,
	"decay_type" "decay_type" DEFAULT 'logarithmic' NOT NULL,
	"flag_hash" text NOT NULL,
	"state" "challenge_state" DEFAULT 'hidden' NOT NULL,
	"max_attempts" integer,
	"author" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "core_challenge_id_event_id_unique" UNIQUE("id","event_id"),
	CONSTRAINT "core_challenge_flag_check" CHECK ("core_challenge"."flag_hash" <> ''),
	CONSTRAINT "core_challenge_points_check" CHECK ("core_challenge"."initial_points" > 0),
	CONSTRAINT "core_challenge_min_points_check" CHECK ("core_challenge"."min_points" > 0),
	CONSTRAINT "core_challenge_min_le_initial_check" CHECK ("core_challenge"."min_points" <= "core_challenge"."initial_points"),
	CONSTRAINT "core_challenge_decay_threshold_check" CHECK ("core_challenge"."decay_threshold" > 0),
	CONSTRAINT "core_challenge_max_attempts_check" CHECK ("core_challenge"."max_attempts" IS NULL OR "core_challenge"."max_attempts" > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_hint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"body" text NOT NULL,
	"cost" integer DEFAULT 0 NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"requires_hint_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "core_hint_id_event_id_unique" UNIQUE("id","event_id"),
	CONSTRAINT "core_hint_challenge_id_sort_order_unique" UNIQUE("challenge_id","sort_order"),
	CONSTRAINT "core_hint_cost_check" CHECK ("core_hint"."cost" >= 0),
	CONSTRAINT "core_hint_sort_order_check" CHECK ("core_hint"."sort_order" >= 0),
	CONSTRAINT "core_hint_not_self_check" CHECK ("core_hint"."requires_hint_id" IS NULL OR "core_hint"."requires_hint_id" <> "core_hint"."id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_hint_unlock" (
	"team_id" uuid NOT NULL,
	"hint_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"cost_paid" integer NOT NULL,
	"unlocked_by" uuid,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "core_hint_unlock_team_id_hint_id_pk" PRIMARY KEY("team_id","hint_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_submission" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"submitted_by" uuid,
	"challenge_id" uuid NOT NULL,
	"raw_input" text NOT NULL,
	"verdict" "submission_verdict" NOT NULL,
	"ip_address" "inet",
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "core_submission_id_event_id_unique" UNIQUE("id","event_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_solve" (
	"team_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"solved_by" uuid,
	"submission_id" bigint,
	"base_points" integer NOT NULL,
	"multiplier" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"points_awarded" integer NOT NULL,
	"solve_order" integer,
	"solved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revoked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "core_solve_team_id_challenge_id_pk" PRIMARY KEY("team_id","challenge_id"),
	CONSTRAINT "core_solve_submission_id_unique" UNIQUE("submission_id"),
	CONSTRAINT "core_solve_challenge_order_uq" UNIQUE("challenge_id","solve_order"),
	CONSTRAINT "core_solve_base_points_check" CHECK ("core_solve"."base_points" > 0),
	CONSTRAINT "core_solve_multiplier_check" CHECK ("core_solve"."multiplier" >= 0),
	CONSTRAINT "core_solve_points_awarded_check" CHECK ("core_solve"."points_awarded" >= 0),
	CONSTRAINT "core_solve_order_check" CHECK ("core_solve"."solve_order" IS NULL OR "core_solve"."solve_order" > 0),
	CONSTRAINT "core_solve_revoked_reason_check" CHECK ("core_solve"."revoked_at" IS NULL OR "core_solve"."revoked_reason" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sz_path" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"code" char(1) NOT NULL,
	"name" text NOT NULL,
	"delivers" "sz_fragment_key",
	"intro_narration" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "sz_path_event_id_code_unique" UNIQUE("event_id","code"),
	CONSTRAINT "sz_path_id_event_id_unique" UNIQUE("id","event_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sz_path_challenge" (
	"challenge_id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"path_id" uuid NOT NULL,
	"sequence" smallint NOT NULL,
	"tier" "sz_tier" NOT NULL,
	"pre_story" text NOT NULL,
	"post_story" text NOT NULL,
	"gm_note" text,
	"is_path_final" boolean DEFAULT false NOT NULL,
	"fragment_key" "sz_fragment_key",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "sz_path_challenge_path_id_sequence_unique" UNIQUE("path_id","sequence"),
	CONSTRAINT "sz_path_challenge_sequence_check" CHECK ("sz_path_challenge"."sequence" > 0),
	CONSTRAINT "sz_path_challenge_fragment_final_check" CHECK ("sz_path_challenge"."fragment_key" IS NULL OR "sz_path_challenge"."is_path_final")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sz_challenge_prereq" (
	"event_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"requires_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "sz_challenge_prereq_challenge_id_requires_id_pk" PRIMARY KEY("challenge_id","requires_id"),
	CONSTRAINT "sz_challenge_prereq_not_self" CHECK ("sz_challenge_prereq"."challenge_id" <> "sz_challenge_prereq"."requires_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sz_team_path" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"path_id" uuid NOT NULL,
	"entry_reason" "sz_path_entry_reason" DEFAULT 'initial' NOT NULL,
	"reward_multiplier" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"skips_used" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sz_team_path_id_event_id_team_id_unique" UNIQUE("id","event_id","team_id"),
	CONSTRAINT "sz_team_path_team_id_path_id_unique" UNIQUE("team_id","path_id"),
	CONSTRAINT "sz_team_path_multiplier_check" CHECK ("sz_team_path"."reward_multiplier" > 0 AND "sz_team_path"."reward_multiplier" <= 1),
	CONSTRAINT "sz_team_path_skips_used_check" CHECK ("sz_team_path"."skips_used" >= 0),
	CONSTRAINT "sz_team_path_active_state_check" CHECK ("sz_team_path"."is_active" = ("sz_team_path"."left_at" IS NULL)),
	CONSTRAINT "sz_team_path_left_after_entered_check" CHECK ("sz_team_path"."left_at" IS NULL OR "sz_team_path"."left_at" >= "sz_team_path"."entered_at")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sz_unlocked_challenge" (
	"event_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"source" "sz_unlock_source" NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sz_unlocked_challenge_team_id_challenge_id_pk" PRIMARY KEY("team_id","challenge_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sz_skip" (
	"event_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"team_path_id" uuid NOT NULL,
	"used_by" uuid,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sz_skip_team_id_challenge_id_pk" PRIMARY KEY("team_id","challenge_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sz_time_glitch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"label" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"announced" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "sz_time_glitch_ends_after_starts" CHECK ("sz_time_glitch"."ends_at" > "sz_time_glitch"."starts_at")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sz_convergence_fragment" (
	"event_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"fragment_key" "sz_fragment_key" NOT NULL,
	"challenge_id" uuid NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sz_convergence_fragment_team_id_fragment_key_pk" PRIMARY KEY("team_id","fragment_key")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_event" ADD CONSTRAINT "core_event_created_by_core_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_event" ADD CONSTRAINT "core_event_updated_by_core_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_event_user" ADD CONSTRAINT "core_event_user_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_event_user" ADD CONSTRAINT "core_event_user_user_id_core_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."core_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_team" ADD CONSTRAINT "core_team_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_team" ADD CONSTRAINT "core_team_created_by_user_core_user_id_fk" FOREIGN KEY ("created_by_user") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_team" ADD CONSTRAINT "core_team_disqualified_by_core_user_id_fk" FOREIGN KEY ("disqualified_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_team_member" ADD CONSTRAINT "core_team_member_team_id_event_id_core_team_id_event_id_fk" FOREIGN KEY ("team_id","event_id") REFERENCES "public"."core_team"("id","event_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_team_member" ADD CONSTRAINT "core_team_member_event_id_user_id_core_event_user_event_id_user_id_fk" FOREIGN KEY ("event_id","user_id") REFERENCES "public"."core_event_user"("event_id","user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_team_member" ADD CONSTRAINT "core_team_member_user_id_core_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."core_user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_category" ADD CONSTRAINT "core_category_created_by_core_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_category" ADD CONSTRAINT "core_category_updated_by_core_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_challenge" ADD CONSTRAINT "core_challenge_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_challenge" ADD CONSTRAINT "core_challenge_category_id_core_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."core_category"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_challenge" ADD CONSTRAINT "core_challenge_created_by_core_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_challenge" ADD CONSTRAINT "core_challenge_updated_by_core_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_hint" ADD CONSTRAINT "core_hint_created_by_core_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_hint" ADD CONSTRAINT "core_hint_updated_by_core_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_hint" ADD CONSTRAINT "core_hint_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_hint" ADD CONSTRAINT "core_hint_event_id_challenge_id_core_challenge_event_id_id_fk" FOREIGN KEY ("event_id","challenge_id") REFERENCES "public"."core_challenge"("event_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_hint" ADD CONSTRAINT "core_hint_requires_hint_id_core_hint_id_fk" FOREIGN KEY ("requires_hint_id") REFERENCES "public"."core_hint"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_hint_unlock" ADD CONSTRAINT "core_hint_unlock_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_hint_unlock" ADD CONSTRAINT "core_hint_unlock_event_id_team_id_core_team_event_id_id_fk" FOREIGN KEY ("event_id","team_id") REFERENCES "public"."core_team"("event_id","id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_hint_unlock" ADD CONSTRAINT "core_hint_unlock_event_id_hint_id_core_hint_event_id_id_fk" FOREIGN KEY ("event_id","hint_id") REFERENCES "public"."core_hint"("event_id","id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_hint_unlock" ADD CONSTRAINT "core_hint_unlock_event_id_unlocked_by_core_team_member_event_id_user_id_fk" FOREIGN KEY ("event_id","unlocked_by") REFERENCES "public"."core_team_member"("event_id","user_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_submission" ADD CONSTRAINT "core_submission_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_submission" ADD CONSTRAINT "core_submission_event_id_team_id_core_team_event_id_id_fk" FOREIGN KEY ("event_id","team_id") REFERENCES "public"."core_team"("event_id","id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_submission" ADD CONSTRAINT "core_submission_event_id_challenge_id_core_challenge_event_id_id_fk" FOREIGN KEY ("event_id","challenge_id") REFERENCES "public"."core_challenge"("event_id","id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_submission" ADD CONSTRAINT "core_submission_event_id_submitted_by_core_team_member_event_id_user_id_fk" FOREIGN KEY ("event_id","submitted_by") REFERENCES "public"."core_team_member"("event_id","user_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_solve" ADD CONSTRAINT "core_solve_revoked_by_core_user_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_solve" ADD CONSTRAINT "core_solve_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_solve" ADD CONSTRAINT "core_solve_event_id_team_id_core_team_event_id_id_fk" FOREIGN KEY ("event_id","team_id") REFERENCES "public"."core_team"("event_id","id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_solve" ADD CONSTRAINT "core_solve_event_id_challenge_id_core_challenge_event_id_id_fk" FOREIGN KEY ("event_id","challenge_id") REFERENCES "public"."core_challenge"("event_id","id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_solve" ADD CONSTRAINT "core_solve_event_id_submission_id_core_submission_event_id_id_fk" FOREIGN KEY ("event_id","submission_id") REFERENCES "public"."core_submission"("event_id","id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core_solve" ADD CONSTRAINT "core_solve_event_id_solved_by_core_team_member_event_id_user_id_fk" FOREIGN KEY ("event_id","solved_by") REFERENCES "public"."core_team_member"("event_id","user_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_path" ADD CONSTRAINT "sz_path_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_path" ADD CONSTRAINT "sz_path_created_by_core_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_path" ADD CONSTRAINT "sz_path_updated_by_core_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_path_challenge" ADD CONSTRAINT "sz_path_challenge_created_by_core_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_path_challenge" ADD CONSTRAINT "sz_path_challenge_updated_by_core_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_path_challenge" ADD CONSTRAINT "sz_path_challenge_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_path_challenge" ADD CONSTRAINT "sz_path_challenge_event_id_challenge_id_core_challenge_event_id_id_fk" FOREIGN KEY ("event_id","challenge_id") REFERENCES "public"."core_challenge"("event_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_path_challenge" ADD CONSTRAINT "sz_path_challenge_event_id_path_id_sz_path_event_id_id_fk" FOREIGN KEY ("event_id","path_id") REFERENCES "public"."sz_path"("event_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_challenge_prereq" ADD CONSTRAINT "sz_challenge_prereq_created_by_core_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_challenge_prereq" ADD CONSTRAINT "sz_challenge_prereq_updated_by_core_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_challenge_prereq" ADD CONSTRAINT "sz_challenge_prereq_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_challenge_prereq" ADD CONSTRAINT "sz_challenge_prereq_event_id_challenge_id_core_challenge_event_id_id_fk" FOREIGN KEY ("event_id","challenge_id") REFERENCES "public"."core_challenge"("event_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_challenge_prereq" ADD CONSTRAINT "sz_challenge_prereq_event_id_requires_id_core_challenge_event_id_id_fk" FOREIGN KEY ("event_id","requires_id") REFERENCES "public"."core_challenge"("event_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_team_path" ADD CONSTRAINT "sz_team_path_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_team_path" ADD CONSTRAINT "sz_team_path_event_id_team_id_core_team_event_id_id_fk" FOREIGN KEY ("event_id","team_id") REFERENCES "public"."core_team"("event_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_team_path" ADD CONSTRAINT "sz_team_path_event_id_path_id_sz_path_event_id_id_fk" FOREIGN KEY ("event_id","path_id") REFERENCES "public"."sz_path"("event_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_unlocked_challenge" ADD CONSTRAINT "sz_unlocked_challenge_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_unlocked_challenge" ADD CONSTRAINT "sz_unlocked_challenge_event_id_team_id_core_team_event_id_id_fk" FOREIGN KEY ("event_id","team_id") REFERENCES "public"."core_team"("event_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_unlocked_challenge" ADD CONSTRAINT "sz_unlocked_challenge_event_id_challenge_id_core_challenge_event_id_id_fk" FOREIGN KEY ("event_id","challenge_id") REFERENCES "public"."core_challenge"("event_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_skip" ADD CONSTRAINT "sz_skip_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_skip" ADD CONSTRAINT "sz_skip_event_id_team_id_core_team_event_id_id_fk" FOREIGN KEY ("event_id","team_id") REFERENCES "public"."core_team"("event_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_skip" ADD CONSTRAINT "sz_skip_event_id_challenge_id_core_challenge_event_id_id_fk" FOREIGN KEY ("event_id","challenge_id") REFERENCES "public"."core_challenge"("event_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_skip" ADD CONSTRAINT "sz_skip_event_id_team_path_id_team_id_sz_team_path_event_id_id_team_id_fk" FOREIGN KEY ("event_id","team_path_id","team_id") REFERENCES "public"."sz_team_path"("event_id","id","team_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_skip" ADD CONSTRAINT "sz_skip_event_id_used_by_core_team_member_event_id_user_id_fk" FOREIGN KEY ("event_id","used_by") REFERENCES "public"."core_team_member"("event_id","user_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_time_glitch" ADD CONSTRAINT "sz_time_glitch_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_time_glitch" ADD CONSTRAINT "sz_time_glitch_created_by_core_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_time_glitch" ADD CONSTRAINT "sz_time_glitch_updated_by_core_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."core_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_convergence_fragment" ADD CONSTRAINT "sz_convergence_fragment_event_id_core_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."core_event"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_convergence_fragment" ADD CONSTRAINT "sz_convergence_fragment_event_id_team_id_core_team_event_id_id_fk" FOREIGN KEY ("event_id","team_id") REFERENCES "public"."core_team"("event_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sz_convergence_fragment" ADD CONSTRAINT "sz_convergence_fragment_event_id_challenge_id_core_challenge_event_id_id_fk" FOREIGN KEY ("event_id","challenge_id") REFERENCES "public"."core_challenge"("event_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "core_user_username_uq" ON "core_user" USING btree (lower("username"));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "core_user_email_uq" ON "core_user" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_event_user_user_idx" ON "core_event_user" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "core_team_one_captain" ON "core_team_member" USING btree ("team_id") WHERE "core_team_member"."role" = 'captain';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_team_member_user_idx" ON "core_team_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_challenge_event_state_idx" ON "core_challenge" USING btree ("event_id","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_challenge_category_idx" ON "core_challenge" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_hint_unlock_event_team_idx" ON "core_hint_unlock" USING btree ("event_id","team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_submission_team_challenge_idx" ON "core_submission" USING btree ("team_id","challenge_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_submission_challenge_verdict_idx" ON "core_submission" USING btree ("challenge_id","verdict");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_submission_event_submitted_at_idx" ON "core_submission" USING btree ("event_id","submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_submission_rate_limit_idx" ON "core_submission" USING btree ("team_id","submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_solve_challenge_solved_at_idx" ON "core_solve" USING btree ("challenge_id","solved_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_solve_team_idx" ON "core_solve" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "core_solve_event_solved_at_idx" ON "core_solve" USING btree ("event_id","solved_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sz_challenge_prereq_requires_idx" ON "sz_challenge_prereq" USING btree ("requires_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sz_one_active_path" ON "sz_team_path" USING btree ("team_id") WHERE "sz_team_path"."is_active";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sz_team_path_event_path_idx" ON "sz_team_path" USING btree ("event_id","path_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sz_unlocked_challenge_event_team_idx" ON "sz_unlocked_challenge" USING btree ("event_id","team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sz_skip_team_path_idx" ON "sz_skip" USING btree ("team_path_id");--> statement-breakpoint
CREATE VIEW "public"."core_challenge_solve_count" AS (
  SELECT
      c.event_id,
      c.id AS challenge_id,
      count(s.team_id) AS solves
  FROM core_challenge c
  LEFT JOIN core_solve s
      ON s.challenge_id = c.id
     AND s.revoked_at IS NULL
  GROUP BY c.event_id, c.id
);--> statement-breakpoint
CREATE VIEW "public"."core_leaderboard" AS (
  SELECT
      t.event_id,
      t.id AS team_id,
      t.name AS display_name,
      t.is_solo,
      coalesce(sv.total, 0) - coalesce(h.spent, 0) AS score,
      coalesce(sv.solve_count, 0) AS solve_count,
      sv.last_solve_at,
      rank() OVER (
          PARTITION BY t.event_id
          ORDER BY coalesce(sv.total, 0) - coalesce(h.spent, 0) DESC,
                   sv.last_solve_at ASC NULLS LAST
      ) AS rank
  FROM core_team t
  LEFT JOIN (
      SELECT s.event_id,
             s.team_id,
             sum(s.points_awarded) AS total,
             count(*) AS solve_count,
             max(s.solved_at) AS last_solve_at
      FROM core_solve s
      WHERE s.revoked_at IS NULL
      GROUP BY s.event_id, s.team_id
  ) sv ON sv.event_id = t.event_id AND sv.team_id = t.id
  LEFT JOIN (
      SELECT hu.event_id,
             hu.team_id,
             sum(hu.cost_paid) AS spent
      FROM core_hint_unlock hu
      GROUP BY hu.event_id, hu.team_id
  ) h ON h.event_id = t.event_id AND h.team_id = t.id
  WHERE t.is_hidden = FALSE
    AND t.disqualified_at IS NULL
);