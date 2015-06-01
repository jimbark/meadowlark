
var credentials = require('../credentials.js');

var nodemailer = require('nodemailer');                                                                      
var htmlToText = require('nodemailer-html-to-text').htmlToText;      

// set Nodemailer transport for sending emails
var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
                user: credentials.gmail.user,
                pass: credentials.gmail.password,
        }
});
transporter.use('compile', htmlToText());

var VALID_EMAIL_REGEX = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;

// route to check that jquery has been loaded
exports.jqueryTest = function(req, res){
        res.render('jquery-test');
};

// page that displays headers, just for diagnostics/learning
exports.headers = function(req,res){
    res.set('Content-Type','text/plain');
    var s = '';
    for(var name in req.headers) s += name + ': ' + req.headers[name] + '\n';
    res.send(s);
};

// page that sends an email when viewed; commented out to avoid emailing during QA grunt tests
//app.get('/email', function(req, res){
//    // setup e-mail data with unicode symbols
//    var mailOptions = {
//        from: 'Meadowlark Travel <info@meadowlarktravel.com>',  // sender address
//        to: 'jimbark007@gmail.com',  // list of receivers
//        subject: 'Your Meadowlark Travel Tour',   // Subject line
//      html: '<h1>Meadowlark Travel</h1>\n<p>Thanks for your booking <strong>' +
//            'We look forward to your visit.</strong></p>' +
//            // site is not live so must use placeholder image until then
//            //'<p>here is our logo: <img src="//site-name/email/confgen_logo.png" ' +
//            '<p>here is our logo: <img src="http://placehold.it/100x100" ' +
//            'alt="Meadowlark Travel"></p> ',   // html body
//      // as we are testing html to text conversion comment out text: section
//        //text: 'Thank you for booking your trip with Meadowlark Travel.  ' +
//        //        'We look forward to your visit!',   // plaintext body
//    };
//    // send mail with defined transport object
//    transporter.sendMail(mailOptions, function(error, info){
//      if(error){
//            console.log('Unable to send email ' + error.message);
//      }else{
//            console.log('Email sent: ' + info.response);
//      }
//    });
//    res.render('email');
//});

// route that sends an email using handlebars template when viewed
// dont have a page setup to trigger this post request, so use Postman in Chrome
exports.cartCheckout = function(req, res){
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
};

// route to trigger asynch uncaught error - commented out in routes.js to avoid crash when running grunt
exports.epicFail = function(req, res){  
    process.nextTick(function(){
        throw new Error('Kaboom!');
    });
};



//...
