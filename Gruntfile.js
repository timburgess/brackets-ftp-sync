//uglifyjs ../main.js --mangle --reserved '$,require' --compress --screw-ie8 -o main.js

//glifyjs ../../node/ftpDomain.js --mangle --reserved 'require' --screw-ie8 -o ftpDomain.js

/*jslint indent: 4, white:true */
/*global module */

module.exports = function(grunt) {

  // Project config
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    copy: {
      main: {
          expand: true,
          cwd: 'src/',
          src: '**',
          dest: 'build/'
      }
    },

    uglify: {
      options: {
          mangle: {
              except: ['$', 'require']
          },
          'screw-ie8': true
      },
      build: {
          src: 'src/main.js',
          dest: 'build/src/main.js'
      }
    }
  });

  // load copy plugin
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');

  // default
  grunt.registerTask('default', ['copy']);


};

