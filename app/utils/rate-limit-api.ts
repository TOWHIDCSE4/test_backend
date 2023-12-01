import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
    windowMs: 10 * 1000, // 15 minutes
    max: 3, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false
});

export default limiter;
