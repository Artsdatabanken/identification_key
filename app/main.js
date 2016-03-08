requirejs.config({
    paths: {
        'text': '../lib/require/text',
        'durandal': '../lib/durandal/js',
        'plugins': '../lib/durandal/js/plugins',
        'transitions': '../lib/durandal/js/transitions',
        'knockout': '../lib/knockout/knockout-3.3.0',
        'jquery': '../lib/jquery/jquery-1.11.3.min',
        'bootstrap': '../lib/bootstrap/js/bootstrap.min',
        'underscore': '../lib/lodash/lodash',
        'jqueryui': '../lib/jquery-ui/jquery-ui.min',
        'jquerymobile': '../lib/jquery-mobile/jquery.mobile.custom.min',
        'papaparse': '../lib/papaparse/papaparse.min'
    }
});

define(function (require) {
    var system = require('durandal/system'),
        app = require('durandal/app'),
        viewLocator = require('durandal/viewLocator');

    system.debug(true);

    app.title = 'NBIC identification key';

    run = function (array) {
        console.log(parent.hotData);
    };


    app.configurePlugins({
        router: true,
        dialog: true
    });

    app.start().then(function () {
        viewLocator.useConvention();
        app.setRoot('viewmodels/key');
    });
});
