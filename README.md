# grunt-marsRev

> file hash rename

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-marsrev --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-marsrev');
```

## The "marsRev" task

### Overview
In your project's Gruntfile, add a section named `marsRev` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  marsRev: {
     default_options: {
        options: {
          hash: {
              'algorithm': 'md5',
              'inputEncoding': 'utf8',
              'length': 4
          },
          require: {
              'requireJsPath': 'build/lib/tiny/tiny-lib/require.js',
              'dataMainPath': 'build/main.js',
              'configJSON': 'main.json',
              'accessHtml': 'build/index.html'
          },
          cwd: 'build',
          files: [{src: '/'}]
       }
     }
  }
});
```

### Options

#### options.hash
Type: `Object`
Default value:
```json
hash: {
    algorithm: 'md5',
    inputEncoding: 'utf8',
    length: 4
}
```

hash config

#### options.require
Type: `Object`

set require.js config information

#### options.cwd
Type: `String`

the root directory of hashed files

#### options.files
Type: `Array`

the directories of hash files, relative to cwd

### Usage Examples

#### Default Options
In this example, the default options are used to do something with whatever. So if the `testing` file has the content `Testing` and the `123` file had the content `1 2 3`, the generated result would be `Testing, 1 2 3.`

```js
grunt.initConfig({
  marsRev: {
    default_options: {
      options: {
        require: {
            'requireJsPath': 'build/lib/tiny/tiny-lib/require.js',
            'dataMainPath': 'build/main.js',
            'configJSON': 'main.json',
            'accessHtml': 'build/index.html'
        },
        cwd: 'build',
        files: [{src: '/'}]
     }
   }
  }
});
```

#### Custom Options
In this example, custom options are used to do something else with whatever else.

```js
grunt.initConfig({
  marsRev: {
     default_options: {
        options: {
          hash: {
              'algorithm': 'md5',
              'inputEncoding': 'utf8',
              'length': 4
          },
          require: {
              'requireJsPath': 'build/lib/tiny/tiny-lib/require.js',
              'dataMainPath': 'build/main.js',
              'configJSON': 'main.json',
              'accessHtml': 'build/index.html'
          },
          cwd: 'build',
          files: [{src: '/'}]
       }
     }
  }
});
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
