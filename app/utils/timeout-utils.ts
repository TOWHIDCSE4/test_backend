export const delay = (after: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, after);
    });
};

export const interval = async (func: any, delayTime: number) => {
    await func();
    await delay(delayTime);
    await interval(func, delayTime);
};
