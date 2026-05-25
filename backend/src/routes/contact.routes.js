const { Router } = require('express');
const { list, upsert } = require('../controllers/contact.controller');

const router = Router();
router.get('/', list);
router.post('/', upsert);

module.exports = router;
