# Brackets File Tree Exclude

Brackets extension for excluding folders and files from the file tree, find in files, and quick open.

This means that the files will be completely invisible to Brackets what will greatly improve overall performance of the editor.

This is great for cache folders, distribution/build folders and files, and package manager folders like `node_modules` and `bower_components`.

## Based on works of:

 - [zaggino/brackets-file-tree-exclude](https://github.com/zaggino/brackets-file-tree-exclude)
 - [JonathanWolfe/file-tree-exclude](https://github.com/JonathanWolfe/file-tree-exclude)
 - [gruehle/exclude-folders](https://github.com/gruehle/exclude-folders)
 - [mitchellsimoens/brackets-file-tree-exclude](https://github.com/mitchellsimoens/brackets-file-tree-exclude)

## How to install

Install via the Brackets extension manager.

Use [brackets-npm-registry](https://github.com/zaggino/brackets-npm-registry)

## Configure

Exclusions are defined globally by default inside the Brackets preferences file (_Debug > Open preferences file_).

Append or edit your configuration options there. (See below for example of defaults)

**Or on a per project basis:**

Create a `.brackets.json` in project root (it may already exist) and add your settings there.

## Note

**Project config completely redefine exclusion rules from global config.**

## Configuration defaults

```JSON
{
    "dimitrk.exclude-indexing-filetree.excludeList": [
        ".git(?!ignore)",
        "dist",
        "bower_components",
        "node_modules"
    ]
}
```

## How it Matches

It tries to parse simple folder paths on your project's .gitignore file beside any 
regular expressions found on config. As opposed with the config file, **any wildcard 
expressions found on .gitignore will be not interpreted as such** due to the different 
natures of .gitignore expressions and JavaScript RegExps.

It takes the `excludeList` array (either the default or if `.brackets.json` file
exists in the project root) and turns each string into a regular expression. So
if a string is `"node_modules"` then it will turn it into
`new RegExp("node_modules")`. You can specify expressions as strings also. So
if a string is `"/foo/i"`, then it will turn it into `new RegExp("foo", "i")`.

The resulting expressions are then matched against the realtive path fo the file
in the tree.
