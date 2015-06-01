// Native Express API
var api = require('./handlers/api.js');

module.exports = function(app){

    app.get('/api/attractions', api.getAttractionList);
    app.post('/api/attraction', api.addAttraction);
    app.get('/api/attraction/:id', api.getAttraction);


    //...

};
