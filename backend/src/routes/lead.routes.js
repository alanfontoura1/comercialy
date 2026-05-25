const { Router } = require('express');
const c = require('../controllers/lead.controller');

const router = Router();

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.getById);
router.patch('/:id', c.update);
router.patch('/:id/status', c.updateStatus);
router.patch('/:id/bloquear', c.toggleBloqueio);
router.patch('/:id/ia-pausa', c.toggleIaPausa);
router.get('/:id/mensagens', c.getMensagens);
router.post('/:id/mensagens', c.addMensagem);
router.get('/:id/analysis', c.getAnalysis);
router.post('/:id/analysis', c.runAnalysis);

module.exports = router;
