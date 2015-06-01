// TODO
//  remove commented out sections
//  cleanup handlers files and add standard comments format
//  


var express = require('express');
var fortune = require('./lib/fortune.js');
var weather = require('./lib/weather.js');
var bodyParser  = require('body-parser');
var formidable = require('formidable');
var credentials = require('./credentials.js');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
//var nodemailer = require('nodemailer');
//var htmlToText = require('nodemailer-html-to-text').htmlToText;
var http = require('http');
var fs = require('fs');
var mongoose = require('mongoose');
var mongoStore = require('connect-mongo')(expressSession);
var rest = require('connect-rest');

// import Mongoose models
// var Vacation = require('./models/vacation.js');
// var VacationInSeasonListener = require('./models/vacationInSeasonListener.js');

var app = express();

// set Nodemailer transport for sending emails
/* var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
                user: credentials.gmail.user,
                pass: credentials.gmail.password,
        }
});
transporter.use('compile', htmlToText());
*/

// set up handlebars view engine for use with main page views and email templates
var handlebars = require('express-handlebars').create({
    defaultLayout:'main',
    helpers: {
        section: function(name, options){
            if(!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        }
    }
});

//var VALID_EMAIL_REGEX = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

// setup MongoDB using Mongolabs service
// connection options
var opts = {
    server: {
       // prevent database connection errors for long-running applications
       socketOptions: { keepAlive: 1 }
    }
};
// make connection to database
switch(app.get('env')){
    case 'development':
        mongoose.connect(credentials.mongo.development.connectionString, opts);
        break;
    case 'production':
        mongoose.connect(credentials.mongo.production.connectionString, opts);
        break;
    default:
        throw new Error('Unknown execution environment: ' + app.get('env'));
}

// enter MongoDB seed data  NOTE: app-cluster means get two copies of each entry !!
/* Vacation.find(function(err, vacations){
    if(vacations.length) return;

    new Vacation({
        name: 'Hood River Day Trip',
        slug: 'hood-river-day-trip',
        category: 'Day Trip',
        sku: 'HR199',
        description: 'Spend a day sailing on the Columbia and ' +
            'enjoying craft beers in Hood River!',
        priceInCents: 9995,
        tags: ['day trip', 'hood river', 'sailing', 'windsurfing', 'breweries'],
        inSeason: true,
        maximumGuests: 16,
        available: true,
        packagesSold: 0,
    }).save();

    new Vacation({
        name: 'Oregon Coast Getaway',
        slug: 'oregon-coast-getaway',
        category: 'Weekend Getaway',
        sku: 'OC39',
        description: 'Enjoy the ocean air and quaint coastal towns!',
        priceInCents: 269995,
        tags: ['weekend getaway', 'oregon coast', 'beachcombing'],
        inSeason: false,
        maximumGuests: 8,
        available: true,
        packagesSold: 0,
   }).save();

    new Vacation({
        name: 'Rock Climbing in Bend',
        slug: 'rock-climbing-in-bend',
        category: 'Adventure',
        sku: 'B99',
        description: 'Experience the thrill of climbing in the high desert.',
        priceInCents: 289995,
        tags: ['weekend getaway', 'bend', 'high desert', 'rock climbing'],
        inSeason: true,
        requiresWaiver: true,
        maximumGuests: 4,
        available: false,
        packagesSold: 0,
        notes: 'The tour guide is currently recovering from a skiing accident.',
    }).save();
});
*/

// setup domains for resilience, to handle uncaught exceptions
app.use(function(req, res, next){
    // create a domain for this request
    var domain = require('domain').create();
    // handle errors on this domain
    domain.on('error', function(err){
        console.error('DOMAIN ERROR CAUGHT\n', err.stack);
        try {
            // failsafe shutdown in 5 seconds
            setTimeout(function(){
                console.error('Failsafe shutdown.');
                process.exit(1);
            }, 5000);
            // disconnect from the cluster
            var worker = require('cluster').worker;
            if(worker) worker.disconnect();

            // stop taking new requests
            server.close();

            try {
                // attempt to use Express error route
                next(err);
            } catch(e){
                // if Express error route failed, try
                // plain Node response
                console.error('Express error mechanism failed.\n', e.stack);
                res.statusCode = 500;
                res.setHeader('content-type', 'text/plain');
                res.end('Server error.');
            }
        } catch(e){
            console.error('Unable to send 500 response.\n', e.stack);
        }
    });

    // add the request and response objects to the domain
    domain.add(req);
    domain.add(res);

    // execute the rest of the request chain in the domain
    domain.run(next);

});

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser(credentials.cookieSecret));

