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
          dest: 'build/ftp-lite'
      }
    },

    uglify: {
      options: {
          mangle: {
              except: ['$', 'require']
          },
          'screw-ie8': true
      },
      client: {
          src: 'src/main.js',
          dest: 'build/ftp-lite/main.js'
      },
      node: {
          src: 'src/node/ftpDomain.js',
          dest: 'build/ftp-lite/node/ftpDomain.js'
      }
    },
      
    compress: {
        build: {
            options: {
                archive: 'ftp-lite.zip',
                mode: 'zip'
            },
            files: [
                { expand:true, cwd: 'build/', src: '**' }
            ]
        }
    }
  });

  // load copy plugin
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-clean');

  // default
  grunt.registerTask('default', ['copy','uglify','compress']);


};

