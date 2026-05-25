const pool = require('../config/database');
const path = require('path');
const fs = require('fs');

async function list(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT * FROM clinicas ORDER BY nome`);
    res.json({ data: rows });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT c.*,
        COALESCE(json_agg(p.*) FILTER (WHERE p.id IS NOT NULL), '[]') AS procedimentos
       FROM clinicas c
       LEFT JOIN procedimentos p ON p.clinica_id = c.id AND p.ativo = true
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Clinica nao encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const {
      nome, nome_dra, nome_atendente, instagram, tom,
      horario_inicio, horario_fim, atendente_24h, funciona_domingo,
      cobra_consulta, valor_consulta, consulta_abate, chave_pix,
      follow_up_manha, follow_up_tarde, follow_up_noite,
      webhook_url, whatsapp_instance, grupo_notificacao
    } = req.body;

    if (!nome) return res.status(400).json({ error: 'nome e obrigatorio' });

    const { rows: [clinica] } = await pool.query(
      `INSERT INTO clinicas (nome, nome_dra, nome_atendente, instagram, tom,
        horario_inicio, horario_fim, atendente_24h, funciona_domingo,
        cobra_consulta, valor_consulta, consulta_abate, chave_pix,
        follow_up_manha, follow_up_tarde, follow_up_noite,
        webhook_url, whatsapp_instance, grupo_notificacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [nome, nome_dra, nome_atendente, instagram, tom,
        horario_inicio || '08:00', horario_fim || '18:00',
        atendente_24h || false, funciona_domingo || false,
        cobra_consulta || false, valor_consulta || null,
        consulta_abate || false, chave_pix,
        follow_up_manha || '09:00', follow_up_tarde || '14:00', follow_up_noite || '19:00',
        webhook_url, whatsapp_instance, grupo_notificacao]
    );
    res.status(201).json(clinica);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const fields = req.body;
    const keys = Object.keys(fields).filter(k => k !== 'id' && k !== 'created_at');
    if (keys.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
    const values = keys.map(k => fields[k]);

    const { rows: [clinica] } = await pool.query(
      `UPDATE clinicas SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    if (!clinica) return res.status(404).json({ error: 'Clinica nao encontrada' });
    res.json(clinica);
  } catch (err) { next(err); }
}

async function getSetup(req, res, next) {
  try {
    const { id } = req.params;

    const [clinicaResult, procResult, entradaResult, modeloResult, instagramResult] = await Promise.all([
      pool.query(`SELECT * FROM clinicas WHERE id = $1`, [id]),
      pool.query(`SELECT * FROM procedimentos WHERE clinica_id = $1 ORDER BY nome`, [id]),
      pool.query(`SELECT * FROM procedimentos_entrada WHERE clinica_id = $1 ORDER BY nome`, [id]),
      pool.query(`SELECT * FROM paciente_modelo WHERE clinica_id = $1 LIMIT 1`, [id]),
      pool.query(`SELECT * FROM conteudos_instagram WHERE clinica_id = $1 ORDER BY created_at DESC`, [id]),
    ]);

    if (!clinicaResult.rows[0]) return res.status(404).json({ error: 'Clinica nao encontrada' });

    res.json({
      clinica: clinicaResult.rows[0],
      procedimentos: procResult.rows,
      procedimentos_entrada: entradaResult.rows,
      paciente_modelo: modeloResult.rows[0] || null,
      conteudos_instagram: instagramResult.rows,
    });
  } catch (err) { next(err); }
}

async function saveSetup(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { clinica, procedimentos, procedimentos_entrada, paciente_modelo } = req.body;

    await client.query('BEGIN');

    // Upsert clinica fields
    if (clinica && Object.keys(clinica).length > 0) {
      const keys = Object.keys(clinica).filter(k => k !== 'id' && k !== 'created_at');
      if (keys.length > 0) {
        const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
        const values = keys.map(k => clinica[k]);
        await client.query(
          `UPDATE clinicas SET ${setClause}, updated_at = NOW() WHERE id = $1`,
          [id, ...values]
        );
      }
    }

    // Delete and reinsert procedimentos
    if (Array.isArray(procedimentos)) {
      await client.query(`DELETE FROM procedimentos WHERE clinica_id = $1`, [id]);
      for (const p of procedimentos) {
        await client.query(
          `INSERT INTO procedimentos (clinica_id, nome, duracao_minutos, valor_inteiro, valor_parcelado, parcelas, desconto_vista, publico_ideal, contraindicacoes, ativo)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [id, p.nome, p.duracao_minutos || 60, p.valor_inteiro, p.valor_parcelado, p.parcelas || 1, p.desconto_vista, p.publico_ideal, p.contraindicacoes, p.ativo !== false]
        );
      }
    }

    // Delete and reinsert procedimentos_entrada
    if (Array.isArray(procedimentos_entrada)) {
      await client.query(`DELETE FROM procedimentos_entrada WHERE clinica_id = $1`, [id]);
      for (const pe of procedimentos_entrada) {
        if (!pe.nome) continue;
        await client.query(
          `INSERT INTO procedimentos_entrada (clinica_id, nome, valor_inteiro, valor_parcelado, parcelas)
           VALUES ($1,$2,$3,$4,$5)`,
          [id, pe.nome, pe.valor_inteiro || null, pe.valor_parcelado || null, pe.parcelas || 1]
        );
      }
    }

    // Delete and reinsert conteudos_instagram (if sent)
    const { conteudos_instagram } = req.body;
    if (Array.isArray(conteudos_instagram)) {
      await client.query(`DELETE FROM conteudos_instagram WHERE clinica_id = $1`, [id]);
      for (const url of conteudos_instagram) {
        if (!url) continue;
        await client.query(`INSERT INTO conteudos_instagram (clinica_id, link) VALUES ($1,$2)`, [id, url]);
      }
    }

    // Upsert paciente_modelo
    if (paciente_modelo) {
      const existing = await client.query(`SELECT id FROM paciente_modelo WHERE clinica_id = $1`, [id]);
      if (existing.rows[0]) {
        await client.query(
          `UPDATE paciente_modelo SET ativo=$2, valor_minimo_interesse=$3, procedimentos_ids=$4, descricao=$5 WHERE clinica_id=$1`,
          [id, paciente_modelo.ativo !== false, paciente_modelo.valor_minimo_interesse, paciente_modelo.procedimentos_ids, paciente_modelo.descricao]
        );
      } else {
        await client.query(
          `INSERT INTO paciente_modelo (clinica_id, ativo, valor_minimo_interesse, procedimentos_ids, descricao)
           VALUES ($1,$2,$3,$4,$5)`,
          [id, paciente_modelo.ativo !== false, paciente_modelo.valor_minimo_interesse, paciente_modelo.procedimentos_ids, paciente_modelo.descricao]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Setup salvo com sucesso' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function uploadBriefing(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo nao enviado' });

    const filePath = req.file.path;
    const originalName = req.file.originalname || '';
    const ext = path.extname(originalName).toLowerCase();

    let texto = '';

    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      texto = data.text;
    } else if (ext === '.docx' || ext === '.doc') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      texto = result.value;
    } else {
      texto = fs.readFileSync(filePath, 'utf8');
    }

    // Clean up temp file
    try { fs.unlinkSync(filePath); } catch (_) {}

    // Extract campos_sugeridos via simple regex/keyword search
    const campos_sugeridos = {};

    const nomeMatch = texto.match(/(?:nome da cl[iI]nica|cl[iI]nica|nome)[\s:]+([^\n,]+)/i);
    if (nomeMatch) campos_sugeridos.nome = nomeMatch[1].trim();

    const draMatch = texto.match(/(?:doutora?|dra?\.?)[\s:]+([^\n,]+)/i);
    if (draMatch) campos_sugeridos.nome_dra = draMatch[1].trim();

    const instagramMatch = texto.match(/@[\w.]+/i);
    if (instagramMatch) campos_sugeridos.instagram = instagramMatch[0];

    const procedimentosMatch = texto.match(/(?:procedimentos?|tratamentos?)[\s:]+([^\n]+(?:\n[^\n]+){0,5})/i);
    if (procedimentosMatch) campos_sugeridos.procedimentos = procedimentosMatch[1].trim();

    const valorMatch = texto.match(/R\$\s*[\d.,]+/g);
    if (valorMatch) campos_sugeridos.valores = valorMatch.slice(0, 5);

    const pixMatch = texto.match(/(?:pix|chave pix)[\s:]+([^\n,]+)/i);
    if (pixMatch) campos_sugeridos.chave_pix = pixMatch[1].trim();

    res.json({ texto, campos_sugeridos });
  } catch (err) { next(err); }
}

