
var Attraction = require('../models/attraction.js');

exports.getAttractionList = function(req, res){
    //console.log('got to getAttractionList');
    Attraction.find({ approved: true }, function(err, attractions){
        if(err) return res.status(500).sebd('Error occurred: database error.');
	//console.log('got list of attractions');
        res.json(attractions.map(function(a){
            return {
                name: a.name,
                id: a._id,
                description: a.description,
                location: a.location,
            };
        }));
    });
};

exports.addAttraction = function(req, res){
    //console.log('got to addAttraction');
    var a = new Attraction({
        name: req.body.name,
        description: req.body.description,
        location: { lat: req.body.lat, lng: req.body.lng },
        history: {
            event: 'created',
            email: req.body.email,
            date: new Date(),
        },
        approved: false,
    });
    //console.log('prepared new attraction ' + a);
    a.save(function(err, a){
        if(err) return res.status(500).send('Error occurred: database error.');
        res.json({ id: a._id });
    });
};

exports.getAttraction = function(req,res){
    //console.log('got to getAttraction');
    Attraction.findById(req.params.id, function(err, a){
        if(err) return res.status(500).send('Error occurred: database error.');
        res.json({
            name: a.name,
            id: a._id,
            description: a.description,
            location: a.location,
        });
    });
};


//...
