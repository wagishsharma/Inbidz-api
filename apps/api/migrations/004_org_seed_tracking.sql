-- Tracks org artworks imported into the app feed (cold-start seeding).
CREATE TABLE IF NOT EXISTS org_seed_artworks (
  org_artwork_id INT NOT NULL PRIMARY KEY,
  post_id VARCHAR(36) NOT NULL,
  org_user_id VARCHAR(36) NOT NULL,
  seeded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_org_seed_user (org_user_id)
);
