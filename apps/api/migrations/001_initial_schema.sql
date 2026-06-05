-- INBIDZ Social Commerce App schema
-- Run via: npm run migrate --workspace=@inbidz/api

CREATE TABLE IF NOT EXISTS app_profiles (
  user_id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(512),
  bio TEXT,
  is_seller TINYINT(1) NOT NULL DEFAULT 0,
  shop_name VARCHAR(80),
  shipping_policy TEXT,
  payout_ready TINYINT(1) NOT NULL DEFAULT 0,
  shop_setup_complete TINYINT(1) NOT NULL DEFAULT 0,
  referral_code VARCHAR(12) UNIQUE,
  referred_by_user_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_profiles_username (username)
);

CREATE TABLE IF NOT EXISTS app_follows (
  follower_id VARCHAR(36) NOT NULL,
  following_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, following_id),
  INDEX idx_follows_following (following_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  caption TEXT,
  post_type ENUM('photo', 'video', 'carousel') NOT NULL,
  commerce_mode ENUM('none', 'buy_now', 'auction', 'offers', 'buy_now_and_offers') NOT NULL DEFAULT 'none',
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'published',
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  share_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_posts_user (user_id),
  INDEX idx_posts_created (created_at DESC),
  INDEX idx_posts_commerce (commerce_mode, status)
);

CREATE TABLE IF NOT EXISTS post_media (
  id VARCHAR(36) PRIMARY KEY,
  post_id VARCHAR(36) NOT NULL,
  media_type ENUM('photo', 'video') NOT NULL,
  r2_key VARCHAR(512) NOT NULL,
  public_url VARCHAR(1024),
  hls_url VARCHAR(1024),
  width INT NOT NULL,
  height INT NOT NULL,
  duration DECIMAL(10,2),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_post_media_post (post_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_commerce (
  post_id VARCHAR(36) PRIMARY KEY,
  price DECIMAL(12,2),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  inventory INT NOT NULL DEFAULT 1,
  sold_count INT NOT NULL DEFAULT 0,
  auction_start DATETIME,
  auction_end DATETIME,
  reserve_price DECIMAL(12,2),
  min_bid_increment DECIMAL(12,2) DEFAULT 100,
  current_bid DECIMAL(12,2),
  current_bidder_id VARCHAR(36),
  bid_count INT NOT NULL DEFAULT 0,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bids (
  id VARCHAR(36) PRIMARY KEY,
  post_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bids_post (post_id, amount DESC),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS offers (
  id VARCHAR(36) PRIMARY KEY,
  post_id VARCHAR(36) NOT NULL,
  buyer_id VARCHAR(36) NOT NULL,
  seller_id VARCHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  counter_amount DECIMAL(12,2),
  message TEXT,
  status ENUM('pending', 'countered', 'accepted', 'declined', 'expired') NOT NULL DEFAULT 'pending',
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_offers_post (post_id),
  INDEX idx_offers_buyer (buyer_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(36) PRIMARY KEY,
  post_id VARCHAR(36),
  buyer_id VARCHAR(36) NOT NULL,
  seller_id VARCHAR(36) NOT NULL,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_conv_post_buyer (post_id, buyer_id),
  INDEX idx_conv_participants (buyer_id, seller_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(36) NOT NULL,
  sender_id VARCHAR(36) NOT NULL,
  body TEXT NOT NULL,
  offer_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_messages_conv (conversation_id, created_at),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_orders (
  id VARCHAR(36) PRIMARY KEY,
  post_id VARCHAR(36) NOT NULL,
  buyer_id VARCHAR(36) NOT NULL,
  seller_id VARCHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
  razorpay_order_id VARCHAR(64),
  razorpay_payment_id VARCHAR(64),
  offer_id VARCHAR(36),
  referrer_user_id VARCHAR(36),
  shipping_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_buyer (buyer_id),
  INDEX idx_orders_seller (seller_id),
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

CREATE TABLE IF NOT EXISTS post_short_urls (
  id VARCHAR(36) PRIMARY KEY,
  short_code VARCHAR(12) NOT NULL UNIQUE,
  post_id VARCHAR(36) NOT NULL,
  referrer_user_id VARCHAR(36),
  click_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_clicked_at TIMESTAMP NULL,
  INDEX idx_short_post (post_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS share_moments (
  id VARCHAR(36) PRIMARY KEY,
  post_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  moment_type ENUM('post_live', 'first_like', 'first_bid', 'highest_bid', 'ending_soon', 'first_sale', 'buyer_purchase') NOT NULL,
  share_prompt_shown TINYINT(1) NOT NULL DEFAULT 0,
  shared TINYINT(1) NOT NULL DEFAULT 0,
  share_platform VARCHAR(32),
  share_image_url VARCHAR(1024),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_share_moments_post (post_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS onboarding_events (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_onboarding_user (user_id)
);
