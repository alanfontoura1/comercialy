const { Router } = require('express');
const { list, create, getQRCode, getStatus } = require('../controllers/whatsapp.controller');

const router = Router();
router.get('/', list);
router.post('/', create);
router.get('/:id/qrcode', getQRCode);
router.get('/:id/status', getStatus);

module.exports = router;
