module.exports = function(grunt){

        // load plugins
        [
                'grunt-cafe-mocha',
                'grunt-contrib-jshint',
                'grunt-exec',
	        'grunt-contrib-less',
                'grunt-contrib-uglify',
                'grunt-contrib-cssmin',
                'grunt-hashres',
        ].forEach(function(task){
                grunt.loadNpmTasks(task);
        });

        // configure plugins
        grunt.initConfig({
                cafemocha: {
                        all: { src: 'qa/tests-*.js', options: { ui: 'tdd' }, }
                },
                jshint: {
                        app: ['meadowlark.js', 'public/js/**/*.js',
                                'lib/**/*.js'],
                        qa: ['Gruntfile.js', 'public/qa/**/*.js', 'qa/**/*.js'],
                },
                exec: {
                        linkchecker:
                                { cmd: 'linkchecker http://localhost:3000' }
                },
	        less: {
		    development: {
			options: {
			    customFunctions: {
				static: function(lessObject, name) {
				    return 'url("' +
					require('./lib/static.js').map(name.value) +
					'")';
				}
			    }
			},
			files: {
			    'public/css/main-custom.css': 'less/main-custom.less',
			    'public/css/cart.css': 'less/cart.less',
			}
		    }
		},
	        uglify: {
		    all: {
			files: {
			    'public/js/meadowlark.min.js': ['public/js/**/*.js']
			}
		    }
		},
                cssmin: {
		    combine: {
			files: {
			    'public/css/meadowlark.css': ['public/css/**/*.css',
							  '!public/css/meadowlark*.css']
			}
		    },
		    minify: {
			src: 'public/css/meadowlark.css',
			dest: 'public/css/meadowlark.min.css',
		    }
		},
                hashres: {
		    options: {
			fileNameFormat: '${name}.${hash}.${ext}'
		    },
		    all: {
			src: [
			    'public/js/meadowlark.min.js',
			    'public/css/meadowlark.min.css',
			],
			dest: [
			    'views/layouts/main.handlebars',
			]
		    },
		},
        });

        // register tasks
        grunt.registerTask('default', ['cafemocha','jshint','exec']);
        grunt.registerTask('static', ['less', 'cssmin', 'uglify', 'hashres']);
};
