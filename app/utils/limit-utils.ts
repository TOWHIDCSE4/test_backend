export const arrayLimit =
    (limit = 3) =>
    (val: any[] | string) => {
        return val.length <= limit;
    };
