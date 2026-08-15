-- Singleton seed pack stamp — operators read this from GET /health
CREATE TABLE IF NOT EXISTS seed_version (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  version text NOT NULL,
  notes text,
  applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO seed_version (id, version, notes)
VALUES (
  true,
  '2026.08.15.p7',
  'Phase 7: CTG-11 empty MP desk; SMS dry-run channel; MFA policy; health mock label'
)
ON CONFLICT (id) DO UPDATE SET
  version = EXCLUDED.version,
  notes = EXCLUDED.notes,
  applied_at = now();
