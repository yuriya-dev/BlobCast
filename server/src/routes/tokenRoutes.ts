import { Router } from 'express';
import { getTickerChartData } from '../controllers/tokenController';

const router = Router();

// GET /api/tokens/:ticker/chart - Fetch token metadata and historical charts from GeckoTerminal
router.get('/:ticker/chart', getTickerChartData);

export default router;
