const { Router } = require('express');
const { handleEvolution } = require('../controllers/webhook.controller');

const router = Router();
router.post('/evolution', handleEvolution);

module.exports = router;
