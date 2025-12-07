const { logger } = require('./logger');

module.exports = {

    buildAPIResponse : (code, message, data) => {
        // Log
        logger.info(`Code : ${code} - Message : ${message}`);

        return { code: code, message: message, data: data };
    },
}