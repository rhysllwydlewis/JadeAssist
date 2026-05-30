import { Router } from 'express';

const router = Router();

router.options('/', (_req, res) => res.sendStatus(204));
router.get('/', (_req, res) => res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED' }));
router.head('/', (_req, res) => res.status(405).end());

export default router;
