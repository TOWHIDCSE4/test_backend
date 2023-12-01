import config from 'config';
import axios from 'axios';
import FormData from 'form-data';
import TrialBookingActions from '../../actions/trial-booking';
import OrderedPackageActions from '../../actions/ordered-package';
import UserActions from '../../actions/user';
import Booking from '../../models/booking';
import { ProtectedRequest } from 'app-request';
import {
    ENUM_MEMO_NOTE_FIELD,
    ENUM_MEMO_OTHER_NOTE_FIELD,
    IOriginMemo
} from '../../const/memo';

export default class CrmApiServices {
    public static async sendMemoTrialBookingAfterUploadVideo(
        req: ProtectedRequest,
        booking: Booking
    ) {
        try {
            const ordered_package = await OrderedPackageActions.findOne({
                id: booking.ordered_package_id
            });
            if (ordered_package) {
                const user_student = await UserActions.findOne({
                    id: booking.student_id
                });
                const user_teacher = await UserActions.findOne({
                    id: booking.teacher_id
                });

                if (user_student && user_teacher) {
                    const trial_booking = await TrialBookingActions.findOne({
                        booking_id: booking.id
                    });
                    if (!trial_booking) {
                        throw new Error(
                            req.t('errors.trial_booking.not_found')
                        );
                    }

                    if (
                        trial_booking.memo?.note.length === 0 ||
                        trial_booking.memo?.other.length === 0
                    ) {
                        throw new Error(
                            req.t('errors.trial_booking.lacks_field_to_confirm')
                        );
                    }

                    const listening = trial_booking.memo?.note.find(
                        (i: any) => i.keyword === ENUM_MEMO_NOTE_FIELD.listening
                    );

                    const speaking = trial_booking.memo?.note.find(
                        (i: any) => i.keyword === ENUM_MEMO_NOTE_FIELD.speaking
                    );

                    const vocabulary = trial_booking.memo?.note.find(
                        (i: any) =>
                            i.keyword === ENUM_MEMO_NOTE_FIELD.vocabulary
                    );

                    const grammar = trial_booking.memo?.note.find(
                        (i: any) => i.keyword === ENUM_MEMO_NOTE_FIELD.grammar
                    );

                    const strength = trial_booking.memo?.other.find(
                        (i: any) =>
                            i.keyword === ENUM_MEMO_OTHER_NOTE_FIELD.strength
                    );

                    const weakness = trial_booking.memo?.other.find(
                        (i: any) =>
                            i.keyword === ENUM_MEMO_OTHER_NOTE_FIELD.weakness
                    );

                    const record_links = booking?.record_link?.join(';') || '';

                    const form = new FormData();

                    form.append('username', user_student?.username || '');
                    form.append('teacher', user_teacher?.full_name || '');
                    form.append(
                        'level',
                        trial_booking?.memo?.student_starting_level?.name || ''
                    );
                    form.append('vc', vocabulary?.point || 5);
                    form.append('gr', grammar?.point || 5);
                    form.append('li', listening?.point || 5);
                    form.append('sp', speaking?.point || 5);
                    form.append('re', 5);
                    form.append('m1', strength?.comment || '');
                    form.append('m2', weakness?.comment || '');
                    form.append('m3', '');
                    form.append('video', record_links);

                    const api_memo_crm: any = config.get(
                        'services.api_memo_crm.url'
                    );

                    axios({
                        method: 'post',
                        url: api_memo_crm,
                        headers: {
                            ...form.getHeaders()
                        },
                        data: form
                    });
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    public static async sendMemoTrialBooking(
        booking: Booking,
        memo: IOriginMemo
    ) {
        try {
            const ordered_package = await OrderedPackageActions.findOne({
                id: booking.ordered_package_id
            });
            if (ordered_package) {
                const user_student = await UserActions.findOne({
                    id: booking.student_id
                });
                const user_teacher = await UserActions.findOne({
                    id: booking.teacher_id
                });

                if (user_student && user_teacher) {
                    const listening = memo?.note.find(
                        (i: any) => i.keyword === ENUM_MEMO_NOTE_FIELD.listening
                    );

                    const speaking = memo?.note.find(
                        (i: any) => i.keyword === ENUM_MEMO_NOTE_FIELD.speaking
                    );

                    const vocabulary = memo?.note.find(
                        (i: any) =>
                            i.keyword === ENUM_MEMO_NOTE_FIELD.vocabulary
                    );

                    const grammar = memo?.note.find(
                        (i: any) => i.keyword === ENUM_MEMO_NOTE_FIELD.grammar
                    );

                    const strength = memo?.other.find(
                        (i: any) =>
                            i.keyword === ENUM_MEMO_OTHER_NOTE_FIELD.strength
                    );

                    const weakness = memo?.other.find(
                        (i: any) =>
                            i.keyword === ENUM_MEMO_OTHER_NOTE_FIELD.weakness
                    );

                    const record_links = booking?.record_link?.join(';') || '';

                    const form = new FormData();
                    form.append('username', user_student?.username || '');
                    form.append('teacher', user_teacher?.full_name || '');
                    form.append(
                        'level',
                        memo?.student_starting_level?.name || ''
                    );
                    form.append('vc', vocabulary?.point || 5);
                    form.append('gr', grammar?.point || 5);
                    form.append('li', listening?.point || 5);
                    form.append('sp', speaking?.point || 5);
                    form.append('re', 5);
                    form.append('m1', strength?.comment || '');
                    form.append('m2', weakness?.comment || '');
                    form.append('m3', '');
                    form.append('video', record_links);

                    const api_memo_crm: any = config.get(
                        'services.api_memo_crm.url'
                    );

                    axios({
                        method: 'post',
                        url: api_memo_crm,
                        headers: {
                            ...form.getHeaders()
                        },
                        data: form
                    });
                }
            }
        } catch (error) {
            console.log(error);
        }
    }
}
