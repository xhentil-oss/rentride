// Load .env from backend/ regardless of where this script is invoked from
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

// Each table as a separate statement — if one fails we still continue others
const TABLES = [
  // USERS
  `CREATE TABLE IF NOT EXISTS users (
    id                       CHAR(36) NOT NULL,
    email                    VARCHAR(255) UNIQUE NOT NULL,
    password                 VARCHAR(255) NOT NULL,
    name                     VARCHAR(255) NOT NULL,
    role                     ENUM('admin','manager','staff','accountant','customer') DEFAULT 'staff',
    is_active                TINYINT(1) DEFAULT 1,
    two_factor_enabled       TINYINT(1) DEFAULT 0,
    two_factor_secret        VARCHAR(255) NULL,
    permissions              TEXT DEFAULT '',
    profile_picture_url      VARCHAR(512),
    last_login               DATETIME,
    failed_attempts          TINYINT DEFAULT 0,
    locked_until             DATETIME NULL,
    email_verified           TINYINT(1) DEFAULT 0,
    email_verification_token VARCHAR(255) NULL,
    created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // REFRESH TOKENS
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          CHAR(36) NOT NULL,
    user_id     CHAR(36) NOT NULL,
    token       VARCHAR(512) NOT NULL UNIQUE,
    expires_at  DATETIME NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // PASSWORD RESET TOKENS
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          CHAR(36) NOT NULL,
    user_id     CHAR(36) NOT NULL,
    token       VARCHAR(255) NOT NULL UNIQUE,
    expires_at  DATETIME NOT NULL,
    used        TINYINT(1) DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // CARS
  `CREATE TABLE IF NOT EXISTS cars (
    id              CHAR(36) NOT NULL,
    brand           VARCHAR(100) NOT NULL,
    model           VARCHAR(100) NOT NULL,
    year            SMALLINT NOT NULL,
    category        VARCHAR(50) NOT NULL,
    transmission    VARCHAR(20) NOT NULL DEFAULT 'Manual',
    fuel            VARCHAR(20) NOT NULL DEFAULT 'Benzine',
    seats           TINYINT NOT NULL DEFAULT 5,
    luggage         TINYINT NOT NULL DEFAULT 2,
    price_per_day   DECIMAL(10,2) NOT NULL,
    display_price   DECIMAL(10,2) DEFAULT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'Available',
    image           TEXT,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    featured        TINYINT(1) DEFAULT 0,
    quantity        SMALLINT NOT NULL DEFAULT 1,
    description     TEXT DEFAULT NULL,
    created_by      CHAR(36),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // CUSTOMERS
  `CREATE TABLE IF NOT EXISTS customers (
    id          CHAR(36) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    first_name  VARCHAR(100),
    last_name   VARCHAR(100),
    email       VARCHAR(255) UNIQUE NOT NULL,
    phone       VARCHAR(30) NOT NULL,
    type        VARCHAR(30) DEFAULT 'Standard',
    created_by  CHAR(36),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // RESERVATIONS
  `CREATE TABLE IF NOT EXISTS reservations (
    id                CHAR(36) NOT NULL,
    car_id            CHAR(36) NOT NULL,
    customer_id       CHAR(36) NOT NULL,
    pickup_location   VARCHAR(255) NOT NULL,
    dropoff_location  VARCHAR(255) NOT NULL,
    start_date        DATE NOT NULL,
    start_time        VARCHAR(10) NOT NULL,
    end_date          DATE NOT NULL,
    end_time          VARCHAR(10) NOT NULL,
    flight_number     VARCHAR(30) DEFAULT NULL,
    notes             TEXT,
    source            VARCHAR(30) DEFAULT 'Web',
    status            VARCHAR(30) DEFAULT 'Pending',
    total_price       DECIMAL(10,2) NOT NULL,
    insurance         VARCHAR(50),
    extras            TEXT DEFAULT '',
    discount_code     VARCHAR(50),
    payment_status    VARCHAR(30) DEFAULT 'Pending Payment',
    created_by        CHAR(36),
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // INVOICES
  `CREATE TABLE IF NOT EXISTS invoices (
    id              CHAR(36) NOT NULL,
    invoice_no      VARCHAR(50) UNIQUE NOT NULL,
    reservation_id  CHAR(36) NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    status          VARCHAR(30) DEFAULT 'Pa paguar',
    due_date        DATE NOT NULL,
    paid_at         DATETIME,
    created_by      CHAR(36),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // DEPOSITS
  `CREATE TABLE IF NOT EXISTS deposits (
    id              CHAR(36) NOT NULL,
    reservation_id  CHAR(36) NOT NULL,
    customer_id     CHAR(36) NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    paid_date       DATE NOT NULL,
    return_date     DATE,
    status          VARCHAR(30) DEFAULT 'Mbajtur',
    note            TEXT,
    created_by      CHAR(36),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // CUSTOMER DOCUMENTS
  `CREATE TABLE IF NOT EXISTS customer_documents (
    id              CHAR(36) NOT NULL,
    customer_id     CHAR(36) NOT NULL,
    document_type   VARCHAR(30) NOT NULL,
    file_url        VARCHAR(512) NOT NULL,
    expiry_date     DATE,
    created_by      CHAR(36),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // COMMUNICATION LOGS
  `CREATE TABLE IF NOT EXISTS communication_logs (
    id            CHAR(36) NOT NULL,
    customer_id   CHAR(36) NOT NULL,
    type          VARCHAR(20) NOT NULL,
    subject       VARCHAR(255) NOT NULL,
    content       TEXT NOT NULL,
    timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by    CHAR(36),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // CHAT MESSAGES
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id                CHAR(36) NOT NULL,
    conversation_id   VARCHAR(100) NOT NULL,
    text              TEXT NOT NULL,
    is_from_admin     TINYINT(1) DEFAULT 0,
    created_by        CHAR(36),
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_conversation (conversation_id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // BLOG POSTS
  `CREATE TABLE IF NOT EXISTS blog_posts (
    id              CHAR(36) NOT NULL,
    title_sq        VARCHAR(255) NOT NULL,
    title_en        VARCHAR(255),
    slug            VARCHAR(255) UNIQUE NOT NULL,
    excerpt_sq      TEXT,
    excerpt_en      TEXT,
    content_sq      LONGTEXT NOT NULL,
    content_en      LONGTEXT,
    cover_image     TEXT,
    tags            VARCHAR(500),
    status          ENUM('draft','published') DEFAULT 'draft',
    published_at    DATETIME,
    author_id       CHAR(36),
    meta_title_sq   VARCHAR(255),
    meta_title_en   VARCHAR(255),
    meta_desc_sq    VARCHAR(500),
    meta_desc_en    VARCHAR(500),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_slug (slug),
    INDEX idx_published (published_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ACTIVITY LOGS
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id          CHAR(36) NOT NULL,
    user_id     CHAR(36),
    action      VARCHAR(30) NOT NULL,
    entity      VARCHAR(50) NOT NULL,
    entity_id   CHAR(36),
    description TEXT NOT NULL,
    ip_address  VARCHAR(50),
    timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // MAINTENANCE RECORDS
  `CREATE TABLE IF NOT EXISTS maintenance_records (
    id                    CHAR(36) NOT NULL,
    car_id                CHAR(36) NOT NULL,
    type                  VARCHAR(50) NOT NULL,
    status                VARCHAR(30) DEFAULT 'Scheduled',
    scheduled_date        DATE NOT NULL,
    completed_date        DATE,
    mileage_at_service    INT,
    next_service_mileage  INT,
    cost                  DECIMAL(10,2),
    notes                 TEXT,
    mechanic_name         VARCHAR(100),
    created_by            CHAR(36),
    created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // INSURANCE RECORDS
  `CREATE TABLE IF NOT EXISTS insurance_records (
    id              CHAR(36) NOT NULL,
    car_id          CHAR(36) NOT NULL,
    provider        VARCHAR(100) NOT NULL,
    policy_number   VARCHAR(100) NOT NULL,
    start_date      DATE NOT NULL,
    expiry_date     DATE NOT NULL,
    cost            DECIMAL(10,2) NOT NULL,
    type            VARCHAR(30) NOT NULL,
    status          VARCHAR(30) DEFAULT 'Active',
    created_by      CHAR(36),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // REGISTRATION RECORDS
  `CREATE TABLE IF NOT EXISTS registration_records (
    id              CHAR(36) NOT NULL,
    car_id          CHAR(36) NOT NULL,
    plate_number    VARCHAR(20) NOT NULL,
    expiry_date     DATE NOT NULL,
    renewal_cost    DECIMAL(10,2),
    status          VARCHAR(30) DEFAULT 'Valid',
    notes           TEXT,
    created_by      CHAR(36),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // FUEL LOGS
  `CREATE TABLE IF NOT EXISTS fuel_logs (
    id              CHAR(36) NOT NULL,
    car_id          CHAR(36) NOT NULL,
    date            DATE NOT NULL,
    liters          DECIMAL(8,2) NOT NULL,
    price_per_liter DECIMAL(8,3) NOT NULL,
    total_cost      DECIMAL(10,2) NOT NULL,
    mileage         INT NOT NULL,
    fuel_type       VARCHAR(20) NOT NULL,
    station         VARCHAR(100),
    notes           TEXT,
    created_by      CHAR(36),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // DAMAGE REPORTS
  `CREATE TABLE IF NOT EXISTS damage_reports (
    id              CHAR(36) NOT NULL,
    car_id          CHAR(36) NOT NULL,
    reservation_id  CHAR(36),
    report_date     DATE NOT NULL,
    description     TEXT NOT NULL,
    severity        VARCHAR(30) NOT NULL,
    status          VARCHAR(30) DEFAULT 'Reported',
    repair_cost     DECIMAL(10,2),
    photo_urls      TEXT DEFAULT '',
    reported_by     VARCHAR(100) NOT NULL,
    notes           TEXT,
    created_by      CHAR(36),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // REVIEWS
  `CREATE TABLE IF NOT EXISTS reviews (
    id          CHAR(36) NOT NULL,
    rating      TINYINT NOT NULL,
    text        TEXT NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    aspects     TEXT,
    approved    TINYINT(1) DEFAULT 0,
    created_by  CHAR(36),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // CHANGELOG ENTRIES
  `CREATE TABLE IF NOT EXISTS changelog_entries (
    id            CHAR(36) NOT NULL,
    title         VARCHAR(255) NOT NULL,
    content       TEXT NOT NULL,
    version       VARCHAR(20),
    release_date  DATE,
    is_published  TINYINT(1) DEFAULT 0,
    created_by    CHAR(36),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // PRICING RULES
  `CREATE TABLE IF NOT EXISTS pricing_rules (
    id                    CHAR(36) NOT NULL,
    name                  VARCHAR(255) NOT NULL,
    type                  VARCHAR(30) NOT NULL,
    discount_type         VARCHAR(20) NOT NULL,
    discount_value        DECIMAL(8,2) NOT NULL,
    direction             VARCHAR(20) DEFAULT 'discount',
    start_date            DATE DEFAULT NULL,
    end_date              DATE DEFAULT NULL,
    min_days              INT,
    max_days              INT,
    advance_booking_days  INT,
    last_minute_hours     INT,
    promo_code            VARCHAR(50),
    applicable_to         VARCHAR(100) DEFAULT 'all',
    is_active             TINYINT(1) DEFAULT 1,
    priority              TINYINT DEFAULT 0,
    description           TEXT,
    usage_count           INT DEFAULT 0,
    max_usages            INT DEFAULT 0,
    created_by            CHAR(36),
    created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // MONTHLY RATES — per-month price overrides per category or car
  `CREATE TABLE IF NOT EXISTS monthly_rates (
    id                CHAR(36) NOT NULL,
    year              SMALLINT DEFAULT NULL,
    month             TINYINT NOT NULL,
    applies_to        VARCHAR(30) NOT NULL DEFAULT 'all',
    applies_to_value  VARCHAR(255) DEFAULT NULL,
    price_per_day     DECIMAL(10,2) NOT NULL,
    notes             TEXT DEFAULT NULL,
    created_by        CHAR(36),
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // SITE SETTINGS (key-value pairs, grouped by category)
  `CREATE TABLE IF NOT EXISTS settings (
    setting_key   VARCHAR(100) NOT NULL,
    setting_value TEXT,
    category      VARCHAR(50) NOT NULL DEFAULT 'general',
    updated_by    CHAR(36),
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_key),
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // EXTRAS catalog — admin-managed list of insurance tiers, accessories, services, add-ons
  `CREATE TABLE IF NOT EXISTS extras (
    id              CHAR(36) NOT NULL,
    code            VARCHAR(50) NOT NULL,
    name_sq         VARCHAR(150) NOT NULL,
    name_en         VARCHAR(150) NOT NULL,
    description_sq TEXT,
    description_en TEXT,
    category        VARCHAR(30) NOT NULL DEFAULT 'accessory',
    price           DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_type      VARCHAR(20) NOT NULL DEFAULT 'per_day',
    icon            VARCHAR(50) DEFAULT NULL,
    max_quantity    SMALLINT DEFAULT 1,
    is_active       TINYINT(1) DEFAULT 1,
    sort_order      INT DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_extras_code (code),
    KEY idx_extras_category (category, is_active, sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // RESERVATION_EXTRAS — join table with price snapshot per reservation
  `CREATE TABLE IF NOT EXISTS reservation_extras (
    id              CHAR(36) NOT NULL,
    reservation_id  CHAR(36) NOT NULL,
    extra_id        CHAR(36) NOT NULL,
    extra_code      VARCHAR(50) NOT NULL,
    extra_name      VARCHAR(150) NOT NULL,
    category        VARCHAR(30) NOT NULL DEFAULT 'accessory',
    quantity        SMALLINT NOT NULL DEFAULT 1,
    unit_price      DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_type      VARCHAR(20) NOT NULL DEFAULT 'per_day',
    total_price     DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_re_reservation (reservation_id),
    KEY idx_re_extra (extra_id),
    CONSTRAINT fk_re_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // FIRST-PARTY ANALYTICS — page views + key events (privacy-friendly: stores
  // only country + an anonymous session id, never the raw IP).
  `CREATE TABLE IF NOT EXISTS analytics_events (
    id          CHAR(36) NOT NULL,
    type        VARCHAR(20) NOT NULL DEFAULT 'pageview',
    name        VARCHAR(100) DEFAULT NULL,
    path        VARCHAR(512) DEFAULT NULL,
    data        TEXT DEFAULT NULL,
    country     VARCHAR(2) DEFAULT NULL,
    lang        VARCHAR(5) DEFAULT NULL,
    session_id  VARCHAR(64) DEFAULT NULL,
    referrer    VARCHAR(512) DEFAULT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ae_created (created_at),
    KEY idx_ae_type (type),
    KEY idx_ae_name (name),
    KEY idx_ae_country (country),
    KEY idx_ae_session (session_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

// ── Default extras catalog seed (inserted only if `extras` table is empty) ──
const DEFAULT_EXTRAS = [
  // ── INSURANCE (sigurim) — choose one, per_day ──
  { code: 'ins_basic',    cat: 'insurance', name_sq: 'Sigurim Bazë',                name_en: 'Basic Insurance',             desc_sq: 'Përfshihet falas. Mbulim minimal sipas ligjit.',  desc_en: 'Included free. Minimum legal coverage.',          price: 0,  price_type: 'per_day',    max: 1, icon: 'shield',         order: 10 },
  { code: 'ins_standard', cat: 'insurance', name_sq: 'Sigurim Standard',            name_en: 'Standard Insurance',          desc_sq: 'Mbulim i zgjeruar me franshizë të reduktuar.',     desc_en: 'Extended coverage with reduced deductible.',      price: 10, price_type: 'per_day',    max: 1, icon: 'shield',         order: 20 },
  { code: 'ins_full',     cat: 'insurance', name_sq: 'Sigurim i Plotë',             name_en: 'Full Coverage',               desc_sq: 'Mbulim i plotë i përgjegjësisë + dëmtimit.',       desc_en: 'Full liability + damage coverage.',               price: 18, price_type: 'per_day',    max: 1, icon: 'shield',         order: 30 },
  { code: 'ins_premium',  cat: 'insurance', name_sq: 'Sigurim Premium Zero',        name_en: 'Premium Zero Deductible',     desc_sq: 'Franshizë zero — mbulim total, pa rrezik.',         desc_en: 'Zero deductible — total coverage, no risk.',      price: 28, price_type: 'per_day',    max: 1, icon: 'crown',          order: 40 },

  // ── EQUIPMENT (pajisje) — per_day ──
  { code: 'eq_gps',           cat: 'equipment', name_sq: 'Navigator GPS',                  name_en: 'GPS Navigator',           desc_sq: 'Pajisje navigimi për gjithë Ballkanin.',          desc_en: 'Navigation device for all of the Balkans.',       price: 5,  price_type: 'per_day',    max: 1, icon: 'map',           order: 10 },
  { code: 'eq_baby_seat',     cat: 'equipment', name_sq: 'Sedilje për bebe (0–12 muaj)',   name_en: 'Baby Car Seat (0–12mo)',  desc_sq: 'Sedilje e certifikuar për bebe deri 12 muaj.',    desc_en: 'Certified seat for babies up to 12 months.',      price: 7,  price_type: 'per_day',    max: 2, icon: 'baby',          order: 20 },
  { code: 'eq_child_seat',    cat: 'equipment', name_sq: 'Sedilje për fëmijë (1–4 vjeç)',  name_en: 'Child Seat (1–4y)',       desc_sq: 'Sedilje e certifikuar për fëmijë 1–4 vjeç.',      desc_en: 'Certified seat for children 1–4 years.',          price: 6,  price_type: 'per_day',    max: 2, icon: 'baby',          order: 30 },
  { code: 'eq_booster',       cat: 'equipment', name_sq: 'Booster (4–12 vjeç)',            name_en: 'Booster Seat (4–12y)',    desc_sq: 'Booster për fëmijë 4–12 vjeç.',                   desc_en: 'Booster for children 4–12 years.',                price: 4,  price_type: 'per_day',    max: 2, icon: 'baby',          order: 40 },
  { code: 'eq_wifi',          cat: 'equipment', name_sq: 'Wi-Fi portativ 4G',              name_en: 'Portable Wi-Fi 4G',       desc_sq: 'Internet 4G i pakufizuar gjatë qirasë.',          desc_en: 'Unlimited 4G internet during rental.',            price: 6,  price_type: 'per_day',    max: 1, icon: 'wifi',          order: 50 },
  { code: 'eq_snow_chains',   cat: 'equipment', name_sq: 'Zinxhirë bore',                  name_en: 'Snow Chains',             desc_sq: 'Vetëm me sezon dimëror — rrugë malore.',          desc_en: 'Winter season only — mountain roads.',            price: 15, price_type: 'per_rental', max: 1, icon: 'snowflake',     order: 60 },
  { code: 'eq_roof_rack',     cat: 'equipment', name_sq: 'Mbajtëse tavanore',              name_en: 'Roof Rack',               desc_sq: 'Mbajtëse për bagazh shtesë në tavan.',            desc_en: 'Extra luggage carrier on the roof.',              price: 8,  price_type: 'per_day',    max: 1, icon: 'package',       order: 70 },

  // ── SERVICES (shërbime) — per_rental / one_time ──
  { code: 'sv_cross_kosovo',   cat: 'service', name_sq: 'Cross-Border: Kosovë',           name_en: 'Cross-Border: Kosovo',        desc_sq: 'Leje për udhëtim në Kosovë + sigurim.',           desc_en: 'Permit + insurance for travel to Kosovo.',          price: 25, price_type: 'per_rental', max: 1, icon: 'globe',         order: 10 },
  { code: 'sv_cross_mne',      cat: 'service', name_sq: 'Cross-Border: Mali i Zi',        name_en: 'Cross-Border: Montenegro',    desc_sq: 'Leje për Mal të Zi + sigurim ndërkombëtar.',      desc_en: 'Permit for Montenegro + intl. insurance.',         price: 35, price_type: 'per_rental', max: 1, icon: 'globe',         order: 20 },
  { code: 'sv_cross_mk',       cat: 'service', name_sq: 'Cross-Border: Maqedonia e Veriut', name_en: 'Cross-Border: North Macedonia', desc_sq: 'Leje për Maqedoninë e Veriut.',                 desc_en: 'Permit for North Macedonia.',                      price: 25, price_type: 'per_rental', max: 1, icon: 'globe',         order: 30 },
  { code: 'sv_cross_gr',       cat: 'service', name_sq: 'Cross-Border: Greqi',            name_en: 'Cross-Border: Greece',        desc_sq: 'Leje për Greqi + sigurim ndërkombëtar.',          desc_en: 'Permit for Greece + intl. insurance.',             price: 45, price_type: 'per_rental', max: 1, icon: 'globe',         order: 40 },
  { code: 'sv_delivery',       cat: 'service', name_sq: 'Dorëzim në adresë',              name_en: 'Address Delivery',            desc_sq: 'Sjellim makinën te ti, brenda Tiranës.',          desc_en: 'We bring the car to you, within Tirana.',          price: 15, price_type: 'one_time',   max: 1, icon: 'truck',         order: 50 },
  { code: 'sv_late_return',    cat: 'service', name_sq: 'Kthim me vonesë (24h)',          name_en: 'Late Return (24h grace)',     desc_sq: 'Kthim deri 24 orë vonesë pa penalitet.',          desc_en: 'Return up to 24h late with no penalty.',           price: 20, price_type: 'one_time',   max: 1, icon: 'clock',         order: 60 },

  // ── ADD-ONS (shtesa) — per_day / one_time ──
  { code: 'ad_extra_driver',   cat: 'addon', name_sq: 'Shofer shtesë',                    name_en: 'Additional Driver',           desc_sq: 'Regjistro një shofer shtesë në kontratë.',        desc_en: 'Register an additional driver on the contract.',   price: 8,  price_type: 'per_day',    max: 2, icon: 'user',          order: 10 },
  { code: 'ad_full_tank',      cat: 'addon', name_sq: 'Karburant i plotë (parapagim)',   name_en: 'Full Tank Prepay',            desc_sq: 'Paguaj karburantin paraprakisht, kthim pa pikë.', desc_en: 'Prepay fuel, return without refilling.',           price: 60, price_type: 'one_time',   max: 1, icon: 'gas-pump',      order: 20 },
  { code: 'ad_young_driver',   cat: 'addon', name_sq: 'Shofer i ri (<25 vjeç)',           name_en: 'Young Driver (<25y)',         desc_sq: 'Suplement për shofer nën 25 vjeç.',               desc_en: 'Surcharge for driver under 25.',                   price: 5,  price_type: 'per_day',    max: 1, icon: 'user',          order: 30 },
  { code: 'ad_unlimited_km',   cat: 'addon', name_sq: 'Kilometra të pakufizuara',         name_en: 'Unlimited Kilometers',        desc_sq: 'Hiq kufirin standard të kilometrave.',            desc_en: 'Remove standard kilometer limit.',                 price: 4,  price_type: 'per_day',    max: 1, icon: 'road',          order: 40 },
];

// ── Post-migration ALTER statements (safe to re-run) ──────────
const ALTERS = [
  // Add 'customer' to users role enum
  `ALTER TABLE users MODIFY COLUMN role ENUM('admin','manager','staff','accountant','customer') DEFAULT 'staff'`,
  // Add customer_id column to link user→customer record
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id CHAR(36) DEFAULT NULL`,
  // Add quantity and description to cars
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS quantity SMALLINT NOT NULL DEFAULT 1`,
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL`,
  `ALTER TABLE cars ADD COLUMN IF NOT EXISTS display_price DECIMAL(10,2) DEFAULT NULL`,
  // ── pricing_rules: make dates nullable and add missing columns ──
  `ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'discount'`,
  `ALTER TABLE pricing_rules MODIFY COLUMN start_date DATE DEFAULT NULL`,
  `ALTER TABLE pricing_rules MODIFY COLUMN end_date DATE DEFAULT NULL`,
  `ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS advance_booking_days INT DEFAULT NULL`,
  `ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS last_minute_hours INT DEFAULT NULL`,
  `ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50) DEFAULT NULL`,
  `ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS applicable_to VARCHAR(100) DEFAULT 'all'`,
  `ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1`,
  `ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS priority TINYINT DEFAULT 0`,
  `ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL`,
  `ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0`,
  `ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS max_usages INT DEFAULT 0`,
  `ALTER TABLE pricing_rules ADD COLUMN IF NOT EXISTS created_by CHAR(36) DEFAULT NULL`,
  // ── reservations: add location_fee column ──
  `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS location_fee DECIMAL(10,2) DEFAULT 0`,
  `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS flight_number VARCHAR(30) DEFAULT NULL`,
  // ── Customer-selected country + auto-captured request metadata (IP/country/device) ──
  `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS customer_country VARCHAR(100) DEFAULT NULL`,
  `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS meta_ip VARCHAR(45) DEFAULT NULL`,
  `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS meta_country VARCHAR(2) DEFAULT NULL`,
  `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS meta_device VARCHAR(255) DEFAULT NULL`,
  `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS meta_user_agent VARCHAR(500) DEFAULT NULL`,
  `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS import_ref VARCHAR(64) DEFAULT NULL`,
  // ── Performance indexes ──
  'CREATE INDEX idx_res_overlap ON reservations (car_id, status, start_date, end_date)',
  'CREATE INDEX idx_res_status ON reservations (status)',
  'CREATE INDEX idx_res_customer ON reservations (customer_id)',
  'CREATE INDEX idx_cust_user_id ON customers (user_id)',
  'CREATE INDEX idx_cust_email ON customers (email)',
  'CREATE INDEX idx_car_category ON cars (category)',
  'CREATE INDEX idx_car_status ON cars (status)',
  'CREATE INDEX idx_rt_token ON refresh_tokens (token)',
  'CREATE INDEX idx_rt_user ON refresh_tokens (user_id, expires_at)',
  // ── Security columns added for lockout, 2FA, email verification ──
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts TINYINT DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until DATETIME NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255) NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255) NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires DATETIME NULL`,
  // ── OTP / 2FA brute-force tracking persisted to DB ──
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_failed_attempts TINYINT DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_locked_until DATETIME NULL`,
  // ── Passwordless email-code login (admin/staff) ──
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS login_code_hash VARCHAR(255) DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS login_code_expires DATETIME DEFAULT NULL`,
  // ── Google OAuth (sign-in with Google) ──
  // google_id is the 'sub' claim from Google's ID token — stable, unique per Google account.
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL UNIQUE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(512) NULL`,
  // Make password nullable so Google-only accounts don't need a local password.
  `ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL`,
  // ── Index for slug lookups on cars (slug already UNIQUE → auto-indexed, but explicit) ──
  'CREATE INDEX idx_car_slug ON cars (slug)',
  // ── Additional FK indices: speed up DELETE-by-parent + JOINs in lists/reports ──
  'CREATE INDEX idx_prt_user ON password_reset_tokens (user_id)',
  'CREATE INDEX idx_dep_reservation ON deposits (reservation_id)',
  'CREATE INDEX idx_dep_customer ON deposits (customer_id)',
  'CREATE INDEX idx_inv_reservation ON invoices (reservation_id)',
  'CREATE INDEX idx_cl_customer ON communication_logs (customer_id)',
  'CREATE INDEX idx_al_user ON activity_logs (user_id)',
  'CREATE INDEX idx_al_entity ON activity_logs (entity, entity_id)',
];

async function migrate() {
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset:  'utf8mb4',
  });

  console.log('🚀 Running migrations...');
  let success = 0;
  let failed = 0;

  for (const sql of TABLES) {
    // Extract table name for logging
    const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    const tableName = match ? match[1] : 'unknown';
    try {
      await connection.query(sql);
      console.log(`  ✅ ${tableName}`);
      success++;
    } catch (err) {
      console.error(`  ❌ ${tableName}: ${err.message}`);
      failed++;
    }
  }

  // Run ALTER statements (safe to re-run)
  console.log('\n🔧 Running ALTER statements...');
  for (const sql of ALTERS) {
    try {
      await connection.query(sql);
      console.log(`  ✅ ${sql.slice(0, 60)}...`);
    } catch (err) {
      // Ignore "Duplicate column" / "Duplicate key name" — idempotent re-runs
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.message.includes('Duplicate column') || err.message.includes('Duplicate key name')) {
        console.log(`  ⏭️  Already applied: ${sql.slice(0, 60)}...`);
      } else {
        console.log(`  ⚠️  ${err.message.slice(0, 80)}`);
      }
    }
  }

  // Seed default extras catalog (idempotent — only inserts what's missing by code)
  try {
    const [existing] = await connection.query('SELECT code FROM extras');
    const have = new Set(existing.map((r) => r.code));
    const { randomUUID } = require('crypto');
    let seeded = 0;
    for (const e of DEFAULT_EXTRAS) {
      if (have.has(e.code)) continue;
      await connection.query(
        'INSERT INTO extras (id, code, name_sq, name_en, description_sq, description_en, category, price, price_type, icon, max_quantity, is_active, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [randomUUID(), e.code, e.name_sq, e.name_en, e.desc_sq, e.desc_en, e.cat, e.price, e.price_type, e.icon, e.max, 1, e.order]
      );
      seeded++;
    }
    if (seeded > 0) console.log(`\n🌱 Seeded ${seeded} default extras`);
  } catch (err) {
    console.log(`  ⚠️  Extras seed: ${err.message.slice(0, 100)}`);
  }

  await connection.end();
  console.log(`\n📊 Migration complete: ${success} OK, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

migrate();
