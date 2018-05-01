import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.render('index', { title: 'My awesome new app' }));

export default router;
