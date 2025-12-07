const { logger } = require('./logger');

// Utilisez module.exports pour exporter toutes les fonctions
module.exports = {

    buildAPIResponse : (code, message, data) => {
        // Log
        logger.info(`Code : ${code} - Message : ${message}`);

        return { code: code, message: message, data: data };
    },

    slugify: (text) => {
        return text
            .toString().toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-');
    },
};