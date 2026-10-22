-- Diseño relacional PROPIO, avance B.2. PostgreSQL.
-- La versión funcional 0.1 guarda clientes en JSON para facilitar una demostración
-- sin PostgreSQL. Este script define la base de datos objetivo; NO está conectado aún.
CREATE TABLE cat_estatus (
 id_estatus CHAR(3) PRIMARY KEY,
 descripcion VARCHAR(30) NOT NULL
);
INSERT INTO cat_estatus VALUES ('ACT','Activo'),('INA','Inactivo'),('BAJ','Baja lógica');
CREATE TABLE usuario (
 id_usuario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_empleado VARCHAR(10) UNIQUE NOT NULL,
 nombre_completo VARCHAR(100) NOT NULL,
 correo VARCHAR(100) UNIQUE NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 rol VARCHAR(20) NOT NULL CHECK (rol IN ('TRANSACCION','CONSULTA')),
 id_estatus CHAR(3) NOT NULL REFERENCES cat_estatus(id_estatus),
 fecha_alta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE cliente (
 id_cliente BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 clave_sap VARCHAR(10) NOT NULL UNIQUE,
 razon_social VARCHAR(150) NOT NULL,
 rfc VARCHAR(13),
 domicilio_entrega VARCHAR(250),
 contacto_nombre VARCHAR(100),
 contacto_correo VARCHAR(100),
 requiere_certificado BOOLEAN NOT NULL DEFAULT TRUE,
 id_estatus CHAR(3) NOT NULL DEFAULT 'ACT' REFERENCES cat_estatus(id_estatus),
 fecha_alta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 id_usuario_alta BIGINT REFERENCES usuario(id_usuario)
);
CREATE TABLE equipo (
 id_equipo CHAR(8) PRIMARY KEY,
 tipo_equipo CHAR(3) NOT NULL CHECK (tipo_equipo IN ('ALV','FAR')),
 nombre VARCHAR(60) NOT NULL,
 marca VARCHAR(40),
 modelo VARCHAR(40),
 numero_serie VARCHAR(30) UNIQUE,
 id_estatus CHAR(3) NOT NULL REFERENCES cat_estatus(id_estatus)
);
CREATE TABLE lote (
 id_lote VARCHAR(20) PRIMARY KEY,
 producto VARCHAR(60) NOT NULL,
 fecha_produccion DATE NOT NULL,
 fecha_caducidad DATE NOT NULL,
 id_estatus CHAR(3) NOT NULL REFERENCES cat_estatus(id_estatus)
);
CREATE TABLE inspeccion (
 id_inspeccion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_lote VARCHAR(20) NOT NULL REFERENCES lote(id_lote),
 secuencia VARCHAR(3) NOT NULL,
 fecha_inspeccion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 id_estatus CHAR(3) NOT NULL REFERENCES cat_estatus(id_estatus),
 motivo_reinspeccion VARCHAR(200),
 UNIQUE(id_lote,secuencia)
);
CREATE TABLE certificado (
 id_certificado VARCHAR(16) PRIMARY KEY,
 id_cliente BIGINT NOT NULL REFERENCES cliente(id_cliente),
 id_lote VARCHAR(20) NOT NULL REFERENCES lote(id_lote),
 id_inspeccion BIGINT NOT NULL REFERENCES inspeccion(id_inspeccion),
 num_pedido VARCHAR(15) NOT NULL,
 num_factura VARCHAR(20),
 fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ruta_pdf VARCHAR(255),
 id_estatus CHAR(3) NOT NULL REFERENCES cat_estatus(id_estatus)
);
