CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  saldo INT DEFAULT 500
);

CREATE TABLE IF NOT EXISTS jugadas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  apuesta INT,
  premio INT,
  fecha DATETIME,
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS configuracion (
  id INT PRIMARY KEY AUTO_INCREMENT,
  rtp FLOAT DEFAULT 25
);

CREATE TABLE IF NOT EXISTS admin (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario VARCHAR(50) UNIQUE,
  password VARCHAR(255)
);

INSERT INTO configuracion (rtp) VALUES (25);
INSERT INTO admin (usuario, password) VALUES ('admin', '$2b$10$KMBd2sO1gKhwPg6mYx7u7uH61rj5rVjZoSPKzP3rA7Pq0U82/xnUy');
-- Contraseña hash corresponde a: FrutyLuky!2025
