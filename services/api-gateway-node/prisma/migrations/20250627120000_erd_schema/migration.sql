-- GeoInsight BD — ERD-aligned schema (replaces legacy gateway tables)

CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TYPE "AdminUnitType" AS ENUM ('DIVISION', 'DISTRICT', 'UPAZILA', 'UNION');
CREATE TYPE "UserRole" AS ENUM ('PMO', 'MINISTER', 'DC', 'UNION_CHAIRMAN');
CREATE TYPE "RepresentativeRole" AS ENUM ('MP', 'MINISTER', 'DC', 'UNION_CHAIRMAN', 'UPAZILA_CHAIRMAN', 'MAYOR');
CREATE TYPE "KpiAppliesTo" AS ENUM ('REPRESENTATIVE', 'ADMIN_UNIT', 'PROJECT', 'NATIONAL');
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED', 'STALLED', 'CANCELLED');
CREATE TYPE "RedFlagType" AS ENUM ('BUDGET_OVERRUN', 'DELAY', 'CORRUPTION_RISK', 'QUALITY', 'CONTRACTOR_FRAUD', 'OTHER');
CREATE TYPE "AgroMarketType" AS ENUM ('WHOLESALE', 'RETAIL', 'HAAT', 'MANDI');

CREATE TABLE "admin_units" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "name_bn" VARCHAR(255),
    "type" "AdminUnitType" NOT NULL,
    "parent_id" UUID,
    "path" VARCHAR(512),
    "geo_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "admin_units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "representatives" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "nid" VARCHAR(20) NOT NULL,
    "role" "RepresentativeRole" NOT NULL,
    "party" VARCHAR(120),
    "tenure_start" DATE NOT NULL,
    "tenure_end" DATE,
    "admin_unit_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "representatives_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "mfa_secret" TEXT,
    "admin_unit_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kpi_definitions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "unit" VARCHAR(32) NOT NULL,
    "applies_to" "KpiAppliesTo" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kpi_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kpi_records" (
    "id" UUID NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL,
    "fiscal_year" CHAR(4) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "blockchain_hash" VARCHAR(128),
    "representative_id" UUID NOT NULL,
    "kpi_def_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kpi_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "admin_unit_id" UUID NOT NULL,
    "budget_allocated" DECIMAL(18,2) NOT NULL,
    "budget_spent" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "ProjectStatus" NOT NULL,
    "contractor_nid" VARCHAR(20),
    "start_date" DATE NOT NULL,
    "blockchain_tx" VARCHAR(128),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "red_flag_alerts" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "flag_type" "RedFlagType" NOT NULL,
    "severity" INTEGER NOT NULL,
    "ai_explanation" TEXT,
    "resolved_at" TIMESTAMPTZ,
    "resolved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "red_flag_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "table_name" VARCHAR(100) NOT NULL,
    "record_id" UUID NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agro_markets" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "admin_unit_id" UUID NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "type" "AgroMarketType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agro_markets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "representatives_nid_key" ON "representatives"("nid");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "kpi_definitions_code_key" ON "kpi_definitions"("code");

CREATE INDEX "admin_units_parent_id_idx" ON "admin_units"("parent_id");
CREATE INDEX "admin_units_type_idx" ON "admin_units"("type");
CREATE INDEX "representatives_admin_unit_id_idx" ON "representatives"("admin_unit_id");
CREATE INDEX "representatives_role_idx" ON "representatives"("role");
CREATE INDEX "users_admin_unit_id_idx" ON "users"("admin_unit_id");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "kpi_records_representative_id_kpi_def_id_recorded_at_idx" ON "kpi_records"("representative_id", "kpi_def_id", "recorded_at");
CREATE INDEX "projects_admin_unit_id_idx" ON "projects"("admin_unit_id");
CREATE INDEX "projects_status_idx" ON "projects"("status");
CREATE INDEX "red_flag_alerts_project_id_idx" ON "red_flag_alerts"("project_id");
CREATE INDEX "red_flag_alerts_resolved_at_idx" ON "red_flag_alerts"("resolved_at");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX "audit_logs_table_name_record_id_idx" ON "audit_logs"("table_name", "record_id");
CREATE INDEX "agro_markets_admin_unit_id_idx" ON "agro_markets"("admin_unit_id");

ALTER TABLE "admin_units" ADD CONSTRAINT "admin_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "admin_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "representatives" ADD CONSTRAINT "representatives_admin_unit_id_fkey" FOREIGN KEY ("admin_unit_id") REFERENCES "admin_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_admin_unit_id_fkey" FOREIGN KEY ("admin_unit_id") REFERENCES "admin_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kpi_records" ADD CONSTRAINT "kpi_records_representative_id_fkey" FOREIGN KEY ("representative_id") REFERENCES "representatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kpi_records" ADD CONSTRAINT "kpi_records_kpi_def_id_fkey" FOREIGN KEY ("kpi_def_id") REFERENCES "kpi_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_admin_unit_id_fkey" FOREIGN KEY ("admin_unit_id") REFERENCES "admin_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "red_flag_alerts" ADD CONSTRAINT "red_flag_alerts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "red_flag_alerts" ADD CONSTRAINT "red_flag_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agro_markets" ADD CONSTRAINT "agro_markets_admin_unit_id_fkey" FOREIGN KEY ("admin_unit_id") REFERENCES "admin_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
