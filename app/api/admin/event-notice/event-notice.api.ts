import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import EventNoticeControllers from '../../../controllers/event-notice.controller';
import ValidationResult, {
    createEventNoticeValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/event-notices',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.saen_view]),
    AsyncFunction(EventNoticeControllers.getEventNoticeByAdmin)
);

router.post(
    '/admin/event-notices',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.saen_create]),
    createEventNoticeValidator(),
    ValidationResult(),
    AsyncFunction(EventNoticeControllers.createEventNotice)
);

router.put(
    '/admin/event-notices/:event_notice_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.saen_update]),
    AsyncFunction(EventNoticeControllers.editEventNotice)
);

router.delete(
    '/admin/event-notices/:event_notice_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.saen_delete]),
    AsyncFunction(EventNoticeControllers.removeEventNotice)
);

export default router;
