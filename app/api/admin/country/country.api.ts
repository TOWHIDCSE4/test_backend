import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import CountryControllers from '../../../controllers/country.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';
const router = express.Router();

router.get(
    '/admin/countries',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.srs_update, PERMISSIONS.sas_create]),
    AsyncFunction(CountryControllers.getCountries)
);

router.get(
    '/admin/timezone',
    auth.validateToken(),
    AsyncFunction(CountryControllers.getTimeZone)
);

export default router;
