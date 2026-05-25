const { Router } = require('express');
const { list, getMessages, toggleAI } = require('../controllers/conversation.controller');

const router = Router();
router.get('/', list);
router.get('/:id/messages', getMessages);
router.patch('/:id/toggle-ai', toggleAI);

module.exports = router;