// use session store running against MongoDB
app.use(expressSession({
    secret: credentials.cookieSecret,
    resave: false,
    saveUninitialized: false,
    store: new mongoStore({ mongooseConnection: mongoose.connection }),
}));

// Allow cross origin access, but to only the API routes
app.use('/api', require('cors')());

app.use(function(req, res, next){
        res.locals.showTests = app.get('env') !== 'production' &&
                req.query.test === '1';
        next();
});

app.use(function(req, res, next){
        if(!res.locals.partials) res.locals.partials = {};
        res.locals.partials.weather = weather.getWeatherData();
        next();
});

app.use(function(req, res, next){
        // if there's a flash message, transfer
        // it to the context, then clear it so at next request
        // re.locals.flash is also cleared
        res.locals.flash = req.session.flash;
        delete req.session.flash;
        next();
});

// load either morgan or express-logger depending on run environment
// by putting the require() in conditional we only load the one we need
switch(app.get('env')){
    case 'development':
        // compact, colorful dev logging
        app.use(require('morgan')('dev'));
        break;
    case 'production':
        // module 'express-logger' supports daily log rotation
        app.use(require('express-logger')({
            path: __dirname + '/log/requests.log'
        }));
        break;
}

app.use(function(req,res,next){
    var cluster = require('cluster');
    if(cluster.isWorker) console.log('Worker %d received request',
        cluster.worker.id);
    next();
});


// import website routes
require('./routes.js')(app);

// import native Express API routes
//require('./apiroutes.js')(app);

// import Connect-REST API routes
require('./apiRestRoutes.js')(rest);


// route for homepage
/* app.get('/', function(req, res){
        res.render('home');
});
*/

// route for about page, includes fortune cookie as module exmaple
/* app.get('/about', function(req, res){
        res.render('about', { 
	    fortune: fortune.getFortune(),
	    pageTestScript: '/qa/tests-about.js'
        });
});
*/

/* app.get('/tours/hood-river', function(req, res){
        res.render('tours/hood-river');
});
*/

/* app.get('/tours/request-group-rate', function(req, res){
        res.render('tours/request-group-rate');
});
*/


// provide option to select currency and have it retained in session
/* app.get('/set-currency/:currency', function(req,res){
    req.session.currency = req.params.currency;
    return res.redirect(303, '/vacations');
});
*/

/*
function convertFromUSD(value, currency){
    switch(currency){
        case 'USD': return value * 1;
        case 'GBP': return value * 0.6;
        case 'BTC': return value * 0.0023707918444761;
        default: return NaN;
    }
}
*/

// vacations page which accesses entries in mongodb database, updated 
// to include currency setting option 
/* app.get('/vacations', function(req, res){
    Vacation.find({ available: true }, function(err, vacations){
        var currency = req.session.currency || 'USD';
        var context = {
            currency: currency,
            vacations: vacations.map(function(vacation){
                return {
                    sku: vacation.sku,
                    name: vacation.name,
                    description: vacation.description,
                    inSeason: vacation.inSeason,
                    price: convertFromUSD(vacation.priceInCents/100, currency),
                    qty: vacation.qty,
                };
            }),
        };
        switch(currency){
            case 'USD': context.currencyUSD = 'selected'; break;
            case 'GBP': context.currencyGBP = 'selected'; break;
            case 'BTC': context.currencyBTC = 'selected'; break;
        }
        res.render('vacations', context);
    });
});
*/

// request to be notified when a vacation beocmes available
/* app.get('/notify-me-when-in-season', function(req, res){
    res.render('notify-me-when-in-season', { sku: req.query.sku });
});
*/

// handle the post request sent from form in route above
/* app.post('/notify-me-when-in-season', function(req, res){
    VacationInSeasonListener.update(
        { email: req.body.email },
        { $push: { skus: req.body.sku } },
        { upsert: true },
        function(err){
            if(err) {
                console.error(err.stack);
                req.session.flash = {
                    type: 'danger',
                    intro: 'Ooops!',
                    message: 'There was an error processing your request.',
                };
                return res.redirect(303, '/vacations');
            }
            req.session.flash = {
                type: 'success',
                intro: 'Thank you!',
                message: 'You will be notified when this vacation is in season.',
            };
            return res.redirect(303, '/vacations');
        }
    );
});
*/

