CREATE DATABASE IF NOT EXISTS ferrosider_produccion_soldadura
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE ferrosider_produccion_soldadura;

CREATE TABLE IF NOT EXISTS celda (
    id_celda INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pieza (
    id_pieza INT AUTO_INCREMENT PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS articulo_final (
    id_articulo_final INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(120) NOT NULL UNIQUE,
    descripcion VARCHAR(255) NOT NULL,
    celda_origen VARCHAR(50) NULL,
    medio VARCHAR(120) NULL,
    modulacion INT NULL,
    stock_ferrosider INT NULL,
    stock_ford INT NULL,
    porcentaje_cobertura DECIMAL(12,4) NULL
);

CREATE TABLE IF NOT EXISTS pieza_articulo_final (
    id_pieza INT NOT NULL,
    id_articulo_final INT NOT NULL,
    orden_componente INT NOT NULL DEFAULT 0,

    PRIMARY KEY (id_pieza, id_articulo_final),
    FOREIGN KEY (id_pieza) REFERENCES pieza(id_pieza),
    FOREIGN KEY (id_articulo_final) REFERENCES articulo_final(id_articulo_final),
    INDEX idx_pieza_articulo_final_articulo (id_articulo_final, id_pieza)
);

CREATE TABLE IF NOT EXISTS celda_pieza_articulo_final (
    id_celda INT NOT NULL,
    id_pieza INT NOT NULL,
    id_articulo_final INT NOT NULL,
    fuente VARCHAR(50) NOT NULL,
    confianza DECIMAL(6,4) NOT NULL DEFAULT 0,
    criterio VARCHAR(255) NULL,

    PRIMARY KEY (id_celda, id_pieza, id_articulo_final),
    FOREIGN KEY (id_celda) REFERENCES celda(id_celda),
    FOREIGN KEY (id_pieza) REFERENCES pieza(id_pieza),
    FOREIGN KEY (id_articulo_final) REFERENCES articulo_final(id_articulo_final),
    INDEX idx_celda_pieza_articulo_final_articulo (id_articulo_final),
    INDEX idx_celda_pieza_articulo_final_lookup (id_celda, id_pieza)
);

CREATE TABLE IF NOT EXISTS maquina_pieza_mapeo (
    id_mapeo BIGINT AUTO_INCREMENT PRIMARY KEY,
    maquina_origen VARCHAR(120) NOT NULL,
    id_celda INT NOT NULL,
    id_pieza INT NOT NULL,
    fecha_desde DATE NOT NULL,
    fecha_hasta DATE NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    prioridad INT NOT NULL DEFAULT 100,
    fuente VARCHAR(50) NOT NULL DEFAULT 'manual',
    notas VARCHAR(255) NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_celda) REFERENCES celda(id_celda),
    FOREIGN KEY (id_pieza) REFERENCES pieza(id_pieza),
    UNIQUE KEY uq_maquina_pieza_mapeo (
        maquina_origen,
        id_celda,
        id_pieza,
        fecha_desde
    ),
    INDEX idx_maquina_pieza_mapeo_lookup (
        maquina_origen,
        activo,
        fecha_desde,
        fecha_hasta,
        prioridad
    ),
    INDEX idx_maquina_pieza_mapeo_destino (id_celda, id_pieza)
);

CREATE TABLE IF NOT EXISTS turno (
    id_turno TINYINT PRIMARY KEY,
    descripcion VARCHAR(50) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL
);

INSERT INTO turno (id_turno, descripcion, hora_inicio, hora_fin)
VALUES
(1, '06 a 14', '06:00:00', '14:00:00'),
(2, '14 a 22', '14:00:00', '22:00:00'),
(3, '22 a 06', '22:00:00', '06:00:00')
ON DUPLICATE KEY UPDATE
descripcion = VALUES(descripcion),
hora_inicio = VALUES(hora_inicio),
hora_fin = VALUES(hora_fin);

CREATE TABLE IF NOT EXISTS produccion_hora (
    id_produccion BIGINT AUTO_INCREMENT PRIMARY KEY,

    fecha DATE NOT NULL,
    id_turno TINYINT NOT NULL,

    hora_desde TIME NOT NULL,
    hora_hasta TIME NOT NULL,

    id_celda INT NOT NULL,
    id_pieza INT NOT NULL,

    cantidad INT NOT NULL DEFAULT 0,

    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_turno) REFERENCES turno(id_turno),
    FOREIGN KEY (id_celda) REFERENCES celda(id_celda),
    FOREIGN KEY (id_pieza) REFERENCES pieza(id_pieza),

    UNIQUE KEY uq_produccion_hora (
        fecha,
        id_turno,
        hora_desde,
        id_celda,
        id_pieza
    ),

    INDEX idx_produccion_fecha (fecha),
    INDEX idx_produccion_fecha_turno (fecha, id_turno),
    INDEX idx_produccion_celda (id_celda),
    INDEX idx_produccion_pieza (id_pieza)
);
