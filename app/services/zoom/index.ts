import { BadRequestError } from '../../core/ApiError';
import { getZoomAccessToken } from '../../auth/auth-utils';
import config from 'config';
import axios from 'axios';

const ZOOM_API_URL = config.get('services.zoom.api_url');

export default class ZoomServies {
    /*
     * Summary: Tao mot user Zoom moi cho giao vien
     * Parameters: - email: Email de dang ky tai khoan zoom
     *             - first_name: Ten
     *             - last_name: Ho
     * Return: User ID cua tai khoan Zoom moi
     */
    public static async addUser(
        email: string,
        first_name: string,
        last_name: string
    ): Promise<string> {
        try {
            const token = getZoomAccessToken();
            const headers = {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            };
            const user_action = {
                action: 'create',
                user_info: {
                    email,
                    type: 1,
                    first_name,
                    last_name
                }
            };
            const route = `${ZOOM_API_URL}/users`;
            const response = await axios({
                method: 'post',
                url: route,
                data: user_action,
                headers
            });
            const zoom_user = response.data;
            return zoom_user.id;
        } catch (err) {
            throw new BadRequestError(err.message);
        }
    }

    /*
     * Summary: Create a zoom meeting for lesson
     * Parameters: - topic: lesson name
     *             - start_time: The time this meeting will start (Date format)
     *             - course_name: course name
     *             - zoom_user_id: Teacher's zoom id
     *             - password: This zoom meeting's password
     * Return: Zoom meeting information
     */
    public static async createMeeting(
        topic: string,
        start_time: Date,
        duration: number,
        course_name: string,
        zoom_user_id: string,
        password?: string
    ) {
        try {
            const token = getZoomAccessToken();
            const headers = {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            };
            const meeting_info = {
                topic,
                type: 2,
                start_time,
                duration,
                password,
                agenda: 'A lesson in course ' + course_name,
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: true,
                    mute_upon_entry: false,
                    auto_recording: 'local',
                    approval_type: 0,
                    registrants_email_notification: true
                }
            };
            const route = `${ZOOM_API_URL}/users/${zoom_user_id}/meetings`;
            const response = await axios({
                method: 'post',
                url: route,
                data: meeting_info,
                headers
            });
            return response.data;
        } catch (err) {
            throw new BadRequestError(err.message);
        }
    }
}