async function toggleIa(req, res, next) {
  try {
    const { id } = req.params;
    const { rows: [clinica] } = await pool.query(
      `UPDATE clinicas SET ia_ativa = NOT ia_ativa, updated_at = NOW() WHERE id = $1 RETURNING id, nome, ia_ativa`,
      [id]
    );
    if (!clinica) return res.status(404).json({ error: 'Clinica nao encontrada' });
    res.json(clinica);
  } catch (err) { next(err); }
}

async function deleteClinica(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    // Delete all dependent tables in order
    await client.query(`DELETE FROM conversation_analysis WHERE clinica_id = $1`, [id]);
    await client.query(`DELETE FROM mensagens WHERE clinica_id = $1`, [id]);
    await client.query(`DELETE FROM agendamentos WHERE clinica_id = $1`, [id]);
    await client.query(`DELETE FROM leads WHERE clinica_id = $1`, [id]);
    await client.query(`DELETE FROM procedimentos WHERE clinica_id = $1`, [id]);
    await client.query(`DELETE FROM procedimentos_entrada WHERE clinica_id = $1`, [id]);
    await client.query(`DELETE FROM paciente_modelo WHERE clinica_id = $1`, [id]);
    await client.query(`DELETE FROM conteudos_instagram WHERE clinica_id = $1`, [id]);
    const { rowCount } = await client.query(`DELETE FROM clinicas WHERE id = $1`, [id]);
    if (!rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Clinica nao encontrada' }); }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { list, getById, create, update, getSetup, saveSetup, uploadBriefing, toggleIa, deleteClinica };
