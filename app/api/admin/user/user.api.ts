import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import OrderedPackageControllers from '../../../controllers/ordered-package.controller';
import UserControllers from '../../../controllers/user.controller';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();
router.get(
    '/admin/users/teachers',
    auth.validateToken(),
    AsyncFunction(UserControllers.getTeacherByActiveStatus)
);

router.get(
    '/admin/users/students',
    auth.validateToken(),
    AsyncFunction(UserControllers.getAllStudentsByAdmin)
);

router.get(
    '/admin/users/all-students-of-supported',
    auth.validateToken(),
    AsyncFunction(UserControllers.getAllStudentBySupporter)
);

router.get(
    '/admin/users/search',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tmeh_view,
        PERMISSIONS.tmhh_view,
        PERMISSIONS.tmrr_view,
        PERMISSIONS.tmer_view,
        PERMISSIONS.sca_view,
        PERMISSIONS.ssw_view,
        PERMISSIONS.csmcr_view,
        PERMISSIONS.amcr_view,
        PERMISSIONS.wmdm_view,
        PERMISSIONS.omao_create_trial,
        PERMISSIONS.ompo_create_order,
        PERMISSIONS.t2scr_view,
        PERMISSIONS.csrc_view
    ]),
    AsyncFunction(UserControllers.getUsersByString)
);

router.post(
    '/admin/users',
    auth.validateToken(),
    AsyncFunction(UserControllers.createUserAdminRequest)
);

router.put(
    '/admin/users/:user_id',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.tat_edit_regular,
        PERMISSIONS.srs_update,
        PERMISSIONS.srs_edit_regular,
        PERMISSIONS.sas_update,
        PERMISSIONS.sas_edit_regular
    ]),
    AsyncFunction(UserControllers.editUserByAdmin)
);

/* Admin get the user info of 1 user */
router.get(
    '/admin/users/:user_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.asasm_update]),
    AsyncFunction(UserControllers.getFullInfoUserByAdmin)
);

router.get(
    '/admin/users/:user_id/regular_times',
    auth.validateToken(),
    AsyncFunction(UserControllers.getUserRegularTimesByAdmin)
);

router.get(
    '/admin/users/:user_id/ordered-packages',
    auth.validateToken(),
    AsyncFunction(
        OrderedPackageControllers.getAllOrderedPackagesOfAnUserByAdmin
    )
);

router.get(
    '/admin/users/:user_id/count-active-ordered-packages',
    auth.validateToken(),
    AsyncFunction(
        OrderedPackageControllers.getCountActiveOrderedPackagesWithTypeOfAStudent
    )
);

router.get(
    '/admin/users/admin-view/:user_id',
    auth.validateToken(),
    AsyncFunction(UserControllers.loginByAdmin)
);

router.get(
    '/admin/users/add-link-skype-for-student/:user_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.sas_add_link_skype]),
    AsyncFunction(UserControllers.addLinkSkypeForStudent)
);

router.get(
    '/admin/zalo-interaction/send-message-interactive-to-all-student',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.zlrzi_view]),
    AsyncFunction(UserControllers.sendMessageInteractiveToAllStudent)
);

export default router;
