
// route for Newsletter subscription which has form submission
exports.newsletter = function(req, res){                                                                  
    // we will learn about CSRF later...for now, we just
    // provide a dummy value
    res.render('newsletter', { csrf: 'CSRF token goes here' });
};

// non-ajax form handling
//app.post('/process', function(req, res){
//    console.log('Form (from querystring): ' + req.query.form);
//    console.log('CSRF token (from hidden form field): ' + req.body._csrf);
//    console.log('Name (from visible form field): ' + req.body.name);
//    console.log('Email (from visible form field): ' + req.body.email);
//    res.redirect(303, '/thank-you');
//});

// ajax form-handling
exports.process = function(req, res){
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
};

// thankyou page to demonstrate flash messages
exports.thankyou = function(req, res){
    // display flash message; just a test that flash messages work
    // first page load of session will not show any message, 2nd one
    // will as middleware will have loaded it into res.locals
    req.session.flash = {
        type: 'danger',
        intro: 'Validation error!',
        message: 'The email address you entered was  not valid.',
    };
    res.render('thank-you');
};

//...
