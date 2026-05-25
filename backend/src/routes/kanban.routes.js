const { Router } = require('express');
const c = require('../controllers/kanban.controller');

const router = Router();

router.get('/', c.getBoard);
router.patch('/:leadId/mover', c.moverCard);

module.exports = router;
