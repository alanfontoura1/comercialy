const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function register(req, res, next) {
  try {
    const { name, email, password, tenantName } = req.body;

    if (!name || !email || !password || !tenantName) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, email, password, tenantName' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const slug = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + uuidv4().slice(0, 6);
      const { rows: [tenant] } = await client.query(
        `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, name, slug`,
        [tenantName, slug]
      );

      const hash = await bcrypt.hash(password, 12);
      const { rows: [user] } = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, name, role)
         VALUES ($1, $2, $3, $4, 'admin') RETURNING id, name, email, role, tenant_id`,
        [tenant.id, email.toLowerCase(), hash, name]
      );

      await client.query('COMMIT');

      const token = signToken({ userId: user.id, tenantId: tenant.id, role: user.role });
      res.status(201).json({ token, user: { ...user, tenantId: user.tenant_id } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.active, u.tenant_id
       FROM users u WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = rows[0];

    if (!user.active) {
      return res.status(403).json({ error: 'Conta desativada' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = signToken({ userId: user.id, tenantId: user.tenant_id, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.tenant_id,
              t.name AS tenant_name, t.slug, t.plan
       FROM users u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [req.user.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    const u = rows[0];
    res.json({ id: u.id, name: u.name, email: u.email, role: u.role, tenantId: u.tenant_id,
               tenant: { name: u.tenant_name, slug: u.slug, plan: u.plan } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
