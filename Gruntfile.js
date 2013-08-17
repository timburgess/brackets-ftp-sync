//uglifyjs ../main.js --mangle --reserved '$,require' --compress --screw-ie8 -o main.js

//glifyjs ../../node/ftpDomain.js --mangle --reserved 'require' --screw-ie8 -o ftpDomain.js

module.exports = function(grunt) {

  // Project config
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      options: {
      },
      build: {
        src: 'src/main.js',
        dest: 'build/main.js'
      }
    }
  });

  // load uglify plugin
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // default
  grunt.registerTask('default', ['uglify']);


};

