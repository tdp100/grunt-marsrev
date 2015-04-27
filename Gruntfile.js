/*
 * grunt-marsRev
 * https://github.com/tdp100/grunt-marsRev
 *
 * Copyright (c) 2015 tangdeping
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        jshint: {
            all: [
                'Gruntfile.js',
                'tasks/*.js',
                '<%= nodeunit.tests %>'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },

        // Before generating any new files, remove any previously-created files.
        clean: {
            tests: ['build', 'tmp']
        },

        // Configuration to be run (and then tested).
        marsRev: {
            default_options: {
                options: {
                    hash: {
                        algorithm: 'md5',             //hash算法
                        inputEncoding: 'utf8',        //文件编码
                        length: 4                     //hash命名的长度
                    },
                    require: {
                        requireJsPath: 'build/lib/tiny/tiny-lib/require.js', //require.js的路径
                        dataMainPath: 'build/main.js',   //data-main 文件的路径
                        configJSON: 'tmp/main.json',         //require.config中的配置提取到单独的json文件中
                        accessHtml: 'build/index.html'   //引入require.js的html文件
                    },
                    cwd: 'build',                       //必填, 要hash的所有文件的目录名
                    files: [
                        {src: './'}
                    ]
                }
            }
        }
    });

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');

    // Whenever the "test" task is run, first clean the "tmp" dir, then run this
    // plugin's task(s), then test the result.
    grunt.registerTask('test', ['clean', 'marsRev']);

    // By default, lint and run all tests.
    grunt.registerTask('default', ['jshint', 'test']);

};
