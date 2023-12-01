import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import CountryControllers from '../../../controllers/country.controller';
import auth from '../../../auth/validate-request';
const router = express.Router();

router.get(
    '/countries',
    auth.validateToken(),
    AsyncFunction(CountryControllers.getCountries)
);

router.get(
    '/timezone',
    auth.validateToken(),
    AsyncFunction(CountryControllers.getTimeZone)
);

export default router;