// route for Newsletter subscription which has form submission
/* app.get('/newsletter', function(req, res){
    // we will learn about CSRF later...for now, we just
    // provide a dummy value
    res.render('newsletter', { csrf: 'CSRF token goes here' });
});
*/

// non-ajax form handling
//app.post('/process', function(req, res){
//    console.log('Form (from querystring): ' + req.query.form);
//    console.log('CSRF token (from hidden form field): ' + req.body._csrf);
//    console.log('Name (from visible form field): ' + req.body.name);
//    console.log('Email (from visible form field): ' + req.body.email);
//    res.redirect(303, '/thank-you');
//});

// ajax form-handling
/* app.post('/process', function(req, res){
    // send success message
    if(req.xhr || req.accepts('json,html')==='json'){
        // send success object if its an AJAX request
	// if error and its AJAX then need to add code to 
	// send { error: 'error description' }
        res.send({ success: true });
    } else {
        // if error and not an AJAX request redirect to an error page
	// just sending to thank-you for now
        res.redirect(303, '/thank-you');
    }
});
*/

// thankyou page to demonstrate flash messages
/* app.get('/thank-you', function(req, res){
    // display flash message; just a test that flash messages work
    // first page load of session will not show any message, 2nd one
    // will as middleware will have loaded it into res.locals
    req.session.flash = {
        type: 'danger',
        intro: 'Validation error!',
        message: 'The email address you entered was  not valid.',
    };
    res.render('thank-you');
});
*/

// route to check that jquery has been loaded
/* app.get('/jquery-test', function(req, res){
        res.render('jquery-test');
});
*/

// Photo submission: 
// make sure data directory exists
//var dataDir = __dirname + '/data';
//var vacationPhotoDir = dataDir + '/vacation-photo';
///* jshint -W030 */
//fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
//fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);
///* jshint +W030 */

//function saveContestEntry(contestName, email, year, month, photoPath){
//    // TODO...this will come later/
//}

// route for photo upload page
/* app.get('/contest/vacation-photo',function(req,res){
    var now = new Date();
    res.render('contest/vacation-photo',{
        year: now.getFullYear(),month: now.getMonth()
    });
});
*/

// route for photo upload form submission, using route parameters :xxxx
/* app.post('/contest/vacation-photo/:year/:month', function(req, res){
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files){
        if(err) return res.redirect(303, '/error');

        if(err) {
            res.session.flash = {
                type: 'danger',
                intro: 'Oops!',
                message: 'There was an error processing your submission. ' +
                    'Pelase try again.',
            };
            return res.redirect(303, '/contest/vacation-photo');
        }
        var photo = files.photo;
        var dir = vacationPhotoDir + '/' + Date.now();
        var path = dir + '/' + photo.name;
        fs.mkdirSync(dir);
        fs.renameSync(photo.path, dir + '/' + photo.name);
        saveContestEntry('vacation-photo', fields.email,
            req.params.year, req.params.month, path);
        req.session.flash = {
            type: 'success',
            intro: 'Good luck!',
            message: 'You have been entered into the contest.',
        };
        // commented out as havent created this view yet
	//return res.redirect(303, '/contest/vacation-photo/entries');
        return res.redirect(303, '/thank-you');
    });
});
*/

// old version - commented out
//app.post('/contest/vacation-photo/:year/:month', function(req, res){
//    var form = new formidable.IncomingForm();
//    form.parse(req, function(err, fields, files){
//        if(err) return res.redirect(303, '/error');
//        console.log('received fields:');
//        console.log(fields);
//        console.log('received files:');
//        console.log(files);
//        res.redirect(303, '/thank-you');
//    });
//});

// page that displays headers, just for diagnostics/learning
/* app.get('/headers', function(req,res){
    res.set('Content-Type','text/plain');
    var s = '';
    for(var name in req.headers) s += name + ': ' + req.headers[name] + '\n';
    res.send(s);
});
*/

