import api from './api';

function loadSwagger() {
    "use strict"; // Start of use strict

    import(/* webpackChunkName: "swagger" */ 'swagger-ui').then(swagger => {
        swagger.default({
            url: api.baseUrl,
            dom_id: '#swagger'
        });
    });
}

export default {
    loadSwagger: loadSwagger
}