const { Router } = require('express');

const router = Router();

router.get('/google/callback', (req, res) => res.json({ message: 'google callback - em breve' }));

module.exports = router;
