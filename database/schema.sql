-- São João Digital — esquema MySQL/MariaDB (importe no phpMyAdmin: aba "Importar").
-- Crie antes o banco, por exemplo:  CREATE DATABASE saojoaodigital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Idempotente: pode ser importado de novo sem apagar dados.

SET NAMES utf8mb4;

-- Usuários do painel administrativo (a senha é guardada com password_hash, nunca em texto).
CREATE TABLE IF NOT EXISTS usuarios (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(190) NOT NULL UNIQUE,
  senha_hash  VARCHAR(255) NOT NULL,
  tipo        ENUM('admin','editor') NOT NULL DEFAULT 'admin',
  ativo       TINYINT(1) NOT NULL DEFAULT 1,
  criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Empresas: colunas indexadas + o registro completo (mesmo formato de dados/empresas.json) em "dados".
CREATE TABLE IF NOT EXISTS empresas (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug           VARCHAR(160) NOT NULL UNIQUE,
  nome           VARCHAR(200) NOT NULL,
  categoria      VARCHAR(60)  NOT NULL,
  subcategoria_slug VARCHAR(80) NOT NULL DEFAULT '',
  plano          ENUM('gratuito','premium') NOT NULL DEFAULT 'gratuito',
  whatsapp       VARCHAR(20)  NOT NULL DEFAULT '',
  ativa          TINYINT(1) NOT NULL DEFAULT 1,
  dados          LONGTEXT NOT NULL,
  criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_emp_categoria (categoria),
  KEY idx_emp_ativa (ativa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comparador de preços (equivale a dados/ofertas.json).
CREATE TABLE IF NOT EXISTS ofertas (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ref               VARCHAR(80) DEFAULT NULL UNIQUE,
  empresa_slug      VARCHAR(160) NOT NULL,
  produto           VARCHAR(200) NOT NULL,
  descricao         VARCHAR(500) NOT NULL DEFAULT '',
  preco             DECIMAL(10,2) NOT NULL,
  preco_promocional DECIMAL(10,2) DEFAULT NULL,
  data_inicio       DATE DEFAULT NULL,
  data_fim          DATE DEFAULT NULL,
  ativo             TINYINT(1) NOT NULL DEFAULT 1,
  criado_em         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_of_empresa (empresa_slug),
  KEY idx_of_produto (produto),
  CONSTRAINT fk_of_empresa FOREIGN KEY (empresa_slug) REFERENCES empresas(slug) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cupons e ofertas da semana (equivale a dados/cupons.json).
CREATE TABLE IF NOT EXISTS cupons (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ref           VARCHAR(80) DEFAULT NULL UNIQUE,
  empresa_slug  VARCHAR(160) NOT NULL,
  titulo        VARCHAR(160) NOT NULL,
  descricao     VARCHAR(500) NOT NULL DEFAULT '',
  codigo        VARCHAR(40) NOT NULL,
  tipo          ENUM('percentual','valor','brinde') NOT NULL DEFAULT 'percentual',
  valor         DECIMAL(10,2) NOT NULL DEFAULT 0,
  semana        TINYINT(1) NOT NULL DEFAULT 0,
  condicoes     VARCHAR(300) NOT NULL DEFAULT '',
  data_inicio   DATE DEFAULT NULL,
  data_fim      DATE DEFAULT NULL,
  ativo         TINYINT(1) NOT NULL DEFAULT 1,
  criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cp_empresa (empresa_slug),
  CONSTRAINT fk_cp_empresa FOREIGN KEY (empresa_slug) REFERENCES empresas(slug) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agendamentos recebidos pelo site (dados pessoais: LGPD — o cliente aceita o uso no formulário).
CREATE TABLE IF NOT EXISTS agendamentos (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  empresa_slug     VARCHAR(160) NOT NULL,
  servico          VARCHAR(200) NOT NULL,
  data             DATE NOT NULL,
  horario          CHAR(5) NOT NULL,
  duracao_min      SMALLINT UNSIGNED NOT NULL,
  cliente_nome     VARCHAR(120) NOT NULL,
  cliente_whatsapp VARCHAR(20)  NOT NULL,
  observacoes      VARCHAR(300) NOT NULL DEFAULT '',
  status           ENUM('pendente','confirmado','cancelado') NOT NULL DEFAULT 'pendente',
  ip_hash          CHAR(64) NOT NULL DEFAULT '',
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ag_empresa_data (empresa_slug, data),
  KEY idx_ag_status (status),
  CONSTRAINT fk_ag_empresa FOREIGN KEY (empresa_slug) REFERENCES empresas(slug) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pedidos do cardápio digital.
CREATE TABLE IF NOT EXISTS pedidos (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  empresa_slug     VARCHAR(160) NOT NULL,
  itens            TEXT NOT NULL,
  total            DECIMAL(10,2) NOT NULL,
  cliente_nome     VARCHAR(120) NOT NULL,
  tipo_entrega     VARCHAR(30)  NOT NULL,
  endereco         VARCHAR(200) NOT NULL DEFAULT '',
  pagamento        VARCHAR(60)  NOT NULL DEFAULT '',
  observacoes      VARCHAR(300) NOT NULL DEFAULT '',
  status           ENUM('novo','em_preparo','entregue','cancelado') NOT NULL DEFAULT 'novo',
  ip_hash          CHAR(64) NOT NULL DEFAULT '',
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pe_empresa (empresa_slug),
  KEY idx_pe_status (status),
  CONSTRAINT fk_pe_empresa FOREIGN KEY (empresa_slug) REFERENCES empresas(slug) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cadastro de novas empresas (fica pendente até um administrador aprovar).
CREATE TABLE IF NOT EXISTS cadastros_pendentes (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nome_empresa     VARCHAR(200) NOT NULL,
  categoria        VARCHAR(60)  NOT NULL,
  subcategoria_slug VARCHAR(80) NOT NULL DEFAULT '',
  responsavel      VARCHAR(120) NOT NULL,
  telefone         VARCHAR(20)  NOT NULL,
  whatsapp         VARCHAR(20)  NOT NULL DEFAULT '',
  email            VARCHAR(190) NOT NULL,
  endereco         VARCHAR(250) NOT NULL DEFAULT '',
  descricao        VARCHAR(1000) NOT NULL DEFAULT '',
  status           ENUM('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'pendente',
  ip_hash          CHAR(64) NOT NULL DEFAULT '',
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cp_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Limite de requisições (anti-abuso) e tentativas de login.
CREATE TABLE IF NOT EXISTS rate_limit (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  chave      VARCHAR(100) NOT NULL,
  criado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rl (chave, criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Parceiros dos micro-sistemas: imobiliárias (Imóveis) e garagens/lojas (Veículos).
CREATE TABLE IF NOT EXISTS parceiros (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tipo        ENUM('imobiliaria','garagem') NOT NULL,
  slug        VARCHAR(120) NOT NULL,
  nome        VARCHAR(160) NOT NULL,
  whatsapp    VARCHAR(20) NOT NULL,
  ativo       TINYINT(1) NOT NULL DEFAULT 1,
  demo        TINYINT(1) NOT NULL DEFAULT 0,
  criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_parceiro (tipo, slug),
  KEY idx_parceiro_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Profissionais de saúde (nutricionistas, personal, academias, psicólogos, psiquiatras).
CREATE TABLE IF NOT EXISTS profissionais_saude (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tipo          ENUM('nutricionista','personal','academia','psicologo','psiquiatra') NOT NULL,
  slug          VARCHAR(120) NOT NULL UNIQUE,
  nome          VARCHAR(160) NOT NULL,
  especialidade VARCHAR(160) NOT NULL DEFAULT '',
  endereco      VARCHAR(200) NOT NULL DEFAULT '',
  whatsapp      VARCHAR(20) NOT NULL,
  instagram     VARCHAR(80) NOT NULL DEFAULT '',
  maps_url      VARCHAR(300) NOT NULL DEFAULT '',
  ativo         TINYINT(1) NOT NULL DEFAULT 1,
  demo          TINYINT(1) NOT NULL DEFAULT 0,
  criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_prof_tipo (tipo, ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cliques nos funis (só contagem: sistema, parceiro e intenção; nenhum dado do perfil do cliente).
CREATE TABLE IF NOT EXISTS cliques (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sistema       VARCHAR(20) NOT NULL,
  parceiro_slug VARCHAR(120) NOT NULL,
  intencao      VARCHAR(30) NOT NULL DEFAULT '',
  ip_hash       CHAR(64) NOT NULL,
  criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cl_sistema (sistema, criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
