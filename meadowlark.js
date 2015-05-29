var express = require('express');
var fortune = require('./lib/fortune.js');
var weather = require('./lib/weather.js');
var bodyParser  = require('body-parser');
var formidable = require('formidable');
var credentials = require('./credentials.js');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var nodemailer = require('nodemailer');
var htmlToText = require('nodemailer-html-to-text').htmlToText;

var app = express();

// set Nodemailer transport for sending emails
var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
                user: credentials.gmail.user,
                pass: credentials.gmail.password,
        }
});
transporter.use('compile', htmlToText());

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

var VALID_EMAIL_REGEX = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser(credentials.cookieSecret));

app.use(expressSession({
    secret: credentials.cookieSecret,
    resave: false,
    saveUninitialized: false
}));

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

app.get('/', function(req, res){
        res.render('home');
});

app.get('/about', function(req, res){
        res.render('about', { 
	    fortune: fortune.getFortune(),
	    pageTestScript: '/qa/tests-about.js'
        });
});

app.get('/tours/hood-river', function(req, res){
        res.render('tours/hood-river');
});

app.get('/tours/request-group-rate', function(req, res){
        res.render('tours/request-group-rate');
});

app.get('/newsletter', function(req, res){
    // we will learn about CSRF later...for now, we just
    // provide a dummy value
    res.render('newsletter', { csrf: 'CSRF token goes here' });
});

// non-ajax form handling
//app.post('/process', function(req, res){
//    console.log('Form (from querystring): ' + req.query.form);
//    console.log('CSRF token (from hidden form field): ' + req.body._csrf);
//    console.log('Name (from visible form field): ' + req.body.name);
//    console.log('Email (from visible form field): ' + req.body.email);
//    res.redirect(303, '/thank-you');
//});

// ajax form-handling
app.post('/process', function(req, res){
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

app.get('/thank-you', function(req, res){
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

app.get('/jquery-test', function(req, res){
        res.render('jquery-test');
});

app.get('/contest/vacation-photo',function(req,res){
    var now = new Date();
    res.render('contest/vacation-photo',{
        year: now.getFullYear(),month: now.getMonth()
    });
});

// route for phot upload form submission, using route parameters :xxxx
app.post('/contest/vacation-photo/:year/:month', function(req, res){
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files){
        if(err) return res.redirect(303, '/error');
        console.log('received fields:');
        console.log(fields);
        console.log('received files:');
        console.log(files);
        res.redirect(303, '/thank-you');
    });
});

// page that displays headers, just for diagnostics/learning
app.get('/headers', function(req,res){
    res.set('Content-Type','text/plain');
    var s = '';
    for(var name in req.headers) s += name + ': ' + req.headers[name] + '\n';
    res.send(s);
});

// page that sends an email when viewed
app.get('/email', function(req, res){
    // setup e-mail data with unicode symbols 
    var mailOptions = {
        from: 'Meadowlark Travel <info@meadowlarktravel.com>',  // sender address
        to: 'jimbark007@gmail.com',  // list of receivers 
        subject: 'Your Meadowlark Travel Tour',   // Subject line 
	html: '<h1>Meadowlark Travel</h1>\n<p>Thanks for your booking <strong>' +
	      'We look forward to your visit.</strong></p>' +
	      // site is not live so must use placeholder image until then
	      //'<p>here is our logo: <img src="//site-name/email/confgen_logo.png" ' +
	      '<p>here is our logo: <img src="http://placehold.it/100x100" ' +
	      'alt="Meadowlark Travel"></p> ',   // html body
	// as we are testing html to text conversion comment out text: section
        //text: 'Thank you for booking your trip with Meadowlark Travel.  ' +
        //        'We look forward to your visit!',   // plaintext body 
    };
    // send mail with defined transport object 
    transporter.sendMail(mailOptions, function(error, info){
	if(error){
            console.log('Unable to send email ' + error.message);
	}else{
            console.log('Email sent: ' + info.response);
	}
    });
    res.render('email');
});

// route that sends an email using handlebars template when viewed
// dont have a page setup to trigger this post reuqest, so use Postman in Chrome
app.post('/cart/checkout', function(req, res){
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
    cart.number = Math.random().toString().replace(/^0\.0*/, '');
    cart.billing = {
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

//app.listen(app.get('port'), function(){
//  console.log( 'Express started in ' + app.get('env') + 
//    ' mode on http://localhost:' +
//    app.get('port') + '; press Ctrl-C to terminate.' );
//});

function startServer(){
    app.listen(app.get('port'), function(){
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



