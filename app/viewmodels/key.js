define(['durandal/app', 'knockout', 'plugins/http', 'plugins/router', 'underscore', 'papaparse', 'jqueryui', 'jquerymobile', 'bootstrap'],
    function (app, ko, http, router, _) {

        //TODO: move these to a config of sorts
        var URL_ARTSDATABANKEN = 'https://artsdatabanken.no/';

        var URL_API_TAXON = URL_ARTSDATABANKEN + 'Api/Taxon/';
        var URL_MEDIA = URL_ARTSDATABANKEN + 'Media/';
        var URL_PAGES = URL_ARTSDATABANKEN + 'Pages/';
        var URL_SCRIPTS = URL_ARTSDATABANKEN + 'Scripts';
        var URL_TAXON = URL_ARTSDATABANKEN + 'Taxon/';
        var URL_WIDGETS = URL_ARTSDATABANKEN + 'Widgets/';

        var URL_API_ARTSKART = 'https://pavlov.itea.ntnu.no/artskart/Api/';

        var widgetHtml = function(url){
            return '<div class="artsdatabanken-widget"><a href="' + url + '"></a></div><script src="' + URL_SCRIPTS + '/widget.js"></script>'
        };

        var getUrlParameter = function getUrlParameter(sParam) {
            var sPageURL = decodeURIComponent(window.location.search.substring(1)),
            sURLVariables = sPageURL.split('&');

            for (var i = 0; i < sURLVariables.length; i++) {
                var sParameterName = sURLVariables[i].split('=');

                if (sParameterName[0] === sParam) {
                    return sParameterName[1] === undefined ? true : sParameterName[1];
                }
            }
        };

        var l = ko.observable(getLanguage(getUrlParameter('lang') || 'no'));

        var key = {
                name: ko.observable(),
                geography: ko.observable(),
                language: ko.observable(),
                intro: ko.observable(),
                description: ko.observable(),
                taxa: ko.observableArray(),
                characters: ko.observableArray(),
                usesSubsets: false,
                usesMorphs: false,
                relevantTaxa: ko.pureComputed(function () {
                    return _.filter(key.taxa(), function (taxon) {
                        return taxon.reasonsToDrop === 0;
                    });
                }),
                irrelevantTaxa: ko.pureComputed(function () {
                    return _.uniq(_.filter(key.taxa(), function (taxon) {
                        return taxon.reasonsToDrop !== 0 && !(_.some(key.relevantTaxa(), {
                                'id': taxon.id,
                                'subset': taxon.subset
                            }));
                    }), function (taxon) {
                        return taxon.id + taxon.subset + taxon.morph;;
                    });
                }),

                remainingSubsets: ko.pureComputed(function () {
                    if(key.usesSubsets)
                        return _.uniq(key.relevantTaxa(), function(taxon) {return taxon.id + taxon.subset;}).length;
                    else
                        return _.uniq(key.relevantTaxa(), function(taxon) {return taxon.id;}).length;
                }),

                remainingMorphs: ko.pureComputed(function () {
                    return key.relevantTaxa().length;
                }),

                removed: ko.pureComputed(function () {
                    var uniqueSubsets = _.uniq(_.cloneDeep(removedTaxa()), function (taxon) {
                        return taxon.id + taxon.subset;
                    });

                    return uniqueSubsets.length;
                }),
                commonTaxonomy: ko.observable([]),
                foundTaxonomy: ko.pureComputed(function () {
                    var array = _.map(_.pluck(key.relevantTaxa(), 'taxonObject.AcceptedName.higherClassification'), function (tax) {
                        return _.slice(tax, key.commonTaxonomy().length);
                    });
                    return _.filter(_.first(array), function (firstItem) {
                        return _.every(_.rest(array), function (otherArray) {
                            return _.some(otherArray, function (otherItem) {
                                return _.isEqual(firstItem, otherItem);
                            });
                        });
                    });
                }),
                lastCommon: function () {
                    if (key.foundTaxonomy().length > 0)
                        return _.last(key.foundTaxonomy()).scientificName;
                    else return false;
                },
                taxaList: ko.pureComputed(function () {
                    var uniqueTaxa = _.uniq(_.cloneDeep(key.relevantTaxa()), function (taxon) {
                        return taxon.id;
                    });

                    if(key.usesMorphs) {
                        _.forEach(uniqueTaxa, function(t){
                            if(_.some(key.relevantTaxa(), function(r) {return r.id == t.id && r.morph != t.morph;})) {
                                t.morph = null;
                            }
                        });
                    }

                    if(!key.usesSubsets)
                        return uniqueTaxa;

                    var uniqueSubsets = _.uniq(_.cloneDeep(key.relevantTaxa()), function (taxon) {
                        return taxon.id + taxon.subset;
                    });

                    if(key.usesMorphs) {
                        _.forEach(uniqueSubsets, function(t){
                             if(_.some(key.relevantTaxa(), function(r) {return r.id == t.id && r.morph != t.morph;})) {
                                t.morph = null;
                            }
                        });
                    }

                    if(uniqueTaxa.length == 1) {
                        return uniqueSubsets;
                    }

                    for (i = 0; i < uniqueTaxa.length; i++)
                    {
                        var taxon = uniqueTaxa[i];
                        taxon.subset = (_(_.pluck(_.filter(uniqueSubsets, function(t) {return t.id === taxon.id && t.subset;}), 'subset')).toString()).replace(",","/");
                    }

                    return uniqueTaxa;
                }),

                droppedTaxa: ko.pureComputed(function () {

                    var uniqueSubsets = _.uniq(_.cloneDeep(key.irrelevantTaxa()), function (taxon) {
                        return taxon.id + taxon.subset;
                    });

                    if (uniqueSubsets.length === 1) {
                        return uniqueSubsets;
                    }

                    var uniqueTaxa = _.uniq(_.cloneDeep(uniqueSubsets), function (taxon) {
                        return taxon.id;
                    });

                    if(key.usesSubsets) {
                        for (i = 0; i < uniqueTaxa.length; i++)
                        {
                            var taxon = uniqueTaxa[i];
                            taxon.subset = (_(_.pluck(_.filter(uniqueSubsets, function(t) {return t.id === taxon.id && !!t.subset;}), 'subset')).toString()).replace(",","/");
                        }
                    }

                    return uniqueTaxa;
                }),

                listView: ko.observable(false),
                widgetHtml: ko.observable(false),
                widgetLink: ko.observable(false),
                showTaxon: ko.observable(false),
                //~ the id of the character that received the most recent input (needed for focus)
                lastAnswered:  ko.observable(null),
                //~ the id of the first unanswered question, unless the lastAnswered is still relevant
                focus: ko.pureComputed(function () {
                    if(key.lastAnswered() !== null) {
                        var character = _.find(key.characters(), function (char) {
                            return char.id === key.lastAnswered();
                        });
                        if(character.relevance() > 0) {
                            return key.lastAnswered();
                        }
                    }

                    if(key.characters_unanswered().length > 0) {
                        return _.first(key.characters_unanswered()).id;
                    }

                    return -1;

                }).extend({notify: 'always', rateLimit: 10}),

                firstCharacter: ko.pureComputed(function () {
                    //~ the id of the first question, regardless of answered or not
                    if(key.characters_answered().length > 0)
                        return _.first(key.characters_answered()).id;
                    if(key.characters_unanswered().length > 0)
                        return _.first(key.characters_unanswered()).id;
                    return -1;
                }).extend({notify: 'always', rateLimit: 10}),

                lastCharacter: ko.pureComputed(function () {
                    //~ the id of the last unanswered question
                    if(key.characters_unanswered().length > 0)
                        return _.last(key.characters_unanswered()).id;
                    return -1;
                }).extend({notify: 'always', rateLimit: 10}),



                //~ questions that have been fully answered
                characters_answered: ko.pureComputed(function () {
                    return _.sortBy(_.filter(key.characters(), function (character) {
                        return character.checked() && character.relevance() === 0;
                    }), function(a){return a.timestamp();});
                }),

                //~ questions that are relevant but have not been (fully) answered
                characters_unanswered: ko.pureComputed(function () {

                    //~ for (i = 0; i < array.length; i++)
                    //~ {
                        //~ array[i].states(_.sortBy(array[i].states(), function(a) {
                            //~ return [-a.status(), a.id];
                        //~ }));
                    //~ }


                    //~ sortBy won't work with multiple funtions :(
                    return _.sortBy(_.sortBy(_.sortBy(_.filter(key.characters(), function (character) {
                            return character.relevance() !== 0 && character.evaluate();
                        }), function(c){return c.skewness();}),'sort'), function(c){return c.skipped();});

                })
                //~ characters_hidden: ko.pureComputed(function () {
                    //~ return _.filter(key.characters(), function (character) {
                        //~ return !character.skipped() && (!character.evaluate() || (character.relevance() > 1));
                    //~ });
                //~ }),
                //~ characters_all: ko.pureComputed(function () {
                    //~ return _([]).concat(key.characters_checked(), key.characters_unanswered(), key.characters_skipped()).value();
                    //~ return _.filter(key.characters(), function (character) {
                        //~ return character.evaluate();
                    //~ });
                //~ }).extend({notify: 'always', rateLimit: 10})
            },

            removedTaxa = ko.observableArray(),

            parseCSV = function (array) {
                while(array[0].length > array[array.length-1].length)
                    array.pop();

                array = array.map(function(a) {return a.map(function(v) {return (typeof v === 'string' ? v.trim() : v);});});

                var self = this,
                    keyFields = ['key name', 'geographic range', 'language', 'key intro', 'key description'],
                    keyName, keyRange, keyLanguage, keyIntro, keyDescription, headerRow = 0, headerColumn = 2;

                while (!array[headerRow][0] || keyFields.indexOf(array[headerRow][0].toLowerCase()) !== -1) {
                    if (array[headerRow][0]) {
                        if (array[headerRow][0].toLowerCase() === keyFields[0])
                            keyName = array[headerRow][1];
                        else if (array[headerRow][0].toLowerCase() === keyFields[1])
                            keyRange = array[headerRow][1];
                        else if (array[headerRow][0].toLowerCase() === keyFields[2])
                            keyLanguage = array[headerRow][1];
                        else if (array[headerRow][0].toLowerCase() === keyFields[3])
                            keyIntro = array[headerRow][1];
                        else if (array[headerRow][0].toLowerCase() === keyFields[4])
                            keyDescription = array[headerRow][1];
                    }
                    headerRow++;
                }

                while (!array[0][headerColumn]) {
                    headerColumn++;
                }

                for (var row = headerRow + 1; row < array.length; row++) {
                    for (var col = headerColumn + 1; col < array[0].length; col++) {
                        array[row][col] = ("" + array[row][col]).replace(",", ".");
                        if (array[row][col] === "" || !(0 <= +array[row][col] && +array[row][col] <= 1))
                            array[row][col] = null;
                        else
                            array[row][col] = +array[row][col];
                    }
                }

                var taxonHeaders = [];
                for (var i = 0; i < headerRow; i++)
                    taxonHeaders.push(array[i][headerColumn]);

                var taxa = [],
                    taxonNameRow = taxonHeaders.indexOf('Name'),
                    taxonSubsetRow = taxonHeaders.indexOf('Subset'),
                    taxonMorphRow = taxonHeaders.indexOf('Morph'),
                    taxonIdRow = taxonHeaders.indexOf('Taxon'),
                    taxonMediaRow = taxonHeaders.indexOf('Media'),
                    taxonDescriptionRow = taxonHeaders.indexOf('Description'),
                    taxonSortRow = taxonHeaders.indexOf('Sort'),
                    taxonFollowupRow = taxonHeaders.indexOf('Followup');

                for (var i = headerColumn + 1; i < array[0].length; i++) {
                    taxa.push({
                        id: (taxonIdRow > -1 && array[taxonIdRow][i] && $.isNumeric(array[taxonIdRow][i]) ? array[taxonIdRow][i] : null),
                        index: i,
                        name: (taxonNameRow > -1 && array[taxonNameRow][i] ? array[taxonNameRow][i] : null),
                        subset: (taxonSubsetRow > -1 && array[taxonSubsetRow][i] ? array[taxonSubsetRow][i] : null),
                        morph: (taxonMorphRow > -1 && array[taxonMorphRow][i] ? array[taxonMorphRow][i] : null),
                        media: (taxonMediaRow > -1 && array[taxonMediaRow][i] ? array[taxonMediaRow][i] : null),
                        sort: (taxonSortRow > -1 && array[taxonSortRow][i] ? Number(array[taxonSortRow][i]) : 0),
                        description: (taxonDescriptionRow > -1 && array[taxonDescriptionRow][i] ? array[taxonDescriptionRow][i] : null),
                        followup: (taxonFollowupRow > -1 && array[taxonFollowupRow][i] ? array[taxonFollowupRow][i] : null),
                        taxonObject: null,
                        stateValues: []
                    });
                    if(!key.usesSubsets && taxonSubsetRow > -1 && array[taxonSubsetRow][i]) key.usesSubsets = true;
                    if(!key.usesMorphs && taxonMorphRow > -1 && array[taxonMorphRow][i]) key.usesMorphs = true;
                }

                var characterHeaders = [];
                for (var i = 0; i < headerColumn; i++)
                    characterHeaders.push(array[headerRow][i]);

                var characters = [],
                    characterNameCol = characterHeaders.indexOf('Character'),
                    stateNameCol = characterHeaders.indexOf('State'),
                    stateRefCol = characterHeaders.indexOf('State id'),
                    characterRuleCol = characterHeaders.indexOf('Character requirement'),
                    stateMediaCol = characterHeaders.indexOf('State media'),
                    characterMultiCol = characterHeaders.indexOf('Multistate character'),
                    characterSort = characterHeaders.indexOf('Sort'),
                    characterDescription = characterHeaders.indexOf('Description');

                for (var i = headerRow + 1; i < array.length; i++) {
                    var characterName = (characterNameCol > -1 && array[i][characterNameCol] ? array[i][characterNameCol] : null),
                        stateName = (stateNameCol > -1 && array[i][stateNameCol] ? array[i][stateNameCol] : null),
                        ref = (stateRefCol > -1 && array[i][stateRefCol] ? array[i][stateRefCol] : null),
                        rule = (characterRuleCol > -1 && array[i][characterRuleCol] ? array[i][characterRuleCol] : null),
                        media = (stateMediaCol > -1 && array[i][stateMediaCol] ? array[i][stateMediaCol] : null),
                        sort = (characterSort > -1 && array[i][characterSort] ? Number(array[i][characterSort]) : 0),
                        description = (characterDescription > -1 && array[i][characterDescription] ? array[i][characterDescription] : null),
                        multi = (characterMultiCol > -1 && array[i][characterMultiCol] && array[i][characterMultiCol].toLowerCase() === "true");

                    if (!stateName)
                        break;

                    var values = array[i].slice(headerColumn + 1);

                    if (characterName) {
                        characters.push({
                            id: i,
                            string: characterName,
                            sort: sort,
                            description: description,
                            rule: rule,
                            multistate: multi,
                            valuePattern: [],
                            stateOrder: [],
                            twins: [],
                            states: ko.observableArray()
                        });
                    }

                    characters[characters.length - 1].states.push({
                        parent: characters[characters.length - 1].id,
                        id: i,
                        string: stateName,
                        ref: ref,
                        media: media
                    });

                    characters[characters.length - 1].valuePattern.push([characters[characters.length - 1].states().length - 1, values]);


                    for (var j = 0; j < values.length; j++) {
                        if (_.isFinite(values[j]))
                            taxa[j].stateValues.push({state: i, value: values[j], characterString: characters[characters.length - 1].string, stateString: characters[characters.length - 1].states()[characters[characters.length - 1].states().length - 1].string});
                    }
                }

                for (i = 0; i < characters.length; i++)
                {
                    characters[i].valuePattern = _.sortBy(characters[i].valuePattern, function(a) {
                        return a[1];
                    });

                    characters[i].stateOrder = _.map(characters[i].valuePattern, function(x){return x[0];});
                    characters[i].valuePattern = (_.map(characters[i].valuePattern, function(x){return x[1].toString();})).toString();
                }

                key.name(keyName);
                key.geography(keyRange);
                key.language(keyLanguage);
                l(getLanguage((getUrlParameter('lang')) || keyLanguage || 'no'));
                key.intro(keyIntro);
                key.description(keyDescription);

                fillKey(taxa, characters);
            },

            fillKey = function (taxa, characters) {
                var gettingAbundances = [],
                    gettingTaxa = [],
                    idCounter = 0,
                    urlTaxa = getUrlParameter('taxa');

                if(urlTaxa)
                    urlTaxa = urlTaxa.split(',').map(function(x){return +x;});
                else
                    urlTaxa = [];

                _.forEach(taxa, function (taxon) {
                    taxon.vernacular = taxon.name || 'Loading...';
                    taxon.scientific = '';
                    taxon.reasonsToDrop = 0;
                    taxon.removed = false;

                    taxon.imageUrl = function (argString) {
                        if (taxon.media === null)
                            return null;
                        else if (taxon.media.indexOf('/') === -1){
                            return URL_MEDIA + taxon.media + '?' + argString;
                        }
                        else
                            return taxon.media + '?' + argString;
                    }
                    gettingTaxa.push(function (taxon) {
                        var dfd = $.Deferred();
                        $.getJSON(URL_API_TAXON + taxon.id, function (data) {
                            taxon.taxonObject = {
                                'AcceptedName' : {
                                    'scientificName' : data.AcceptedName.scientificName,
                                    'higherClassification' : []
                                }
                            };

                            if(data.PreferredVernacularName) {
                                taxon.taxonObject.PreferredVernacularName = {'vernacularName' : data.PreferredVernacularName.vernacularName};
                            }

                            for (var i = 0; i < data.AcceptedName.higherClassification.length; i++) {
                                var higher = {};
                                if(data.AcceptedName.higherClassification[i].taxonRank) higher.taxonRank = data.AcceptedName.higherClassification[i].taxonRank;
                                if(data.AcceptedName.higherClassification[i].scientificName) higher.scientificName = data.AcceptedName.higherClassification[i].scientificName;
                                if(data.AcceptedName.higherClassification[i].taxonID) higher.taxonID = data.AcceptedName.higherClassification[i].taxonID;
                                taxon.taxonObject.AcceptedName.higherClassification.push(higher);
                            }

                            if (data.AcceptedName) {
                                taxon.scientific = data.AcceptedName.scientificName;
                                var higher = {};
                                if(data.AcceptedName.taxonRank) higher.taxonRank = data.AcceptedName.taxonRank;
                                if(data.AcceptedName.scientificName) higher.scientificName = data.AcceptedName.scientificName;
                                higher.taxonID = +taxon.id;
                                taxon.taxonObject.AcceptedName.higherClassification.push(higher);
                            }
                        }).done(function () {
                            if (taxon.taxonObject) {
                                if(urlTaxa.length > 0 && taxon.taxonObject.AcceptedName && _.intersection(_.map(taxon.taxonObject.AcceptedName.higherClassification, 'taxonID'), urlTaxa).length < 1)
                                    taxon.remove = true;

                                if (taxon.taxonObject.PreferredVernacularName)
                                    taxon.vernacular = _.capitalize(taxon.taxonObject.PreferredVernacularName.vernacularName);
                                else if (taxon.taxonObject.AcceptedName)
                                    taxon.vernacular = taxon.scientific;
                            }
                        }).always(function () {
                            dfd.resolve(taxon.taxonObject);
                        });
                        return dfd.promise();
                    }(taxon));
                });

                taxa = _.sortBy(taxa, 'sort');

                key.taxa(taxa);

                $.when.apply($, gettingTaxa).then(function () {
                    key.taxa(taxa);
                    taxa = _.filter(taxa, function(t){return t.remove !== true;});

                    var array = _.pluck(key.taxa(), 'taxonObject.AcceptedName.higherClassification');
                    key.commonTaxonomy(_.filter(_.first(array), function (firstItem) {
                        return _.every(_.rest(array), function (otherArray) {
                            return _.some(otherArray, function (otherItem) {
                                return _.isEqual(firstItem, otherItem);
                            });
                        });
                    }));

                    //~ fetch abundances from the API if there are other taxa with the same sort
                    _.forEach(_.uniq(taxa, function (taxon) {
                        return taxon.id;
                    }), function (taxon) {
                        if(_.some(taxa, function(t) {return t.id !== taxon.id && t.sort === taxon.sort;})) {
                            gettingAbundances.push(function (taxon) {
                                var dfd = $.Deferred();
                                $.getJSON(URL_API_ARTSKART + 'Observations/list/?pageSize=0&taxons[]=' + taxon.id, function (data) {
                                    _.forEach(_.filter(taxa, function (t) {
                                        return t.id === taxon.id;
                                    }), function (taxon) {
                                        taxon.abundance = data.TotalCount;
                                    });
                                }).done(function () {
                                    dfd.resolve(taxon.abundance);
                                });
                                return dfd.promise();
                            }(taxon));
                        }
                    });

                    $.when.apply($, gettingAbundances).then(function () {
                        //~ lodash 3.10 has no orderBy
                        key.taxa(_.sortBy(_.sortBy(taxa, function(tt){return -tt.abundance;}),'sort'));
                    });
                });

                _.forEach(characters, function (character) {
                    _.forEach(character.states(), function (state) {
                        state.checked = ko.observable(null);
                        state.imageUrl = function (argString) {
                            if (state.media === null)
                                return null;
                            else if (state.media.indexOf("/") === -1)
                                return URL_MEDIA + state.media + "?" + argString;
                            else
                                return state.media + "?" + argString;
                        };
                    });

                    character.checked = ko.pureComputed(function () {
                        return _.some(character.states(), function (state) {
                            return state.checked() !== null;
                        });
                    });

                    character.showFalse = character.multistate || character.states().length !== 2;
                    character.timestamp = ko.observable(0);
                    character.skipped = ko.observable(false);

                    character.evaluate = ko.pureComputed(function () {
                        if (!character.rule) return true;
                        var string = character.rule;

                        while (~string.indexOf('{')) {
                            var start = string.indexOf('{');
                            var stop = string.indexOf('}');
                            string = string.substring(0, start) + evaluateState(string.substring(start + 1, stop)) + string.substring(stop + 1);
                        }
                        return !!eval(string);

                        //~ returns the boolean value of a state with a provided ref. True when either checked manually or 1 for all remaining taxa
                        function evaluateState(ref) {
                            return (_.find(_.find(characters, function (char) {
                                    return _.some(char.states(), function (s) {
                                        return s.ref === ref;
                                    });
                                }).states(), function (state) {
                                    return state.ref === ref;
                                })).status() === 1;
                        }
                    });

                    _.forEach(character.states(), function (state) {
                        state.zeroes = ko.pureComputed(function () {
                            return _.filter(key.relevantTaxa(), function (taxon) {
                                return _.some(taxon.stateValues, {state: state.id, value: 0});
                            }).length;
                        });

                        state.status = ko.pureComputed(function () {
                            if (state.checked() !== null) return state.checked();
                            if (character.checked() && !character.multistate) {
                                if (_.some(character.states(), function (state) {
                                        return state.checked() === 1;
                                    })) {
                                    return -1; // Was 0
                                }
                                if (character.states().length === 2) {
                                    return 1;
                                }
                            }
                            if (state.zeroes() === key.relevantTaxa().length) return -1; // Was 0
                            if ((_.filter(key.relevantTaxa(), function (taxon) {
                                    return _.some(taxon.stateValues, {state: state.id, value: 1});
                                })).length === key.relevantTaxa().length) return 1;
                            return null;
                        });

                        state.relevance = ko.pureComputed(function () {
                            //~ if you know the answer, or it does not matter (like when there's one answer left or it's never false), it's a silly question
                            //~ if the state excludes all or no taxa, it is not relevant, unless it is needed for a later evaluation
                            if (state.status() !== null || key.relevantTaxa().length === 1 || (state.zeroes() === 0 && state.ref == null)) {
                                return 0;
                            }

                            //~ otherwise, as long as it's never totally unknown (even when not distinctive), it's always a valid question
                            var haveValues = _.filter(key.relevantTaxa(), function (taxon) {
                                return _.some(taxon.stateValues, {state: state.id});
                            });
                            if (key.relevantTaxa().length === haveValues.length) {
                                return 1;
                            }

                            //~ Otherwise it is always silly
                            return 0;
                        });
                    });

                    character.relevance = ko.pureComputed(function () {
                        //~ average of all state relevances
                        if(key.remainingSubsets() < 2)
                            return 0;

                        var stateRelevances = _.filter(_.map(character.states(), function (state) {
                            return state.relevance();
                        }), function (n) {
                            return n > 0;
                        });

                        return _.reduce(stateRelevances, function (memo, num) {
                                return memo + num;
                            }, 0) / (stateRelevances.length === 0 ? 1 : stateRelevances.length);
                    });

                    character.skewness = ko.pureComputed(function () {
                        if (character.relevance === 0)
                            return 1;

                        //~ if there are any conflicting morphs it will be moved to the end of the list by setting a high skewness here
                        if(key.usesMorphs) {
                            for (var i = 0; i < character.states().length; i++)
                            {
                                if(_.some(key.relevantTaxa(), function(t) {
                                    return _.some(key.relevantTaxa(), function(r) {
                                        return (r.id == t.id && r.subset == t.subset && !_.isEqual(_.find(t.stateValues, {'state': character.states()[i].id}), _.find(r.stateValues, {'state': character.states()[i].id})));
                                    });
                                })) {
                                    return 1;
                                }
                            }
                        }

                        var relevantStates = _.filter(character.states(), function (state) {
                                return state.status() === null;
                            }),
                            perfect = key.relevantTaxa().length * (1 - (1 / relevantStates.length));

                        return Math.sqrt(_.reduce(relevantStates, function (total, state) {
                                return total + ((state.zeroes() - perfect) * (state.zeroes() - perfect));
                            }, 0) / relevantStates.length);
                    });
                });

                for (i = 0; i < characters.length; i++) {
                    for(j = i+1; j < characters.length; j++) {
                        if(characters[i].valuePattern === characters[j].valuePattern) {
                            var reordered = [];

                            for (x = 0; x < characters[i].stateOrder.length; x++)
                            {
                                reordered.push(characters[j].states()[characters[j].stateOrder.indexOf(characters[i].stateOrder[x])]);
                            }
                            characters[j].states(reordered);
                            characters[i].twins.push(characters[j]);
                            characters.splice(j,1);
                            j--;
                        }
                    }
                }

                key.characters(characters);
            },

            resetAll = function () {
                _.forEach(key.characters(), function (character) {
                    character.skipped(false);
                    character.timestamp(0);
                    _.forEach(character.states(), function (state) {
                        state.checked(null);

                    });
                });

                _.forEach(key.taxa(), function (taxon) {
                    taxon.reasonsToDrop = 0;
                    taxon.removed = false;
                });
                key.taxa.valueHasMutated();
            },

            dropTaxon = function (array, value) {
                _.forEach(array, function (index) {
                    var taxon = _.find(key.taxa(), _.matchesProperty('index', index));
                    taxon.reasonsToDrop += value;
                    if (value > 0)
                        taxon.removed = true;
                    else
                        taxon.removed = false;
                });
                key.taxa.valueHasMutated();
            },

            setState = function (id, parent, value) {
                var character = _.find(key.characters(), function (char) {
                        return char.id === parent;
                    }),
                    state = _.find(character.states(), function (state) {
                        return state.id === id;
                    }),
                    oldValue = state.checked();
                state.checked(value);
                character.timestamp(Date.now());

                _.forEach(key.taxa(), function (taxon) {
                    if (value === 1 && _.find(taxon.stateValues, {
                            'state': state.id,
                            'value': 0
                        })) taxon.reasonsToDrop = taxon.reasonsToDrop + 1;
                    else if (value === -1 && _.find(taxon.stateValues, {
                            'state': state.id,
                            'value': 1
                        })) taxon.reasonsToDrop = taxon.reasonsToDrop + 1;
                    else if (value === null && oldValue === 1 && _.find(taxon.stateValues, {
                            'state': state.id,
                            'value': 0
                        })) taxon.reasonsToDrop = taxon.reasonsToDrop - 1;
                    else if (value === null && oldValue === -1 && _.find(taxon.stateValues, {
                            'state': state.id,
                            'value': 1
                        })) taxon.reasonsToDrop = taxon.reasonsToDrop - 1;
                    //~ when undoing a partial state answer, if all other relevant states are zero for that taxon, decrease reasons to drop
                    else if (value === null && oldValue === -1 && _.find(taxon.stateValues, function(sv){
                            return sv.state == state.id && sv.value > 0;
                            })) {
                        var restoreIt = true;
                        var si = 0;
                        while (si < character.states().length && restoreIt) {
                            var cs = character.states()[si];
                            restoreIt = (cs.id === state.id || cs.relevance() !== 1 || !(_.find(taxon.stateValues, function(sv){
                                return sv.state === cs.id && sv.value > 0;
                            })));
                            si++;
                        }
                        if(restoreIt)
                            taxon.reasonsToDrop = taxon.reasonsToDrop - 1;
                    }

                    //~ if this excludes the last partial option for a taxon, it also has to be dismissed
                    else if (value === -1 && _.find(taxon.stateValues, function(sv) {
                            return sv.state === state.id && 1 > sv.value && sv.value > 0;
                        })) {
                            //~ for each other relevant state in character, check if it is zero. If all are zero, drop taxon
                            var keepIt = false;
                            var si = 0;
                            while (si < character.states().length && !keepIt) {
                                var cs = character.states()[si];
                                keepIt = (cs.id != state.id && cs.relevance() === 1 && _.find(taxon.stateValues, function(sv){
                                    return sv.state === cs.id && sv.value > 0;
                                }));
                                si++;
                            }
                            if(!keepIt)
                                taxon.reasonsToDrop = taxon.reasonsToDrop + 1;
                        }
                });
                key.lastAnswered(character.id);
                key.taxa.valueHasMutated();
            },

            loadCSVurl = function (url) {
                http.get(url).then(function (response) {
                    var pp = Papa.parse(response);

                    if(pp.errors.length == 0 && pp.data.length > 2 && pp.data[2].length > 2)
                        parseCSV(pp.data);
                    else
                        alert(l().invalidInput);
                });
            },

            loadCSVarray = function (array) {
                parseCSV(array);
            };

        return {
            //~ key object serving what the GUI needs
            key: key,
            l: l,

            toggleListView: function () {
                key.listView(!key.listView());
            },

            loadCSV_parent: function (array) {
                loadCSVarray(parent.hotData);
            },

            removeSelected: function (taxon) {
                //~ if there is one taxon id left, remove all with the current subset
                if (key.usesSubsets && _.uniq(_.cloneDeep(key.relevantTaxa()), function (t) {
                        return t.id;
                    }).length === 1) {
                    var removing = _.pluck(_.filter(key.taxa(), function (t) {
                        return t.id === taxon.id && t.subset === taxon.subset
                    }), 'index');
                }

                //~ otherwise remove all with that id
                else {
                    var removing = _.pluck(_.filter(key.taxa(), function (t) {
                        return t.id === taxon.id
                    }), 'index');
                }

                removedTaxa.push(removing);
                dropTaxon(removing, 1);

                if (key.remainingSubsets() === 1 || (key.characters_unanswered().length == 0)) {
                    if (key.remainingSubsets() === 1) key.showTaxon(key.taxaList()[0]);
                    $('#taxonModal').modal('show');
                }
            },

            undoRemoval: function (taxon) {
                if (taxon.index) {
                    //~ a particular taxon is provided: find its removal event and unremove all siblings in that array
                    var deletion = _.find(removedTaxa(), function (l) {
                        return _.includes(l, taxon.index);
                    });
                    _.forEach(deletion, function (i) {
                        dropTaxon([i], -1);
                    });
                    removedTaxa(_.reject(removedTaxa(), function (t) {
                        return t[0] === taxon.index;
                    }));
                }
                else
                    dropTaxon(removedTaxa.pop(), -1);
            },

            closeModal: function (t) {
                key.widgetHtml("<i class=\"fa fa-spinner fa-pulse fa-5x\"></i>");
                key.showTaxon(false);
            },

            enlargeImage: function (t) {
                var taxon = (_.has(t, 'key') ? key.relevantTaxa()[0] : t);
                if (taxon.imageUrl === null)
                    return;

                if ($('#taxonModal').is(':visible')) {
                    $('#taxonModal').modal('hide');
                }
                $('#widgetModal').modal('show');


                if (taxon.media.indexOf("/") === -1) {
                     //~ $.get('https://data.artsdatabanken.no/Databank/Content/' + taxon.media + '?Template=Inline', function (data) {
                     $.get(URL_WIDGETS + taxon.media + '?Template=Inline', function (data) {
                        //~ key.widgetHtml("<div class=\"artsdatabanken-widget\"><a href=\"https://data.artsdatabanken.no/Databank/Content/" + taxon.media + "?Template=Inline\"></a></div><script src=\"https://data.artsdatabanken.no/Scripts/widget.js\"></script>");
                        key.widgetHtml(widgetHtml(URL_WIDGETS + taxon.media));
                        key.widgetLink(false);
                    });


                    //~ $.get("https://data.artsdatabanken.no/Widgets/F" + taxon.media, function (data) {
                        //~ key.widgetHtml("<div class=\"artsdatabanken-widget\"><a href=\"https://data.artsdatabanken.no/Widgets/F" + taxon.media + "\"></a></div><script src=\"https://data.artsdatabanken.no/Scripts/widget.js\"></script>");
                    //~ });
                    //~ console.log("https://data.artsdatabanken.no/Databank/Content/" + taxon.media + "?Template=Inline");
                    //~ $.get("https://data.artsdatabanken.no/Databank/Content/F" + taxon.media + "?Template=Inline", function (data) {
                        //~ key.widgetHtml(data);
                    //~ });



                }
                else
                    key.widgetHtml('<img src="' + taxon.media + '"/>');
                    key.widgetLink(taxon.media);
            },

            showTaxonModal: function (t) {
                key.widgetHtml('<i class="fa fa-spinner fa-pulse fa-5x"></i>');
                key.showTaxon(t);


                $('#taxonModal').modal('show');
            },

            showDescription: function (t) {
                key.widgetHtml('<i class="fa fa-spinner fa-pulse fa-5x"></i>');

                if ($('#taxonModal').is(':visible')) {
                    $('#taxonModal').modal('hide');
                }

                $('#widgetModal').modal('show');

                var taxon = (_.has(t, 'key') ? key.relevantTaxa()[0] : t);

                if (!taxon.widgetHtml) {
                    if (taxon.description > 0) {
                        $.get(URL_WIDGETS + taxon.description, function (data) {
                            taxon.widgetHtml = widgetHtml(URL_WIDGETS + taxon.description);
                            //~ key.taxa.valueHasMutated();
                            key.widgetHtml(taxon.widgetHtml);
                            key.widgetLink(URL_PAGES + taxon.description);
                        });
                    }
                }
                else {
                    key.widgetHtml(taxon.widgetHtml);
                    key.widgetLink(URL_PAGES + taxon.description);
                }

            },

            showTaxonPage: function (t) {
                key.widgetHtml('<i class="fa fa-spinner fa-pulse fa-5x"></i>');

                if ($('#taxonModal').is(':visible')) {
                    $('#taxonModal').modal('hide');
                }

                $('#widgetModal').modal('show');

                var taxon = (_.has(t, 'key') ? key.relevantTaxa()[0] : t);

                if (taxon.id > 0) {
                    $.get(URL_WIDGETS + '/Taxon/' + taxon.id, function (data) {
                        key.widgetHtml(widgetHtml(URL_WIDGETS+ '/Taxon/' + taxon.id));
                        key.widgetLink(URL_TAXON + taxon.id);
                    });
                }
            },

            showStateHelp: function (s) {
                key.widgetHtml('<i class="fa fa-spinner fa-pulse fa-5x"></i>');
                $('#widgetModal').modal('show');
                $.get(URL_WIDGETS + s.description, function (data) {
                    key.widgetHtml(widgetHtml(URL_WIDGETS + s.description));
                    key.widgetLink(URL_PAGES + s.description);
                });
            },

            showAboutWidget: function (s) {

                var printJSON = function(thing) {
                    var returnValue = "";

                    if(_.isFunction(thing)) {
                         returnValue += printJSON(thing());
                    }
                    else if(_.isArray(thing)) {
                         returnValue += "[";
                         for (var i = 0; i < thing.length; i++) {
                             if(i > 0) returnValue += ",";
                             returnValue += printJSON(thing[i]);
                         }
                         returnValue += "]";
                     }
                     else if(_.isObject(thing)) {
                         returnValue += "{";
                         for (var item in thing) {
                            var thisValue = printJSON(thing[item]);
                            if(thisValue != "null") {
                                returnValue += "\"" + item + "\" : ";
                                returnValue += thisValue;
                                returnValue += ",";
                            }
                         }
                         if(returnValue.length > 1)
                            returnValue = returnValue.substring(0, returnValue.length-1) + "}";
                         else
                            returnValue = "";
                     }
                     else if(_.isString(thing)) {
                         returnValue += "\"" + thing + "\"";
                     }
                     else {
                         returnValue += thing;
                     }

                     return returnValue;
                };

                console.log("{" +
                    "\"name\" : " + printJSON(key.name) + "," +
                    "\"geography\" : " + printJSON(key.geography) + "," +
                    "\"language\": " + printJSON(key.language) + "," +
                    "\"intro\" : " + printJSON(key.intro) + "," +
                    "\"description\" : " + printJSON(key.description) + "," +
                    "\"taxa\" : " + printJSON(key.taxa) + "," +
                    "\"characters\" : " + printJSON(key.characters) + "," +
                    "\"usesSubsets\" : " + printJSON(key.usesSubsets) + "," +
                    "\"usesMorphs\" : " + printJSON(key.usesMorphs) +
                "}");

                key.widgetHtml('<i class="fa fa-spinner fa-pulse fa-5x"></i>');

                if ($('#aboutKeyModal').is(':visible')) {
                    $('#aboutKeyModal').modal('hide');
                }

                $('#widgetModal').modal('show');

                $.get(URL_WIDGETS + key.description(), function (data) {
                    key.widgetHtml(widgetHtml(URL_WIDGETS + key.description()));
                    key.widgetLink(URL_PAGES + key.description());
                });
            },

            inputTrue: function (state) {
                //~ set the checked state if it has no status yet
                if (state.status() === null) {
                    setState(state.id, state.parent, 1);
                    if (key.listView() && $('#focus')[0]) $('#focus')[0].scrollIntoView(true);

                    if (key.remainingSubsets() === 1 || (key.characters_unanswered().length == 0)) {
                        if (key.remainingSubsets() === 1) key.showTaxon(key.taxaList()[0]);
                        $('#taxonModal').modal('show');
                    }
                }
            },

            inputFalse: function (state) {
                //~ set the checked state if it has no status yet
                if (state.status() === null) {
                    setState(state.id, state.parent, -1);
                    if (key.listView() && $('#focus')[0]) $('#focus')[0].scrollIntoView(true);

                    if (key.remainingSubsets() === 1 || (key.characters_unanswered().length == 0)) {
                        if (key.remainingSubsets() === 1) key.showTaxon(key.taxaList()[0]);
                        $('#taxonModal').modal('show');
                    }
                }
            },

            inputReset: function (state) {
                //~ reset the checked state if it had been checked explicitly
                if(state.checked() !== null) setState(state.id, state.parent, null);
            },

            skipCharacter: function (character) {
                _.find(key.characters(), function (char) {
                    return char.id === character.id;
                }).skipped(true);
            },

            resetAll: function () {
                if (confirm(l().ConfirmReset)) {
                    removedTaxa([]);
                    key.widgetHtml(false);
                    key.lastAnswered(null);
                    resetAll();
                }
            },

            getView: function() {
                var csvUrl = getUrlParameter('csv');
                if (csvUrl) {
                    loadCSVurl(csvUrl);
                }

                var fg = getUrlParameter('fg') || 'E86C19';
                var bg = getUrlParameter('bg') || 'fff';
                var height = getUrlParameter('height') || '100%';
                var sheet = document.createElement('style');
                sheet.innerHTML = 'html, body {height: ' + height + ';}\
                    .fg {color: #' + fg + ' !important;}\
                    .bg {color: #' + bg + ' !important;}\
                    .ui-state-default {background-color: #' + bg + ' !important;}\
                    .ui-state-default a {color: #' + fg + ' !important;}\
                    .ui-tabs-active {background-color: #' + fg + ' !important;}\
                    .ui-tabs-active a {color: #' + bg + ' !important;}\
                    .colorize {color: #' + fg + ' !important; background-color: #' + bg + ' !important; text-shadow: unset !important;}';

                if(getUrlParameter('minimal')) {
                    sheet.innerHTML += '.colorize_negative {color: #' + fg + ' !important; background-color: #' + bg + ' !important;}';
                    sheet.innerHTML += '.colorize_negative a {color: #' + fg + ' !important;}';
                    sheet.innerHTML += '.colorize_neutral {color: #000 !important; background-color: #fff !important;}';
                    sheet.innerHTML += '.colorize_hide {visibility: hidden !important; width: 0px !important; height: 0px !important; padding: 0px !important;}';
                }
                else
                {
                    sheet.innerHTML += '.colorize_negative, .colorize_neutral, .colorize_hide {color: #' + bg + ' !important; background-color: #' + fg + ' !important;  text-shadow: unset !important;}';
                    sheet.innerHTML += '.minimal_only {visibility: hidden !important; height: 0px !important; padding: 0px !important;}';
                    sheet.innerHTML += '.colorize_negative a {color: #' + bg + ' !important;}';
                    sheet.innerHTML += '.colorize_negative .btn-default {background-color: #' + fg + ' !important; text-shadow: unset !important; box-shadow: none; border: none;}';
                }

                document.body.appendChild(sheet);
            },

            compositionComplete: function(view, parnt) {
                $('#tabs').tabs();
                $('#tabs').tabs('option', 'active', 0);


                $('#character-carousel').swiperight(function () {
                    $('.carousel').carousel('prev');
                });

                $('#character-carousel').swipeleft(function () {
                    $('.carousel').carousel('next');
                });

                parent.postMessage(document.body.scrollHeight, '*');
            }
        };
    });
