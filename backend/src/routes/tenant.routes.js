const { Router } = require('express');

const router = Router();

router.get('/', (req, res) => res.json({ message: 'tenants - em breve' }));

module.exports = router;
