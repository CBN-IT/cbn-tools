# CBN Polymer Tools

## Description

NodeJS-based tools for Polymer projects.

Features:
- configurable gulp-based build system;
- vulcanization, CSS and JavaScript preprocessing (PostCSS, Babel etc.);
- gulp-watch event notification + rebuild task;

## Installing

You can install it directly from the git repository by using the following command:
```
npm install -g git+ssh://git@bitbucket.org:cbn-it/cbn-tools.git
```

## Usage

```
cbn init # creates a default cbn-build.js file
cbn # runs all build tasks - vulcanize, CSS, JS processors (for the development environment)
cbn --env production # change the environment
cbn vulcanize # vulcanizes all configured files
cbn copy # runs the copy task, which copies all components / other files
cbn watch # Watches the files for changes and rebuilds when this happens
```
