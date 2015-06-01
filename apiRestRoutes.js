
// Connect-rest API
var api = require('./handlers/apirest.js');

module.exports = function(rest){

//    app.get('/api/attractions', api.getAttractionList);
//    app.post('/api/attraction', api.addAttraction);
//    app.get('/api/attraction/:id', api.getAttraction);

    rest.get('/api/attractions', api.getAttractionList);
    rest.post('/api/attraction', api.addAttraction);
    rest.get('/api/attraction/:id', api.getAttraction);


    //...

};
