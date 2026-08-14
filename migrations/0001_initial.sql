CREATE TABLE administrators (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY,
  administrator_id TEXT NOT NULL REFERENCES administrators(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  revoked_at TEXT
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE manuals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category_id TEXT REFERENCES categories(id),
  cover_image_object_key TEXT,
  memo TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE manual_steps (
  id TEXT PRIMARY KEY,
  manual_id TEXT NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  warning TEXT,
  display_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE step_images (
  id TEXT PRIMARY KEY,
  manual_step_id TEXT NOT NULL REFERENCES manual_steps(id) ON DELETE CASCADE,
  image_object_key TEXT NOT NULL,
  image_alt TEXT,
  width INTEGER,
  height INTEGER,
  mime_type TEXT NOT NULL,
  display_order INTEGER NOT NULL CHECK (display_order IN (1, 2)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (manual_step_id, display_order)
);

CREATE TABLE image_annotations (
  id TEXT PRIMARY KEY,
  step_image_id TEXT NOT NULL REFERENCES step_images(id) ON DELETE CASCADE,
  annotation_type TEXT NOT NULL CHECK (
    annotation_type IN ('rectangle', 'circle', 'arrow', 'text')
  ),
  x REAL NOT NULL,
  y REAL NOT NULL,
  width REAL,
  height REAL,
  rotation REAL NOT NULL DEFAULT 0,
  text TEXT,
  style_data TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_manual_steps_manual
ON manual_steps(manual_id, display_order);

CREATE INDEX idx_step_images_step
ON step_images(manual_step_id, display_order);

CREATE INDEX idx_annotations_image
ON image_annotations(step_image_id, display_order);
