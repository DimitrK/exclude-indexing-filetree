define(function (require, exports, module) {
  'use strict';

  // Get our Brackets modules
  var _ = brackets.getModule('thirdparty/lodash'),
    Commands = brackets.getModule('command/Commands'),
    CommandManager = brackets.getModule('command/CommandManager'),
    FileSystem = brackets.getModule('filesystem/FileSystem'),
    FileSystemImpl = FileSystem._FileSystem,
    FileUtils = brackets.getModule('file/FileUtils'),
    ProjectManager = brackets.getModule('project/ProjectManager'),
    PreferencesManager = brackets.getModule('preferences/PreferencesManager'),
    PackageJson = JSON.parse(require('text!./package.json')),
    StateManager = PreferencesManager.stateManager;

  // Get the preferences for this extension
  var preferences = PreferencesManager.getExtensionPrefs(PackageJson.name),
    prefKey = 'excludeList',
    _oldFilter = FileSystemImpl.prototype._indexFilter;

  var reTest = /\/(.+)\/(i?)$/, // detects if the exclude settings are a regexp string
    defaultExcludeList = [ // Default excludes
      '.git(?!ignore)',
      'dist',
      'bower_components',
      'node_modules'
    ],
    excludeList, projectPath;

  preferences.definePreference(prefKey, 'array', defaultExcludeList);

  // Check if the extension has been updated
  if (PackageJson.version !== StateManager.get(PackageJson.name + '.version')) {
    StateManager.set(PackageJson.name + '.version', PackageJson.version);

    preferences.set(prefKey, defaultExcludeList);
  }

  function toRegexp(text) {
    var match = text.match(reTest);
    var regexResult = '';

    if (match) {
      regexResult = new RegExp(match[1], match[2]);
    } else {
      try {
        regexResult = new RegExp(text);
      } catch (e) {
        /*
         * Escape special chars for invalid regular expressions. This may be caused from gitignore contents.
         * This will fail to parse and exclude any complex gitignore expression.
         */
        regexResult = new RegExp(text.replace(/(\*|\-|\+|\=|\<|\>|\!|\&|\,|\/|\.)/, '\\$1'));
      }
    }

    return regexResult;
    //return match ? new RegExp(match[1], match[2]) : ;
  }


  function getGitIgnoreExclusions(gitIgnore) {
    var noCommentsAndWhitespaceLinesFilter,
      ignoreLines,
      newLineRegex = /(?:\r\n|\r|\n)/g;

    if (!gitIgnore) {
      return [];
    }

    noCommentsAndWhitespaceLinesFilter = function (gitIgnoreLine) {
      var gitIgnoreCommentChar = '#',
        withoutWhitespace = gitIgnoreLine.replace(/\s/g, '');
      return gitIgnoreLine.slice(0, 1) !== gitIgnoreCommentChar && withoutWhitespace.length > 0;
    };

    ignoreLines = gitIgnore.split(newLineRegex);

    return ignoreLines.filter(noCommentsAndWhitespaceLinesFilter);
  }

  function fetchVariables(forceRefresh) {
    var projectRoot = ProjectManager.getProjectRoot();

    projectPath = projectRoot ? projectRoot.fullPath : null;

    excludeList = preferences
      .get(prefKey, {
        //not sure why need this for brackets to see it
        path: projectPath + '.brackets.json'
      }) || [];

    var deferred = new $.Deferred();

    var readingFiles = FileUtils.readAsText(FileSystem.getFileForPath(projectRoot.fullPath + '.gitignore'));

    readingFiles
      .done(function (gitIgnore) {
        excludeList = excludeList.concat(getGitIgnoreExclusions(gitIgnore)).map(toRegexp);
      })
      .fail(function () {
        //File not found
        excludeList = excludeList.map(toRegexp);
      })
      .always(function () {
        if (forceRefresh === true) {
          CommandManager.execute(Commands.FILE_REFRESH);
        }
        deferred.resolve(excludeList);
      });

    return deferred;
  }

  function clearVariables() {
    excludeList = projectPath = null;
  }

  // attach events
  ProjectManager.on('projectOpen', function () {
    fetchVariables(true).done(setFileSystemIndexFilter);
  });
  ProjectManager.on('projectRefresh', function () {
    fetchVariables(true).done(setFileSystemIndexFilter);
  });
  ProjectManager.on('beforeProjectClose', function () {
    clearVariables();
  });

  FileSystem.on('change', function (event, entry, added, removed) {
    // entry === null when manual refresh is done
    if (entry === null) {
      fetchVariables().done(setFileSystemIndexFilter);
    }
  });

  function setFileSystemIndexFilter() {
    // Filter itself
    FileSystemImpl.prototype._indexFilter = function (path, name) {
      if (!excludeList || !excludeList.length || !projectPath) {
        fetchVariables();

        if (!excludeList.length || !projectPath) {
          return _oldFilter.apply(this, arguments);
        }
      }

      var relativePath = path.slice(projectPath.length),
        excluded = _.any(excludeList, function (re) {
          if (re.test === undefined) {
            return toRegexp(re).test(relativePath);
          }
          return re.test(relativePath);
        });

      return excluded ? false : _oldFilter.apply(this, arguments);
    };
  }


});