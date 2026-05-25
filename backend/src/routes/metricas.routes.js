const { Router } = require('express');
const c = require('../controllers/metricas.controller');

const router = Router();

router.get('/resumo', c.getResumo);
router.get('/funil', c.getFunil);
router.get('/atividade', c.getAtividade);

module.exports = router;
