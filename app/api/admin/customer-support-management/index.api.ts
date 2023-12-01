import StudentManagement from './students-management.api';
import Dashboard from './dashboard.api';
import express from 'express';
const router = express.Router();

router.use('/', StudentManagement);
router.use('/', Dashboard);

export default router;
