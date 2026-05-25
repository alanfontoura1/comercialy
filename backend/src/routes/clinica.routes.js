const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const c = require('../controllers/clinica.controller');

const router = Router();
const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.getById);
router.put('/:id', c.update);
router.get('/:id/setup', c.getSetup);
router.post('/:id/setup', c.saveSetup);
router.post('/:id/briefing', upload.single('arquivo'), c.uploadBriefing);
router.patch('/:id/toggle-ia', c.toggleIa);
router.delete('/:id', c.deleteClinica);

module.exports = router;
