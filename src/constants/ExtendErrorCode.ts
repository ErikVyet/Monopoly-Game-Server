
export type ExtendErrorCode = 400 | 401 | 404 | 500;
export const ExtendErrorCode = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    FAILED_TO_RECONNECT: 800
};