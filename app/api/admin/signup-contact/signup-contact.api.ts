import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import ContactController from '../../../controllers/contact.controller';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/signup-contacts',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.mmi_view]),
    AsyncFunction(ContactController.getContacts)
);

router.put(
    '/signup-contacts/:_id',
    auth.validateToken(),
    AsyncFunction(ContactController.updateContact)
);

export default router;
