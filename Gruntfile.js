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
          dest: 'build/ftp-sync'
      }
    },

    /*uglify: {
      options: {
          mangle: {
              except: ['$', 'require']
          },
          screw_ie8: true,
          preserveComments: 'some'
      },
      client: {
          src: 'src/main.js',
          dest: 'build/ftp-sync/main.js'
      },
      node: {
          src: 'src/node/ftpDomain.js',
          dest: 'build/ftp-sync/node/ftpDomain.js'
      }
    },*/
      
    compress: {
        build: {
            options: {
                archive: 'ftp-sync_<%= pkg.version %>.zip',
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
  //grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-clean');

  // default
  grunt.registerTask('default', ['copy','compress']);


};

