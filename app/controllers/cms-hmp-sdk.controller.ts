import { Directus } from '@directus/sdk';
import config from 'config';
import crypto from 'crypto';
import SkypeMeetingPoolController from './skype-meeting-pool.controller';

const logger = require('dy-logger');
const CMS_DIRECTUS_URL: any =
    process.env.CMS_DIRECTUS_URI || config.get('services.cms_directus.url');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const directus = new Directus(CMS_DIRECTUS_URL);
const ORG_ID = 1;
const CmsUser = directus.items('SUser');
const CmsRoom = directus.items('Room');
const CmsUserRoom = directus.items('UserRoom');
const CmsUserRoomToken = directus.items('UserRoomToken');
const CmsRoomSchedule = directus.items('RoomSchedule');

export enum RoomRoleID {
    admin = 1,
    moderator = 2,
    presenter = 3,
    normal = 4
}

export enum RoleHMPType {
    STUDENT = 1,
    TEACHER = 2
}

export default class CMSHamiaMeetPlusSDKController {
    public static async login() {
        await directus.auth.login({
            email: 'admin@vidconf.com',
            password: 'v1dc0nftus'
        });
        return true;
    }

    public static async createUser(user_name: string) {
        // try{
        logger.info('start create cms user >>>');
        if (!user_name) {
            return null;
        }
        const checkUserExit: any = await CmsUser.readByQuery({
            filter: {
                username: user_name,
                org_id: ORG_ID
            }
        });
        logger.info('checkExsits data: ' + JSON.stringify(checkUserExit));
        if (!checkUserExit?.data || checkUserExit?.data.length == 0) {
            const data = await CmsUser.createOne({
                status: 'published',
                username: user_name,
                org_id: ORG_ID
            });
            logger.info('end create cms user <<<');
            return data;
        } else {
            logger.info('user is exists, no create');
            return checkUserExit?.data[0];
        }
        // }catch(err:any){
        //     logger.error('create cms user error: ' + err.message)
        //     return null
        // }
    }

    public static async createRoom(desc: string, room_name: string) {
        // try{
        logger.info('start create cms room >>>');
        if (!room_name) {
            return null;
        }
        const checkRoomExit: any = await CmsRoom.readByQuery({
            filter: {
                room_name,
                org_id: ORG_ID
            }
        });
        logger.info('checkExsits data room: ' + JSON.stringify(checkRoomExit));
        if (!checkRoomExit?.data || checkRoomExit?.data.length == 0) {
            const data = await CmsRoom.createOne({
                status: 'published',
                is_repeated: true,
                desc,
                room_name,
                org_id: ORG_ID
            });
            logger.info('end create cms room <<<');
            return data;
        } else {
            logger.info('room is exists, no create');
            return checkRoomExit?.data[0];
        }
        // }catch(err:any){
        //     logger.error('create cms room error: ' + err.message)
        //     return null
        // }
    }

    public static async createUserRoom(
        user_id: any,
        room_id: any,
        role_id: any
    ) {
        // try{
        logger.info('start create cms UserRoom >>>');
        if (!user_id || !room_id) {
            return null;
        }
        const checkUserRoomExit: any = await CmsUserRoom.readByQuery({
            filter: {
                user_id: parseInt(user_id as string),
                room_id: parseInt(room_id as string),
                role_id: parseInt(role_id as string)
            }
        });
        logger.info(
            'checkExsits data user room: ' + JSON.stringify(checkUserRoomExit)
        );
        if (!checkUserRoomExit?.data || checkUserRoomExit?.data.length == 0) {
            const data = await CmsUserRoom.createOne({
                status: 'published',
                user_id: parseInt(user_id as string),
                room_id: parseInt(room_id as string),
                role_id: parseInt(role_id as string)
            });
            logger.info('end create cms UserRoom <<<');
            return data;
        } else {
            logger.info('user room is exists, no create');
            return checkUserRoomExit?.data[0];
        }
        // }catch(err:any){
        //     logger.error('create cms UserRoom error: ' + err.message)
        //     return null
        // }
    }

    public static async createUserRoomToken(
        username: string,
        user_room_id: any
    ) {
        // try{
        logger.info('start create cms UserRoomToken >>>');
        if (!username || !user_room_id) {
            return null;
        }
        const checkUserRoomTokenExit: any = await CmsUserRoomToken.readByQuery({
            filter: {
                user_room_id: parseInt(user_room_id as string)
            }
        });
        logger.info(
            'checkExsits data user room token: ' +
                JSON.stringify(checkUserRoomTokenExit)
        );
        if (
            !checkUserRoomTokenExit?.data ||
            checkUserRoomTokenExit?.data.length == 0
        ) {
            const hashString = await SkypeMeetingPoolController.randomCode(8);
            const tokenGenarate = username + '_' + hashString;
            const data = await CmsUserRoomToken.createOne({
                status: 'published',
                token: tokenGenarate,
                user_room_id: parseInt(user_room_id as string)
            });
            logger.info('end create cms UserRoomToken <<<');
            return data;
        } else {
            logger.info('user room token is exists, no create');
            return checkUserRoomTokenExit?.data[0];
        }
        // }catch(err:any){
        //     logger.error('create cms UserRoomToken error: ' + err.message)
        //     return null
        // }
    }

    public static async createRoomSchedule(
        room_id: any,
        begin_time: any,
        end_time: any
    ) {
        // try{
        logger.info('start create cms RoomSchedule >>>');
        if (!room_id || !begin_time || !end_time) {
            return null;
        }
        const checkRoomScheduleExit: any = await CmsRoomSchedule.readByQuery({
            filter: {
                room_id: parseInt(room_id as string),
                begin_time,
                end_time
            }
        });
        logger.info(
            'checkExsits data user room schedule: ' +
                JSON.stringify(checkRoomScheduleExit)
        );
        if (
            !checkRoomScheduleExit?.data ||
            checkRoomScheduleExit?.data.length == 0
        ) {
            const data = await CmsRoomSchedule.createOne({
                status: 'published',
                room_id: parseInt(room_id as string),
                begin_time,
                end_time
            });
            logger.info('end create cms RoomSchedule <<<');
            return data;
        } else {
            logger.info('room schedule is exists, no create');
            return checkRoomScheduleExit?.data[0];
        }
        // }catch(err:any){
        //     logger.error('create cms RoomSchedule error: ' + err.message)
        //     return null
        // }
    }
}