// page that sends an email when viewed; commented out to avoid emailing during QA grunt tests
//app.get('/email', function(req, res){
//    // setup e-mail data with unicode symbols 
//    var mailOptions = {
//        from: 'Meadowlark Travel <info@meadowlarktravel.com>',  // sender address
//        to: 'jimbark007@gmail.com',  // list of receivers 
//        subject: 'Your Meadowlark Travel Tour',   // Subject line 
//	html: '<h1>Meadowlark Travel</h1>\n<p>Thanks for your booking <strong>' +
//	      'We look forward to your visit.</strong></p>' +
//	      // site is not live so must use placeholder image until then
//	      //'<p>here is our logo: <img src="//site-name/email/confgen_logo.png" ' +
//	      '<p>here is our logo: <img src="http://placehold.it/100x100" ' +
//	      'alt="Meadowlark Travel"></p> ',   // html body
//	// as we are testing html to text conversion comment out text: section
//        //text: 'Thank you for booking your trip with Meadowlark Travel.  ' +
//        //        'We look forward to your visit!',   // plaintext body 
//    };
//    // send mail with defined transport object 
//    transporter.sendMail(mailOptions, function(error, info){
//	if(error){
//            console.log('Unable to send email ' + error.message);
//	}else{
//            console.log('Email sent: ' + info.response);
//	}
//    });
//    res.render('email');
//});

// route that sends an email using handlebars template when viewed
// dont have a page setup to trigger this post request, so use Postman in Chrome
/* app.post('/cart/checkout', function(req, res){
    // normally get cart from session, manually create it here for testing
    //var cart = req.session.cart;
    var cart = {};
    if(!cart) next(new Error('Cart does not exist.'));
    // normally get info from form; here define stuff manually
    //var name = req.body.name || '', email = req.body.email || '';
    var name = 'Jim Bark', email = 'jimbark007@gmail.com';
    // input validation
    if(!email.match(VALID_EMAIL_REGEX)){
	console.log('email address did not match valid string');
        return res.next(new Error('Invalid email address.'));
    }
    // assign a random cart ID; normally we would use a database ID here
*/
//    cart.number = Math.random().toString().replace(/^0\.0*/, '');
/*    cart.billing = {
                name: name,
                email: email,
    };
    // render the email template and feed rendered html
    // into callback function which does the email sending
    res.render('email/cart-thank-you',
        { layout: null, cart: cart }, function(err,html){
                if( err ) console.log('error in email template');
                transporter.sendMail({
                    from: '"Meadowlark Travel": info@meadowlarktravel.com',
                    to: cart.billing.email,
                    subject: 'Thank You for Book your Trip with Meadowlark',
                    html: html,
                    // this is old style; dont need this anymore, uses
		    // plugin
		    //generateTextFromHtml: true,
	        }, function(error, info){
		    if(error){
			console.log('Unable to send email ' + error.message);
		    }else{
			console.log('Email sent: ' + info.response);
		    }
		});
	}
    );
    // render and send the html for the thank-you page
    res.render('cart-thank-you', { cart: cart});
});
*/


// route to trigger asynch uncaught error - commented out to avoid crash when running grunt
//app.get('/epic-fail', function(req, res){
//    process.nextTick(function(){
//        throw new Error('Kaboom!');
//    });
//});

// API configuration, imcluding using a separate domain
var apiOptions = {
    context: '',
    domain: require('domain').create(),
};

// handle API domain errors
apiOptions.domain.on('error', function(err){
    console.log('API domain error.\n', err.stack);
    setTimeout(function(){
        console.log('Server shutting down after API domain error.');
        process.exit(1);
    }, 5000);
    server.close();
    var worker = require('cluster').worker;
    if(worker) worker.disconnect();
});

// link API into pipeline
app.use(rest.rester(apiOptions));


// custom 404 page
app.use(function(req, res, next){
        res.status(404);
        res.render('404');
});

// custom 500 page
app.use(function(err, req, res, next){
        console.error(err.stack);
        res.status(500);
        res.render('500');
});


function startServer(){
    http.createServer(app).listen(app.get('port'), function(){
	console.log( 'Express started in ' + app.get('env') + 
		' mode on http://localhost:' +
		app.get('port') + '; press Ctrl-C to terminate.' );
    });
}

if(require.main === module){
    // application run directly; start app server
    startServer();
} else {
    // application imported as a module via "require": export function
    // to create server
    module.exports = startServer;
}



