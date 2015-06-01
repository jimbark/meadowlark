
var Vacation = require('../models/vacation.js');
var VacationInSeasonListener = require('../models/vacationInSeasonListener.js');

// enter MongoDB seed data for Vacations collection  NOTE: app-cluster means get two copies of each entry !! 
Vacation.find(function(err, vacations){                                                                     
    if(vacations.length) return;      
    new Vacation({                                                                                                     name: 'Hood River Day Trip',                                                                                  slug: 'hood-river-day-trip',                                                                                  category: 'Day Trip',                                                                                         sku: 'HR199',                                                                                                 description: 'Spend a day sailing on the Columbia and ' +                                                         'enjoying craft beers in Hood River!',                                                                    priceInCents: 9995,                                                                                           tags: ['day trip', 'hood river', 'sailing', 'windsurfing', 'breweries'],                                      inSeason: true,                                                                                               maximumGuests: 16,                                                                                            available: true,                                                                                              packagesSold: 0,                                                                                          }).save();                            
 
    new Vacation({                                                                                                    name: 'Oregon Coast Getaway',                                                                                 slug: 'oregon-coast-getaway',                                                                                 category: 'Weekend Getaway',                                                                                  sku: 'OC39',                                                                                                  description: 'Enjoy the ocean air and quaint coastal towns!',                                                 priceInCents: 269995,                                                                                         tags: ['weekend getaway', 'oregon coast', 'beachcombing'],                                                    inSeason: false,                                                                                              maximumGuests: 8,                                                                                             available: true,                                                                                              packagesSold: 0,                                                                                          }).save();                                                    
     
    new Vacation({                                                                                                     name: 'Rock Climbing in Bend',                                                                                slug: 'rock-climbing-in-bend',                                                                                category: 'Adventure',                                                                                        sku: 'B99',                                                                                                   description: 'Experience the thrill of climbing in the high desert.',                                         priceInCents: 289995,                                                                                         tags: ['weekend getaway', 'bend', 'high desert', 'rock climbing'],                                            inSeason: true,                                                                                               requiresWaiver: true,                                                                                         maximumGuests: 4,                                                                                             available: false,                                                                                             packagesSold: 0,                                                                                              notes: 'The tour guide is currently recovering from a skiing accident.',                                  }).save();                                                    
});        

function convertFromUSD(value, currency){
    switch(currency){
        case 'USD': return value * 1;
        case 'GBP': return value * 0.6;
        case 'BTC': return value * 0.0023707918444761;
        default: return NaN;
    }
}

// provide option to select currency and have it retained in session  
exports.setCurrency = function(req,res){
    req.session.currency = req.params.currency;
    return res.redirect(303, '/vacations');
};

// vacations page which accesses entries in mongodb database, updated                                         
// to include currency setting option            
exports.vacations = function(req, res){
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
};

// request to be notified when a vacation beocmes available                                                   
exports.notifyMe = function(req, res){                                                    
    res.render('notify-me-when-in-season', { sku: req.query.sku });                
};                                                                                            

// handle the post request sent from form in route above
exports.notifyMeForm = function(req, res){ 
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
};                                                                                                            

