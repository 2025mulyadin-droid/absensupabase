-- Migration number: 0001 	 2024-01-30T00:00:00.000Z
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Guru/Karyawan',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Hadir', 'Sakit', 'Izin')),
  date TEXT NOT NULL, -- Format YYYY-MM-DD
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Seed initial data
INSERT INTO users (name) VALUES 
('Abdullah'),
('Siti Aminah'),
('Umar Faruq'),
('Fatimah'),
('Ali bin Abi Thalib'),
('Aisyah'),
('Khalid'),
('Zaynab'),
('Hasan'),
('Husain');
