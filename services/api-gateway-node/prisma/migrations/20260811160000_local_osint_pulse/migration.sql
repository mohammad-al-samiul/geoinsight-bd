-- P2 Local Entity DSS: OSINT hits, influencers, polling centres

CREATE TYPE "LocalInfluencerRole" AS ENUM (
  'INFLUENCER',
  'VOLUNTEER',
  'COMMUNITY_LEADER',
  'YOUTH_ORGANIZER',
  'RELIGIOUS_LEADER',
  'BUSINESS_LEADER'
);

CREATE TYPE "LocalOsintChannel" AS ENUM ('NEWS', 'FACEBOOK', 'SOCIAL', 'FIELD', 'OTHER');
CREATE TYPE "LocalOsintSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

CREATE TABLE "local_osint_hits" (
    "id" UUID NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "title_bn" VARCHAR(512),
    "summary" TEXT,
    "source_name" VARCHAR(128) NOT NULL,
    "source_url" VARCHAR(2048),
    "channel" "LocalOsintChannel" NOT NULL DEFAULT 'NEWS',
    "matched_keyword" VARCHAR(120) NOT NULL,
    "sentiment" "LocalOsintSentiment" NOT NULL DEFAULT 'NEUTRAL',
    "propaganda_flag" BOOLEAN NOT NULL DEFAULT false,
    "propaganda_note" VARCHAR(512),
    "published_at" TIMESTAMPTZ,
    "ward_id" UUID,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "local_osint_hits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "local_influencers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "name_bn" VARCHAR(255),
    "role_type" "LocalInfluencerRole" NOT NULL,
    "phone" VARCHAR(20),
    "organization" VARCHAR(255),
    "influence_score" INTEGER NOT NULL DEFAULT 50,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ward_id" UUID,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "local_influencers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "local_polling_centers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "name_bn" VARCHAR(255),
    "code" VARCHAR(32),
    "registered_voters" INTEGER NOT NULL DEFAULT 0,
    "new_voters" INTEGER NOT NULL DEFAULT 0,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "address" VARCHAR(512),
    "ward_id" UUID,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "local_polling_centers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "local_osint_hits_entity_id_published_at_idx"
  ON "local_osint_hits"("entity_id", "published_at" DESC);
CREATE INDEX "local_osint_hits_entity_id_propaganda_flag_published_at_idx"
  ON "local_osint_hits"("entity_id", "propaganda_flag", "published_at" DESC);
CREATE INDEX "local_osint_hits_entity_id_sentiment_idx"
  ON "local_osint_hits"("entity_id", "sentiment");
CREATE INDEX "local_osint_hits_matched_keyword_idx"
  ON "local_osint_hits"("matched_keyword");

CREATE INDEX "local_influencers_entity_id_is_active_influence_score_idx"
  ON "local_influencers"("entity_id", "is_active", "influence_score" DESC);
CREATE INDEX "local_influencers_ward_id_role_type_idx"
  ON "local_influencers"("ward_id", "role_type");

CREATE INDEX "local_polling_centers_entity_id_new_voters_idx"
  ON "local_polling_centers"("entity_id", "new_voters" DESC);
CREATE INDEX "local_polling_centers_ward_id_idx"
  ON "local_polling_centers"("ward_id");

ALTER TABLE "local_osint_hits"
  ADD CONSTRAINT "local_osint_hits_ward_id_fkey"
  FOREIGN KEY ("ward_id") REFERENCES "admin_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "local_osint_hits"
  ADD CONSTRAINT "local_osint_hits_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "admin_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "local_influencers"
  ADD CONSTRAINT "local_influencers_ward_id_fkey"
  FOREIGN KEY ("ward_id") REFERENCES "admin_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "local_influencers"
  ADD CONSTRAINT "local_influencers_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "admin_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "local_polling_centers"
  ADD CONSTRAINT "local_polling_centers_ward_id_fkey"
  FOREIGN KEY ("ward_id") REFERENCES "admin_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "local_polling_centers"
  ADD CONSTRAINT "local_polling_centers_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "admin_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
