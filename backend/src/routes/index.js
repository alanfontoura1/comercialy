const { Router } = require('express');
const auth = require('../middleware/auth');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/webhooks', require('./webhook.routes'));

router.use('/contacts', auth, require('./contact.routes'));
router.use('/conversations', auth, require('./conversation.routes'));
router.use('/agents', auth, require('./agent.routes'));
router.use('/whatsapp', auth, require('./whatsapp.routes'));
router.use('/tenants', auth, require('./tenant.routes'));
router.use('/integrations', auth, require('./integration.routes'));

router.use('/clinicas', auth, require('./clinica.routes'));
router.use('/leads', auth, require('./lead.routes'));
router.use('/kanban', auth, require('./kanban.routes'));
router.use('/metricas', auth, require('./metricas.routes'));
router.use('/agendamentos', auth, require('./agendamento.routes'));
router.use('/baileys', require('./baileys.routes'));
router.use('/google', require('./google.routes'));

module.exports = router;
