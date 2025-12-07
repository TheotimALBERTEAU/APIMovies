const { buildAPIResponse } = require('./helpers-library');

module.exports = {

    httpApiResponse : (response, code, message, data) => {
        return response.json(buildAPIResponse(code, message, data));
    },
}