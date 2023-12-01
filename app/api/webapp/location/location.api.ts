import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import LocationControllers from '../../../controllers/location.controller';
import auth from '../../../auth/validate-request';
const router = express.Router();

router.get('/locations', AsyncFunction(LocationControllers.getLocations));

export default router;
