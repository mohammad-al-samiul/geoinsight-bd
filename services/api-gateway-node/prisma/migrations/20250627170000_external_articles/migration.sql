-- External articles from RSS / Google News ingestion

CREATE TYPE "ExternalArticleSource" AS ENUM ('RSS_NEWSPAPER', 'GOOGLE_NEWS');

CREATE TYPE "IngestionSentiment" AS ENUM ('Grievance', 'Demand', 'Neutral');

CREATE TABLE "external_articles" (
    "id" UUID NOT NULL,
    "source_type" "ExternalArticleSource" NOT NULL,
    "source_name" VARCHAR(128) NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "url" VARCHAR(2048) NOT NULL,
    "published_at" TIMESTAMPTZ,
    "district" VARCHAR(64),
    "division" VARCHAR(64),
    "sentiment_category" "IngestionSentiment",
    "sentiment_score" DECIMAL(6,4),
    "language" VARCHAR(8) NOT NULL DEFAULT 'bn',
    "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_articles_url_key" ON "external_articles"("url");

CREATE INDEX "external_articles_fetched_at_idx" ON "external_articles"("fetched_at" DESC);

CREATE INDEX "external_articles_district_sentiment_category_idx" ON "external_articles"("district", "sentiment_category");

CREATE INDEX "external_articles_source_type_published_at_idx" ON "external_articles"("source_type", "published_at" DESC);
