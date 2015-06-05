var main = require('./handlers/main.js');
var tours = require('./handlers/tours.js');
var vacations = require('./handlers/vacations.js');
var newsletter = require('./handlers/newsletter.js');
var tests = require('./handlers/tests.js');
var photocomp = require('./handlers/photocomp.js');

module.exports = function(app){

    app.get('/', main.home);
    app.get('/about', main.about);
    app.get('/tours/hood-river', tours.hoodRiver);
    app.get('/tours/request-group-rate', tours.requestGroupRate);         
    app.get('/set-currency/:currency', vacations.setCurrency);
    app.get('/vacations', vacations.vacations);
    app.get('/notify-me-when-in-season', vacations.notifyMe);
    app.post('/notify-me-when-in-season', vacations.notifyMeForm);                   
    app.get('/newsletter', newsletter.newsletter);
    app.post('/process', newsletter.process);
    app.get('/thank-you', newsletter.thankyou);
    app.get('/jquery-test', tests.jqueryTest);
    app.get('/headers', tests.headers);
    app.post('/cart/checkout', tests.cartCheckout);
    app.get('/epic-fail', tests.epicFail);
    app.get('/contest/vacation-photo', photocomp.photoUpload);
    app.post('/contest/vacation-photo/:year/:month', photocomp.photoProcess);



    //...

};
