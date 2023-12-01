import config from 'config';
import { RoleHMPType } from './cms-hmp-sdk.controller';

const HAMIA_MEET_PLUS_URL =
    process.env.HAMIA_MEET_PLUS_URI ||
    config.get('services.hamia_meet_plus.url');

export default class CMSHamiaMeetPlusInfoController {
    public static async generateLinkHMP(
        type: any,
        roomId: any,
        userName: string,
        password: string
    ) {
        let linkHMP = '';
        let displayName = userName;
        if (type == RoleHMPType.STUDENT) {
            displayName = 'Student_' + userName;
        } else if (type == RoleHMPType.TEACHER) {
            displayName = 'Teacher_' + userName;
        }
        if (roomId && userName && password) {
            linkHMP =
                HAMIA_MEET_PLUS_URL +
                '/' +
                roomId +
                '?userId=' +
                userName +
                '&pwd=' +
                password +
                '&headless=true&displayName=' +
                displayName;
        }
        return linkHMP;
    }
}
