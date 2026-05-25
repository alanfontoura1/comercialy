const { Router } = require('express');
const c = require('../controllers/agendamento.controller');

const router = Router();

router.get('/slots', c.getSlots);
router.get('/slots-week', c.getSlotsWeek);
router.get('/', c.list);
router.post('/', c.create);
router.patch('/:id', c.update);
router.delete('/:id', c.cancelar);

module.exports = router;
