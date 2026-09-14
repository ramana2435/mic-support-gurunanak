import { Router } from 'express';
import authRoutes from './auth.routes';
import sessionRoutes from './session.routes';
import healthRoutes from './health.routes';
import monitoringRoutes from './monitoring.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/sessions', sessionRoutes);
router.use('/monitoring', monitoringRoutes);

export default router;
