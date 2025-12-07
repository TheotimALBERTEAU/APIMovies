const jwt = require('jsonwebtoken');
const { httpApiResponse } = require('./http-library');
const { logger } = require('../core/logger');

// La clé
const SECRET_JWT = "AZERTY";

module.exports = {

    middlewareVerifyToken : (request, response, next) => {
        /* #swagger.security = [{
            "bearerAuth": []
        }] */

        // Verifier que le header authorization n'est pas null
        if (!request.headers.authorization){
            return httpApiResponse(response, "740", `Veuillez envoyer un token`, null);
        }

        logger.info(`Token before extract : ${JSON.stringify(request.headers.authorization)}`);

        const token = request.headers.authorization.substring(7);

        logger.info(`Token after extract : ${token}`);

        // Version 1 : Faux par defaut
        //let result = false;
        // Version 2 : Vrai par defaut
        let result = true;
        try {
            jwt.verify(token, SECRET_JWT);
            // 1 : Quand ca marche c'est vrai
            //result = true;
        }
        catch (e){
            // Version 2 : Si ca marche : pas faux
            result = false;
        }

        // Erreur token invalide
        if (!result){
            return httpApiResponse(response, "756", `Le token n'est pas valide`, null);
        }

        return next();
    }

}