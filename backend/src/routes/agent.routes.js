const { Router } = require('express');
const { list, create, update, remove } = require('../controllers/agent.controller');

const router = Router();
router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
