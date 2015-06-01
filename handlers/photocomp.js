
var fs = require('fs');
var formidable = require('formidable');

// Photo submission:
// make sure data directory exists
var dataDir = (__dirname.replace('/handlers', '') + '/data');
var vacationPhotoDir = dataDir + '/vacation-photo';
/* jshint -W030 */
fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);
/* jshint +W030 */

function saveContestEntry(contestName, email, year, month, photoPath){
    // TODO...this will come later
}

// route for photo upload page
exports.photoUpload = function(req,res){
    var now = new Date();
    res.render('contest/vacation-photo',{
        year: now.getFullYear(),month: now.getMonth()
    });
};

// route for photo upload form submission, using route parameters :xxxx
exports.photoProcess = function(req, res){
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
};

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



//...
