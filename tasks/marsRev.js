/*
 * grunt-marsRev
 * https://github.com/tdp100/grunt-marsRev
 *
 * Copyright (c) 2015 tangdeping
 * Licensed under the MIT license.
 */

'use strict';
var fs = require('fs');
var path = require('path');
var iconv = require('iconv-lite');
var crypto = require('crypto');

var win_sep = '\\';
var posix_sep = '/';

// The module to be exported.
var deal = function (options, grunt) {
    this.options = grunt.util._.extend({
        hash: {
            algorithm: 'md5',
            inputEncoding: 'utf8',
            length: 4
        }
    }, options);

    // The default file encoding to use.
    var defaultEncoding = 'utf8';
    // Whether to preserve the BOM on file.read rather than strip it.
    var preserveBOM = false;
    var pathSeparatorRe = /[\/\\]/g;
    var hashPrefixPatternSource = '([a-zA-Z0-9]{' + this.options.hash.length + '}\\.)?';
    var filePathPattern = new RegExp(hashPrefixPatternSource + '(([\\w\\d-_/.!]+)\\.(\.[0-9a-z]+)$)');

    var dependencyPathPattern = new RegExp('(\'|")[\\w\\d-_/.!\\,\\:\\[\\]]+(\'|")', 'g');
    // e.g. 'app', "controllers/main", "css!/styles/main"

    var definePattern = new RegExp('define\\s*\\(\\s*(' + dependencyPathPattern.source + '\\s*,?\\s*)*\\s*\\[\\s*(' + dependencyPathPattern.source + '\\s*,?\\s*)*\\s*\\]', 'ig');
    // e.g. define("moduleName",["app","controllers/main"]... define(["app","controllers/main"]...

    var requirePattern = new RegExp('(require\\s*\\(\\s*\\[\\s*(' + dependencyPathPattern.source + '\\s*,?\\s*)*\\]\\s*)|(require\\s*\\(\\s*(' + dependencyPathPattern.source + '\\s*,?\\s*)*)', 'ig');
    // e.g. require(['app']... require('app'...

    var dependenciesPattern = new RegExp('(dependencies\\s*(:|=)\\s*\\[\\s*(' + dependencyPathPattern.source + '\\s*,?\\s*)*\\]\\s*)|(dependencies\\s*\\.\\s*push\\(\\s*(' + dependencyPathPattern.source + '\\s*,?\\s*)*)', 'ig');
    // e.g. dependencies: ['css!../~','~']... dependencies = ['css!../~','~']... dependencies.push('~');

    var urlPattern = new RegExp('[\'|"]*[a-zA-Z0-9-_/.]+[\'|"]*');
    // e.g. ./fonts/flaticon.svg
    var cssUrlPattern = new RegExp('url\\s*\\(\\s*(' + urlPattern.source + ')\\s*\\)', 'ig');
    // e.g. url("./fonts/flaticon.svg")  or url('./fonts/flaticon.svg') or url(./fonts/flaticon.svg)
    var resourceUrlPattern = new RegExp('(href|src)\\s*=\\s*(' + dependencyPathPattern.source + ')\\s*', 'ig');


    //以下是对nezha框架中的lazy-load/lazyLoad.js加载机制中的文件路径正则表达式的书写，用于提出出相应的依赖
    var templateUrlPattern = new RegExp('[\'|"]*templateUrl[\'|"]*\\s*:\\s*(' + urlPattern.source + ')\\s*', 'ig');
    // e.g. templateUrl: "src/app/business/home/views/home.html",

    var directivesPattern = new RegExp('(\'|")directives(\'|")\\s*:\\s*\\[\\s*(' + dependencyPathPattern.source + '\\s*,?\\s*)*\\s*\\]', 'ig');
    // e.g. 'directives': ['app/business/home/controllers/homeCtrl'],

    var servicesPattern = new RegExp('(\'|")services(\'|")\\s*:\\s*\\[\\s*(' + dependencyPathPattern.source + '\\s*,?\\s*)*\\s*\\]', 'ig');
    // e.g. 'services': ['app/business/home/controllers/homeCtrl'],

    var controllersPattern = new RegExp('(\'|")controllers(\'|")\\s*:\\s*\\[\\s*(' + dependencyPathPattern.source + '\\s*,?\\s*)*\\s*\\]', 'ig');
    // e.g. 'controllers': ['app/business/home/controllers/homeCtrl'],

    var factoriesPattern = new RegExp('(\'|")factories(\'|")\\s*:\\s*\\[\\s*(' + dependencyPathPattern.source + '\\s*,?\\s*)*\\s*\\]', 'ig');
    // e.g. 'factories': ['app/business/home/controllers/homeCtrl'],

    var jsPattern = new RegExp('(\'|")js(\'|")\\s*:\\s*\\[\\s*(' + dependencyPathPattern.source + '\\s*,?\\s*)*\\s*\\]', 'ig');
    // e.g. "js": ["tiny-directives/Table"]
    //lazy-load  结束

    //定义规则，业务需要，在js中定义的文件路径变量
    var fileUrlPattern = new RegExp('(\'|")*url(\'|")*\\s*:\\s*(' + dependencyPathPattern.source + ')', 'ig');

    /**
     * 将windows格式的路径转化为linux格式的路径
     * @param pathName  路径
     * @returns {*}
     */
    var parseLinuxPath = function (pathName) {
        if (typeof pathName === 'string') {
            return pathName.split(win_sep).join(posix_sep);
        }
        return pathName;
    };

    /**
     * 读取文件内容
     * @param filepath  文件路径
     * @param options   选项，可设置encoding格式
     * @returns {*}
     */
    var read = function (filepath, options) {
        if (!options) {
            options = {};
        }
        var contents;
        try {
            contents = fs.readFileSync(String(filepath));
            // If encoding is not explicitly null, convert from encoded buffer to a
            // string. If no encoding was specified, use the default.
            if (options.encoding !== null) {
                contents = iconv.decode(contents, options.encoding || defaultEncoding);
                // Strip any BOM that might exist.
                if (!preserveBOM && contents.charCodeAt(0) === 0xFEFF) {
                    contents = contents.substring(1);
                }
            }
            return contents;
        } catch (e) {
            grunt.fail.warn('Unable to read "' + filepath + '" file (Error code: ' + e.code + ').', e);
        }
    };

    /**
     * 写文件
     * @param filepath 路径
     * @param contents 内容
     * @param options  选项
     * @returns {boolean}
     */
    var write = function (filepath, contents, options) {
        if (!options) {
            options = {};
        }
        // Create path, if necessary.
        mkdir(path.dirname(filepath));
        try {
            // If contents is already a Buffer, don't try to encode it. If no encoding
            // was specified, use the default.
            if (!Buffer.isBuffer(contents)) {
                contents = iconv.encode(contents, options.encoding || defaultEncoding);
            }
            fs.writeFileSync(filepath, contents);
            return true;
        } catch (e) {
            grunt.fail.warn('Unable to write "' + filepath + '" file (Error code: ' + e.code + ').', e);
        }
    };

    var exists = function () {
        var filePath = path.join.apply(path, arguments);
        return fs.existsSync(filePath);
    };

    var mkdir = function (dirpath, mode) {
        // Set directory mode in a strict-mode-friendly way.
        if (mode == null) {
            mode = parseInt('0777', 8) & (~process.umask());
        }
        dirpath.split(pathSeparatorRe).reduce(function (parts, part) {
            parts += part + '/';
            var subpath = path.resolve(parts);
            if (!exists(subpath)) {
                try {
                    fs.mkdirSync(subpath, mode);
                } catch (e) {
                    grunt.fail.warn('Unable to create directory "' + subpath + '" (Error code: ' + e.code + ').', e);
                }
            }
            return parts;
        }, '');
    };

    var getFiles = function (dir, files_) {
        files_ = files_ || [];
        var files = fs.readdirSync(dir);
        for (var i in files) {
            var name = '';
            if (dir[dir.length - 1] === '/') {
                name = dir + files[i];
            }
            else {
                name = dir + posix_sep + files[i];
            }
            if (fs.statSync(name).isDirectory()) {
                getFiles(name, files_);
            } else {
                files_.push(name);
            }
        }
        return files_;
    };

    /**
     * 处理require.config，找到其中定义的相对路径
     * @param requireJsPath
     * @param dataMainPath
     * @param configFile
     * @returns {*}
     */
    var dealRequireConfig = function (requireJsPath, dataMainPath, configFile) {
        if (dataMainPath === undefined) {
            return path.dirname(requireJsPath);
        }
        var dataMainDir = path.dirname(dataMainPath);
        var contents = read(configFile);

        var configJSON = JSON.parse(contents);
        //处理config.baseUrl
        var baseUrl = configJSON.baseUrl;
        //合并路径
        baseUrl = path.join(dataMainDir, baseUrl);

        //处理config.paths
        var paths = {};
        for (var key in configJSON.paths) {
            var standardPath = path.join(baseUrl, configJSON.paths[key]);
            paths[key] = parseLinuxPath(standardPath);
        }

        //处理config.shim
        var shim = {};
        for (var key in configJSON.shim) {
            var relatePath = path.dirname(key);
            shim[key] = parseLinuxPath(path.join(paths[relatePath], path.basename(key)) + '.js');
            var deps = configJSON.shim[key].deps;
            if (deps === undefined) {
                continue;
            }
            deps.forEach(function (dep) {
                var depRelatePath = path.dirname(dep);
                shim[dep] = parseLinuxPath(path.join(paths[depRelatePath], path.basename(dep)) + '.js');
            });
        }

        var result = {
            'baseUrl': parseLinuxPath(baseUrl),  //用于在require中使用了相对路径，但却没有使用config.paths中定义的相对路径
            'paths': paths,
            'shim': shim
        };

        grunt.log.writeln(JSON.stringify(result));
        return result;
    };

    /**
     * 计算文件的哈希值
     * @param filepath 文件路径
     * @param fileEncoding 文件编码, 默认utf8
     * @param hashAlgorithm 哈希算法，默认md5
     * @returns {*}
     */
    var createHashforFile = function (filepath, fileEncoding, hashAlgorithm) {
        var hash = crypto.createHash(hashAlgorithm);
        hash.update(read(filepath), fileEncoding);
        return hash.digest('hex');
    };

    /**
     * 给文件重命名hash名称
     * @param targetPath
     * @returns {*}
     */
    this.renameHashNameForFile = function (targetPath) {
        var originName = path.basename(targetPath);
        var hash = createHashforFile(targetPath, this.options.hash.inputEncoding, this.options.hash.algorithm);
        var prefix = hash.slice(0, this.options.hash.length);

        // clear hash prefix from file name
        var filePathMatch = originName.match(filePathPattern);
        if (filePathMatch && filePathMatch[1] && filePathMatch[1].match(/\d/)) {
            originName = filePathMatch[2];
        }

        var targetPathNew = parseLinuxPath(path.join(path.dirname(targetPath), prefix + '.' + originName));
        grunt.log.writeln('Rename ' + targetPath + ' to ' + targetPathNew + '...');

        // rename file (adding hash prefix)
        fs.renameSync(targetPath, targetPathNew);
        this.dependenciesMap[targetPath].hashFilePath = targetPathNew;
        return {
            originPath: targetPath,
            hashPath: targetPathNew
        }
    };

    /**
     * 从fileItem的依赖Map中搜索是否依赖了targetPath文件
     * @param fileItem
     * @param targetPath
     * @returns {*}
     */
    this.matchPatternFromArray = function (fileItem, targetPath) {
        var dependencies = this.dependenciesMap[fileItem].dependencies;
        for (var i = 0; i < dependencies.length; i++) {
            var item = dependencies[i];
            //匹配路径中的第一项
            var itemArray = item.split('/');
            var dir = itemArray.shift();
            var standardConfigDir = this.config.paths[dir];

            /**
             *  先判断是否使用了require.js中的config.paths 相对路径
             */
            if (standardConfigDir !== undefined) {
                var standardDir = parseLinuxPath(path.join(standardConfigDir, itemArray.join('/')));
                var standardPath = parseLinuxPath(path.join(path.dirname(standardDir), path.basename(item)) + '.js');
                if (standardPath === targetPath) {
                    return item;
                }
            }
            /**
             *  判断是使用了相对targetPath的相对路径
             */
            else {
                var extname = path.extname(item) !== '' ? '' : '.js';
                var needFromCwd = false;
                ////对于在require.js中直接使用了根目录下的文件路径，如fixtures/frameworkFixture.js，需要从cwd路径算起
                if (/^\s*\./g.test(item) === false) {
                    needFromCwd = true;
                }
                //由于angularjs中的html文件是采用$http动态取回来的，而不是通过路径下载的。所以其中的相对路径不能以html文件作为参考
                if (path.extname(fileItem) === '.html' && fileItem !== this.options.require.accessHtml) {
                    needFromCwd = true;
                }
                var standardPath = '';
                if (needFromCwd) {
                    standardPath = parseLinuxPath(path.join(this.options.cwd, item) + extname);
                }
                else {
                    standardPath = parseLinuxPath(path.join(path.dirname(fileItem), item) + extname);
                }
                if (standardPath === targetPath) {
                    return item;
                }
            }
        }
        return null;
    };

    /**
     * 替换targetPath在其它文件中被依赖的路径, 需要遍历每个文件中的依赖Map
     * @param targetPath   文件全路径
     * @param targetHashPath  文件哈希全路径
     */
    this.replaceDependencyPath = function (targetPath, targetHashPath) {
        //找到该文件在其它使用文件中的依赖列表，然后修改依赖了该文件的文件内容
        for (var fileItem in this.dependenciesMap) {
            if (fileItem === targetPath) {
                continue;
            }
            if (/(.js|.css|.html|)/.test(path.extname(fileItem)) === false) {
                continue;
            }
            var fileItemObj = this.dependenciesMap[fileItem];
            var dependencyMatch = this.matchPatternFromArray(fileItem, targetPath);
            if (dependencyMatch) {
                grunt.log.writeln('Replace require path for %s with %s ...', fileItem, targetPath);
                var contents = read(fileItemObj.hashFilePath);

                //处理路径以./开关的场景，path.dirname会去掉前面的./
                var basename = path.basename(targetHashPath);
                if (path.extname(dependencyMatch) !== '.js') {
                    basename = basename.replace('.js', '');
                }
                var replacePath = path.join(path.dirname(dependencyMatch), basename);
                if (/^\s*\.\//g.test(dependencyMatch) === true) {
                    replacePath = './' + replacePath;
                }
                var replacePath = parseLinuxPath(replacePath);
                grunt.log.writeln('in fileItemObj.hashFilePath =%s, replace dependencyMatch=%s to replacePath=%s', fileItemObj.hashFilePath, dependencyMatch, replacePath);
                write(fileItemObj.hashFilePath, contents.replace(
                    new RegExp('("|\')' + '(' + dependencyMatch + ')' + '("|\')', 'ig'),
                        '$1' + replacePath + '$3'
                ));
            }
        }
    };


    /**
     * 获取每个文件中的依赖Map
     * 1. 所有require 依赖
     * 2. require.config依赖
     * 3. lazy-load 依赖
     * 4. html 中所有图片，css, js依赖
     * 5. js 中指定规则url: "path" 的依赖
     * 6. css中的图片，字体文件依赖
     */
    this.getDependenciesMap = function () {
        var self = this;
        var targetFiles = this.files;
        var dependenciesMap = {};
        targetFiles.forEach(function (targetPath) {
            grunt.log.writeln('Search Dependencies of targetPath: %s', targetPath);
            var contents = read(targetPath);
            var defineMatches = contents.match(definePattern);
            var requireMatches = contents.match(requirePattern);
            var dependenciesMatches = contents.match(dependenciesPattern);
            grunt.log.writeln('Define matches: %s', defineMatches);
            grunt.log.writeln('Require matches: %s', requireMatches);
            grunt.log.writeln('Dependencies matches: %s', dependenciesMatches);

            // dependency path array
            var dependencies = [];
            if (defineMatches) {
                defineMatches.forEach(function (defineMatch) {
                    var pathMatches = defineMatch.match(dependencyPathPattern);
                    if (pathMatches) {
                        dependencies = dependencies.concat(pathMatches);
                    }
                });
            }
            if (requireMatches) {
                requireMatches.forEach(function (requireMatch) {
                    var pathMatches = requireMatch.match(dependencyPathPattern);
                    if (pathMatches) {
                        dependencies = dependencies.concat(pathMatches);
                    }
                });
            }

            if (dependenciesMatches) {
                dependenciesMatches.forEach(function (dependenciesMatch) {
                    var pathMatches = dependenciesMatch.match(dependencyPathPattern);
                    if (pathMatches) {
                        dependencies = dependencies.concat(pathMatches);
                    }
                });
            }

            //如果是main.js中的require.config配置了shim
            if (targetPath === self.options.require.dataMainPath) {
                for (var key in self.config.shim) {
                    dependencies = dependencies.concat(key);
                }
            }

            //如果是.js文件，需要判断是不是RouterConfig.js中是否使用了lazy-load机制匹配了要加载的文件
            if (path.extname(targetPath) === '.js' && /RouterConfig/.test(targetPath)) {
                var templateUrlMatches = contents.match(templateUrlPattern);
                grunt.log.writeln('templateUrl matches: %s', templateUrlMatches);

                if (templateUrlMatches) {
                    templateUrlMatches.forEach(function (templateUrlMatch) {
                        var pathMatches = templateUrlPattern.exec(templateUrlMatch);
                        cssUrlPattern.lastIndex = 0;  // Reset
                        if (pathMatches && pathMatches.length > 1) {
                            dependencies = dependencies.concat(pathMatches[1]);
                        }
                    });
                }

                var directivesMatches = contents.match(directivesPattern);
                grunt.log.writeln('directives matches: %s', directivesMatches);

                if (directivesMatches) {
                    directivesMatches.forEach(function (directivesMatch) {
                        var pathMatches = directivesMatch.match(dependencyPathPattern);
                        if (pathMatches) {
                            dependencies = dependencies.concat(pathMatches);
                        }
                    });
                }

                var servicesMatches = contents.match(servicesPattern);
                grunt.log.writeln('services matches: %s', servicesMatches);

                if (servicesMatches) {
                    servicesMatches.forEach(function (servicesMatch) {
                        var pathMatches = servicesMatch.match(dependencyPathPattern);
                        if (pathMatches) {
                            dependencies = dependencies.concat(pathMatches);
                        }
                    });
                }

                var controllersMatches = contents.match(controllersPattern);
                grunt.log.writeln('controllers matches: %s', controllersMatches);

                if (controllersMatches) {
                    controllersMatches.forEach(function (controllersMatch) {
                        var pathMatches = controllersMatch.match(dependencyPathPattern);
                        if (pathMatches) {
                            dependencies = dependencies.concat(pathMatches);
                        }
                    });
                }

                var factoriesMatches = contents.match(factoriesPattern);
                grunt.log.writeln('factories matches: %s', factoriesMatches);

                if (factoriesMatches) {
                    factoriesMatches.forEach(function (factoriesMatch) {
                        var pathMatches = factoriesMatch.match(dependencyPathPattern);
                        if (pathMatches) {
                            dependencies = dependencies.concat(pathMatches);
                        }
                    });
                }

                var jsMatches = contents.match(jsPattern);
                grunt.log.writeln('js matches: %s', jsMatches);

                if (jsMatches) {
                    jsMatches.forEach(function (jsMatch) {
                        var pathMatches = jsMatch.match(dependencyPathPattern);
                        if (pathMatches) {
                            dependencies = dependencies.concat(pathMatches);
                        }
                    });
                }
            }

            if (path.extname(targetPath) === '.js') {
                var fileUrlMatches = contents.match(fileUrlPattern);
                grunt.log.writeln('fileUrl matches: %s', fileUrlMatches);
                if (fileUrlMatches) {
                    fileUrlMatches.forEach(function (fileUrlMatch) {
                        var pathMatches = fileUrlMatch.match(dependencyPathPattern);
                        if (pathMatches) {
                            dependencies = dependencies.concat(pathMatches);
                        }
                    });
                }
            }

            //如果是.js,.html,.css文件，需要记录该css文件中动态引入的图片和字符文件
            //注意如果是.js中引入的css样式中有图片依赖，那么路径必须是以根目录下的子目录为起始路径
            //e.g: $('<div>').css({"background": "#aaaaaa url('theme/default/images/mask-cover.png') 50% 50% repeat-x"});
            //不能是e.g: $('<div>').css({"background": "#aaaaaa url('./theme/default/images/mask-cover.png') 50% 50% repeat-x"});
            if (/(.js|.css|.html|)/.test(path.extname(targetPath)) === true) {
                var urlMatches = contents.match(cssUrlPattern);
                grunt.log.writeln('url matches: %s', urlMatches);
                if (urlMatches) {
                    urlMatches.forEach(function (urlMatch) {
                        var pathMatches = cssUrlPattern.exec(urlMatch);
                        cssUrlPattern.lastIndex = 0;  // Reset
                        if (pathMatches && pathMatches.length > 1) {
                            dependencies = dependencies.concat(pathMatches[1]);
                        }
                    });
                }
            }

            //如果是html文件，需要记录html文件中动态引入的图片和字符文件
            if (path.extname(targetPath) === '.html') {
                var resourcesMatches = contents.match(resourceUrlPattern);
                grunt.log.writeln('resources matches: %s', resourcesMatches);

                if (resourcesMatches) {
                    resourcesMatches.forEach(function (resourceMatch) {
                        var pathMatches = resourceMatch.match(dependencyPathPattern);
                        if (pathMatches) {
                            dependencies = dependencies.concat(pathMatches);
                        }
                    });
                }
            }

            // remove quotation mark
            for (var i = 0; i < dependencies.length; i++) {
                dependencies[i] = dependencies[i].replace(/'|"/g, '');
            }

            // remove duplicate dependency path
            for (var i = 0; i < dependencies.length; i++) {
                var target = dependencies[i];
                var indexOfNext = dependencies.indexOf(target, i + 1);
                if (indexOfNext > 0) {
                    dependencies.splice(indexOfNext, 1);
                    i--;
                }
            }
            dependenciesMap[targetPath] = {};
            dependenciesMap[targetPath].hashFilePath = targetPath;
            dependenciesMap[targetPath].dependencies = dependencies;
        });
        this.dependenciesMap = dependenciesMap;
        console.dir(dependenciesMap);
    };

    /**
     * 处理需要hash的所有路径
     */
    this.deal = function () {
        var self = this;
        this.config = dealRequireConfig(this.options.require.requireJsPath, this.options.require.dataMainPath, this.options.require.configJSON);
        this.files = getFiles(this.options.cwd);
        this.getDependenciesMap();

        var targetFiles = [];
        this.options.files.forEach(function (filePair) {
            targetFiles = getFiles(parseLinuxPath(path.join(self.options.cwd, filePair.src)));
        });
        targetFiles.forEach(function (targetFile) {
            var result = self.renameHashNameForFile(targetFile);
            self.replaceDependencyPath(result.originPath, result.hashPath);
        });

        //处理require data-main, 待优化TODO
        if (this.options.require.dataMainPath !== null) {
            try {
                var dataMainDepObj = this.dependenciesMap[this.options.require.dataMainPath];
                var accessHtmlDepObj = this.dependenciesMap[this.options.require.accessHtml];
                var contents = read(accessHtmlDepObj.hashFilePath);
                write(accessHtmlDepObj.hashFilePath, contents.replace(
                    new RegExp('(data-main\\s*=\\s*["|\']\\s*)' + '(main)' + '\\s*("|\')', 'ig'),
                        '$1' + path.basename(dataMainDepObj.hashFilePath, ".js") + '$3'
                ));
            }
            catch (e) {
                grunt.fail.warn("modify require.js data-main config fai, e=", e);
            }
        }
    }
};

module.exports = function (grunt) {
    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks
    grunt.registerTask('marsRev', 'file hash rename', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var defaultConfig = {
            'hash': {
                algorithm: 'md5',
                inputEncoding: 'utf8',
                length: 4
            }
        };
        var options = this.options(defaultConfig);
        grunt.log.writeln(JSON.stringify(options));
        if (options.cwd === undefined) {
            grunt.fail.warn("cwd is undefined.");
        }
        var dealInstance = new deal(options, grunt);
        dealInstance.deal();
        grunt.log.ok('success hashed file');
    });
};
