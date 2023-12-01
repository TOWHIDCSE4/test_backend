const config = {
    apps: getApps()
};

function getApps() {
    const NUMBER_OF_APPS = process.env.NUMBER_OF_APPS || 1;
    const NODE_ENV = process.env.NODE_ENV || 'development';
    const BASE_PORT = process.env.BASE_PORT || 5501;
    const apps = [];

    for (let i = 0; i < NUMBER_OF_APPS; i++) {
        const app = {
            name: 'ispeak-backend' + '-' + NODE_ENV + '-' + i,
            script: 'build/index.js',
            env: {
                NODE_ENV: NODE_ENV,
                PORT: parseInt(BASE_PORT) + i
            },
            exec_mode: 'fork',
            log_date_format: 'YYYY-MM-DD HH:mm Z'
        };
        apps.push(app);
    }

    return apps;
}

module.exports = config;
