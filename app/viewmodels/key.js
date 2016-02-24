define(['durandal/app', 'knockout', 'plugins/http', 'plugins/router', 'underscore', 'papaparse', 'jqueryui', 'jquerymobile', 'bootstrap'],
    function (app, ko, http, router, _) {

        var key = {
                name: ko.observable(),
                geography: ko.observable(),
                language: ko.observable(),
                intro: ko.observable(),
                description: ko.observable(),
                taxa: ko.observableArray(),
                characters: ko.observableArray(),
                relevantTaxa: ko.pureComputed(function () {
                    return _.uniq(_.filter(key.taxa(), function (taxon) {
                        return taxon.reasonsToDrop === 0;
                    }), function (taxon) {
                        return taxon.id + taxon.subset;
                    });
                }),
                irrelevantTaxa: ko.pureComputed(function () {
                    return _.uniq(_.filter(key.taxa(), function (taxon) {
                        return taxon.reasonsToDrop !== 0 && !(_.some(key.relevantTaxa(), {
                                'id': taxon.id,
                                'subset': taxon.subset
                            }));
                    }), function (taxon) {
                        return taxon.id + taxon.subset;
                    });
                }),

                remaining: ko.pureComputed(function () {
                    return key.relevantTaxa().length;
                }),
                removed: ko.pureComputed(function () {
                    return _.flatten(removedTaxa()).length;
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
                    var unique = _.uniq(_.clone(key.relevantTaxa(), true), function (taxon) {
                        return taxon.id;
                    });
                    if (unique.length === 1 && unique[0].subset) {
                        return key.relevantTaxa();
                    }

                    _.forEach(unique, function (taxon) {
                        taxon.subset = _(_.pluck(_.where(key.relevantTaxa(), {'id': taxon.id}), 'subset')).toString();
                    });

                    return unique;
                }),

                droppedTaxa: ko.pureComputed(function () {
                    var unique = _.uniq(_.clone(key.irrelevantTaxa(), true), function (taxon) {
                        return taxon.id;
                    });
                    _.forEach(unique, function (taxon) {
                        taxon.subset = _(_.pluck(_.where(key.irrelevantTaxa(), {'id': taxon.id}), 'subset')).toString();
                    });
                    return unique;
                }),

                listView: ko.observable(false),
                widgetHtml: ko.observable(false),
                stateHelpHtml: ko.observable(false),
                focus: ko.pureComputed(function () {
                    if (key.characters_all().length > 0 && (key.characters_checked().length > 0 && key.remaining() > 1 && _.some(_.last(key.characters_checked()).states, function (state) {
                            return state.status() === null;
                        }))) {
                        return _.last(key.characters_checked()).id;
                    }
                    else if (key.characters_all().length > 0 && key.characters_all().length > key.characters_checked().length) {
                        return key.characters_all()[key.characters_checked().length].id;
                    }
                    else {
                        return -1;
                    }
                }).extend({notify: 'always', rateLimit: 10}),


                characters_checked_manual: ko.observableArray([]),
                characters_hidden_manual: ko.observableArray([]),
                characters_unanswered_manual: ko.observableArray([]),


                characters_checked: ko.pureComputed(function () {
                    return _.filter(key.characters(), function (character) {
                        return character.evaluate() && character.checked() && character.relevance() === 0;
                    }).sort(function (a, b) {
                        return a.timestamp() - b.timestamp();
                    });
                }),
                characters_unanswered: ko.pureComputed(function () {
                    var array = _.filter(key.characters(), function (character) {
                        return !character.skipped() && character.relevance() === 1 && character.evaluate();
                    });
                    return array.sort(function (a, b) {
                        if (a.timestamp() != b.timestamp()) {
                            return b.timestamp() - a.timestamp();
                        }
                        if (a.sort != b.sort) {
                            return a.sort - b.sort;
                        }
                        return a.skewness() - b.skewness();
                    });
                }),
                characters_skipped: ko.pureComputed(function () {
                    return _.filter(key.characters(), function (character) {
                        return character.skipped() && !character.checked() && character.relevance() > 0 && character.evaluate();
                    });
                }),
                characters_hidden: ko.pureComputed(function () {
                    return _.filter(key.characters(), function (character) {
                        return !character.skipped() && (!character.evaluate() || (character.relevance() > 1));
                    });
                }),
                characters_all: ko.pureComputed(function () {
                    return _([]).concat(key.characters_checked(), key.characters_unanswered(), key.characters_skipped()).value();
                }).extend({notify: 'always', rateLimit: 10})
            },

            removedTaxa = ko.observableArray(),

            parseCSV = function (array) {
                var self = this,
                    keyFields = ["key name", "geographic range", "language", "key intro", "key description"],
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
                        if (array[row][col].trim() === "" || !(0 <= +array[row][col] && +array[row][col] <= 1))
                            array[row][col] = null;
                        else
                            array[row][col] = +array[row][col];
                    }
                }

                var taxonHeaders = [];
                for (var i = 0; i < headerRow; i++)
                    taxonHeaders.push(array[i][headerColumn]);

                var taxa = [],
                    taxonNameRow = taxonHeaders.indexOf("Name"),
                    taxonSubsetRow = taxonHeaders.indexOf("Subset"),
                    taxonIdRow = taxonHeaders.indexOf("Taxon"),
                    taxonMediaRow = taxonHeaders.indexOf("Media"),
                    taxonDescriptionRow = taxonHeaders.indexOf("Description"),
                    taxonSortRow = taxonHeaders.indexOf("Sort"),
                    taxonFollowupRow = taxonHeaders.indexOf("Followup");

                for (var i = headerColumn + 1; i < array[0].length; i++) {
                    taxa.push({
                        id: (taxonIdRow > -1 && array[taxonIdRow][i] ? array[taxonIdRow][i] : null),
                        index: i,
                        name: (taxonNameRow > -1 && array[taxonNameRow][i] ? array[taxonNameRow][i] : null),
                        subset: (taxonSubsetRow > -1 && array[taxonSubsetRow][i] ? array[taxonSubsetRow][i] : null),
                        media: (taxonMediaRow > -1 && array[taxonMediaRow][i] ? array[taxonMediaRow][i] : null),
                        sort: (taxonSortRow > -1 && array[taxonSortRow][i] ? array[taxonSortRow][i] : null),
                        description: (taxonDescriptionRow > -1 && array[taxonDescriptionRow][i] ? array[taxonDescriptionRow][i] : null),
                        followup: (taxonFollowupRow > -1 && array[taxonFollowupRow][i] ? array[taxonFollowupRow][i] : null),
                        taxonObject: null,
                        stateValues: []
                    });
                }

                var characterHeaders = [];
                for (var i = 0; i < headerColumn; i++)
                    characterHeaders.push(array[headerRow][i]);

                var characters = [],
                    characterNameCol = characterHeaders.indexOf("Character"),
                    stateNameCol = characterHeaders.indexOf("State"),
                    stateRefCol = characterHeaders.indexOf("State id"),
                    characterRuleCol = characterHeaders.indexOf("Character requirement"),
                    stateMediaCol = characterHeaders.indexOf("State media"),
                    characterMultiCol = characterHeaders.indexOf("Multistate character"),
                    characterSort = characterHeaders.indexOf("Sort"),
                    characterDescription = characterHeaders.indexOf("Description");

                for (var i = headerRow + 1; i < array.length; i++) {
                    var characterName = (characterNameCol > -1 && array[i][characterNameCol] ? array[i][characterNameCol] : null),
                        stateName = (stateNameCol > -1 && array[i][stateNameCol] ? array[i][stateNameCol] : null),
                        ref = (stateRefCol > -1 && array[i][stateRefCol] ? array[i][stateRefCol] : null),
                        rule = (characterRuleCol > -1 && array[i][characterRuleCol] ? array[i][characterRuleCol] : null),
                        media = (stateMediaCol > -1 && array[i][stateMediaCol] ? array[i][stateMediaCol] : null),
                        sort = (characterSort > -1 && array[i][characterSort] ? array[i][characterSort] : null),
                        description = (characterDescription > -1 && array[i][characterDescription] ? array[i][characterDescription] : null),
                        multi = (characterMultiCol > -1 && array[i][characterMultiCol] && array[i][characterMultiCol].toLowerCase() === "true");

                    if (!stateName)
                        break;

                    if (characterName) {
                        characters.push({
                            id: i,
                            string: characterName,
                            sort: sort,
                            description: description,
                            rule: rule,
                            multistate: multi,
                            states: []
                        });
                    }

                    characters[characters.length - 1].states.push({
                        parent: characters[characters.length - 1].id,
                        id: i,
                        string: stateName,
                        ref: ref,
                        media: media
                    });

                    var values = array[i].slice(headerColumn + 1);

                    for (var j = 0; j < values.length; j++) {
                        if (_.isFinite(values[j]))
                            taxa[j].stateValues.push({state: i, value: values[j]});
                    }
                }

                key.name(keyName);
                key.geography(keyRange);
                key.language(keyLanguage);
                key.intro(keyIntro);
                key.description(keyDescription);

                fillKey(taxa, characters);
            },

            fillKey = function (taxa, characters) {
                var gettingAbundances = [],
                    gettingTaxa = [],
                    idCounter = 0;

                _.each(taxa, function (taxon) {
                    taxon.vernacular = taxon.name || "Loading...";
                    taxon.scientific = "";
                    taxon.reasonsToDrop = 0;
                    taxon.removed = false;

                    taxon.imageUrl = function (argString) {
                        if (taxon.media === null)
                            return null;
                        else if (taxon.media.indexOf("/") === -1)
                            return "http://data.artsdatabanken.no/Media/F" + taxon.media + "?" + argString;
                        else
                            return taxon.media + "?" + argString;
                    }
                    gettingTaxa.push(function (taxon) {
                        var dfd = $.Deferred();
                        $.getJSON("http://data.artsdatabanken.no/Api/Taxon/" + taxon.id, function (data) {
                            taxon.taxonObject = data;
                        }).done(function () {
                            if (taxon.taxonObject) {
                                if (taxon.taxonObject.AcceptedName) {
                                    taxon.scientific = taxon.taxonObject.AcceptedName.scientificName;
                                    taxon.taxonObject.AcceptedName.higherClassification.push({
                                        taxonRank: taxon.taxonObject.AcceptedName.taxonRank,
                                        scientificName: taxon.taxonObject.AcceptedName.scientificName
                                    });
                                }
                                if (taxon.taxonObject.PreferredVernacularName)
                                    taxon.vernacular = _.capitalize(taxon.taxonObject.PreferredVernacularName.vernacularName);
                                else if (taxon.taxonObject.AcceptedName)
                                    taxon.vernacular = taxon.scientific;
                            }

                            if (taxon.description === null) {
                                taxon.description = _.some(taxon.taxonObject.scientificNames, function (sn) {
                                    return _.some(sn.dynamicProperties, function (dp) {
                                        return dp.Name === "Description";
                                    })
                                });
                            }

                            dfd.resolve(taxon.taxonObject);
                        });
                        return dfd.promise();
                    }(taxon));
                });

                key.taxa(taxa);

                $.when.apply($, gettingTaxa).then(function () {
                    key.taxa(taxa.sort(function (a, b) {
                        return a.sort - b.sort;
                    }));
                    var array = _.pluck(key.taxa(), 'taxonObject.AcceptedName.higherClassification');
                    key.commonTaxonomy(_.filter(_.first(array), function (firstItem) {
                        return _.every(_.rest(array), function (otherArray) {
                            return _.some(otherArray, function (otherItem) {
                                return _.isEqual(firstItem, otherItem);
                            });
                        });
                    }));


                    //~ fetch abundances from the API
                    _.each(_.uniq(taxa, function (taxon) {
                        return taxon.id;
                    }), function (taxon) {
                        gettingAbundances.push(function (taxon) {
                            var dfd = $.Deferred();
                            $.getJSON("http://pavlov.itea.ntnu.no/artskart/Api/Observations/list/?pageSize=0&taxons[]=" + taxon.id, function (data) {
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
                    });

                    $.when.apply($, gettingAbundances).then(function () {
                        key.taxa(taxa.sort(function (a, b) {
                            if (a.sort != b.sort) {
                                return a.sort - b.sort;
                            }
                            if (a.abundance != b.abundance) {
                                return b.abundance - a.abundance;
                            }
                            return 0;
                        }));
                    });
                });

                _.forEach(characters, function (character) {
                    _.forEach(character.states, function (state) {
                        state.checked = ko.observable(null);
                        state.imageUrl = function (argString) {
                            if (state.media === null)
                                return null;
                            else if (state.media.indexOf("/") === -1)
                                return "http://data.artsdatabanken.no/Media/F" + state.media + "?" + argString;
                            else
                                return state.media + "?" + argString;
                        };
                    });

                    character.checked = ko.pureComputed(function () {
                        return _.some(character.states, function (state) {
                            return state.checked() !== null;
                        });
                    });

                    character.showFalse = ko.observable(character.multistate || character.states.length !== 2);
                    character.timestamp = ko.observable(0);
                    character.skipped = ko.observable(false);

                    character.evaluate = ko.pureComputed(function () {
                        if (!character.rule) return true;
                        var string = character.rule;

                        while (~string.indexOf("{")) {
                            var start = string.indexOf("{");
                            var stop = string.indexOf("}");
                            string = string.substring(0, start) + evaluateState(string.substring(start + 1, stop)) + string.substring(stop + 1);
                        }
                        return !!eval(string);

                        //~ returns the boolean value of a state with a provided ref. True when either checked manually or 1 for all remaining taxa
                        function evaluateState(ref) {
                            return (_.find(_.find(characters, function (char) {
                                    return _.some(char.states, function (s) {
                                        return s.ref === ref;
                                    });
                                }).states, function (state) {
                                    return state.ref === ref;
                                })).status() === 1;
                        }
                    });


                    _.each(character.states, function (state) {
                        state.zeroes = ko.pureComputed(function () {
                            return _.filter(key.relevantTaxa(), function (taxon) {
                                return _.some(taxon.stateValues, {state: state.id, value: 0});
                            }).length;
                        });

                        state.status = ko.pureComputed(function () {
                            if (state.checked() !== null) return state.checked();
                            if (character.checked() && !character.multistate) {
                                if (_.some(character.states, function (state) {
                                        return state.checked() === 1;
                                    })) {
                                    return 0;
                                }
                                if (character.states.length === 2) {
                                    return 1;
                                }
                            }
                            if (state.zeroes() === key.relevantTaxa().length) return 0;
                            if ((_.filter(key.relevantTaxa(), function (taxon) {
                                    return _.some(taxon.stateValues, {state: state.id, value: 1});
                                })).length === key.relevantTaxa().length) return 1;
                            return null;
                        });

                        state.relevance = ko.pureComputed(function () {
                            //~ if you know the answer, or it does not matter (like when there's one answer left or it's never false), it's a silly question
                            if (key.relevantTaxa().length === 1 || state.status() !== null) {
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
                        var stateRelevances = _.filter(_.map(character.states, function (state) {
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

                        var relevantStates = _.filter(character.states, function (state) {
                                return state.status() === null;
                            }),
                            perfect = key.relevantTaxa().length * (1 - (1 / relevantStates.length));

                        return Math.sqrt(_.reduce(relevantStates, function (total, state) {
                                return total + ((state.zeroes() - perfect) * (state.zeroes() - perfect));
                            }, 0) / relevantStates.length);
                    });
                });

                key.characters(characters);
                $("#tabs").tabs("option", "active", 0);
            },

            resetAll = function () {
                _.forEach(key.characters(), function (character) {
                    character.skipped(false);
                    character.timestamp(0);
                    _.forEach(character.states, function (state) {
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
                _.each(array, function (index) {
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
                    state = _.find(character.states, function (state) {
                        return state.id === id;
                    }),
                    oldValue = state.checked();
                state.checked(value);
                character.timestamp(Date.now());

                _.each(key.taxa(), function (taxon) {
                    if (value === 1 && _.find(taxon.stateValues, {
                            'state': state.id,
                            'value': 0
                        })) taxon.reasonsToDrop = taxon.reasonsToDrop + 1;
                    else if (value === 0 && _.find(taxon.stateValues, {
                            'state': state.id,
                            'value': 1
                        })) taxon.reasonsToDrop = taxon.reasonsToDrop + 1;
                    else if (value === null && _.find(taxon.stateValues, {
                            'state': state.id,
                            'value': 1 - oldValue
                        })) taxon.reasonsToDrop = taxon.reasonsToDrop - 1;
                });
                key.taxa.valueHasMutated();
            },

            loadCSVurl = function (url) {
                http.get(url).then(function (response) {
                    parseCSV(Papa.parse(response).data);
                });
            },

            loadCSVarray = function (array) {
                parseCSV(array);
            };

        return {
            //~ key object serving what the GUI needs
            key: key,

            toggleListView: function () {
                key.listView(!key.listView());
            },

            loadCSV_glansvinger: function (url) {
                loadCSVurl("/wouterk/key/glansvinger.csv");
            },

            loadCSV_simple: function (url) {
                loadCSVurl("/wouterk/key/simple.csv");
            },

            loadCSV_parent: function (array) {
                loadCSVarray(parent.hotData);
            },

            removeSelected: function (taxon) {
                //~ if there is one taxon id left, remove all with the current subset
                if (_.uniq(_.clone(key.relevantTaxa(), true), function (t) {
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

                if (key.relevantTaxa().length === 1 || (key.characters_unanswered().length + key.characters_hidden().length == 0)) {
                    $('#resultModal').modal('show');
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


            enlargeImage: function (t) {
                var taxon = (_.has(t, 'key') ? key.relevantTaxa()[0] : t);
                if (taxon.imageUrl === null)
                    return;

                key.widgetHtml("<i class=\"fa fa-spinner fa-pulse fa-5x\"></i>");

                if ($('#resultModal').is(':visible')) {
                    $('#resultModal').modal('hide');
                    $('#resultModal').on('hidden.bs.modal', function (e) {
                        $('#widgetModal').modal('show');
                    });
                }
                else
                    $('#widgetModal').modal('show');


                if (taxon.media.indexOf("/") === -1) {
                    $.get("http://data.artsdatabanken.no/Widgets/F" + taxon.media, function (data) {
                        key.widgetHtml("<div class=\"artsdatabanken-widget\"><a href=\"http://data.artsdatabanken.no/Widgets/F" + taxon.media + "\"></a></div><script src=\"http://data.artsdatabanken.no/Scripts/widget.js\"></script>");
                    });
                }
                else
                    key.widgetHtml("<img src=\"" + taxon.media + "\"/>");
            },

            showDescription: function (t) {
                key.widgetHtml("<i class=\"fa fa-spinner fa-pulse fa-5x\"></i>");

                if ($('#resultModal').is(':visible')) {
                    $('#resultModal').modal('hide');
                    $('#resultModal').on('hidden.bs.modal', function (e) {
                        $('#widgetModal').modal('show');
                    });
                }
                else
                    $('#widgetModal').modal('show');

                var taxon = (_.has(t, 'key') ? key.relevantTaxa()[0] : t);

                if (!taxon.widgetHtml) {
                    if (taxon.description === true) {
                        var dataLength = 0;
                        _.forEach(taxon.taxonObject.scientificNames, function (sn) {
                            _.forEach(_.filter(sn.dynamicProperties, function (dp) {
                                return dp.Name === "Description";
                            }), function (dp) {
                                var descriptionId = dp.Value.substring(_.lastIndexOf(dp.Value, "/") + 1);
                                $.get("http://data.artsdatabanken.no/Widgets/" + descriptionId, function (data) {
                                    if (data.length > dataLength) {
                                        dataLength = data.length;
                                        taxon.widgetHtml = "<div class=\"artsdatabanken-widget\"><a href=\"http://data.artsdatabanken.no/Widgets/" + descriptionId + "\"></a></div><script src=\"http://data.artsdatabanken.no/Scripts/widget.js\"></script>";
                                        taxon.description = descriptionId;
                                        key.taxa.valueHasMutated();
                                        key.widgetHtml(taxon.widgetHtml);
                                    }
                                });
                            });
                        });
                    }
                    else if (taxon.description > 0) {
                        $.get("http://data.artsdatabanken.no/Widgets/" + taxon.description, function (data) {
                            taxon.widgetHtml = "<div class=\"artsdatabanken-widget\"><a href=\"http://data.artsdatabanken.no/Widgets/" + taxon.description + "\"></a></div><script src=\"http://data.artsdatabanken.no/Scripts/widget.js\"></script>";
                            key.taxa.valueHasMutated();
                            key.widgetHtml(taxon.widgetHtml);
                        });
                    }
                }
                else {
                    key.widgetHtml(taxon.widgetHtml);
                }

            },

            showStateHelp: function (s) {
                key.widgetHtml("<i class=\"fa fa-spinner fa-pulse fa-5x\"></i>");
                $('#widgetModal').modal('show');
                $.get("http://data.artsdatabanken.no/Widgets/" + s.description, function (data) {
                    key.widgetHtml("<div class=\"artsdatabanken-widget\"><a href=\"http://data.artsdatabanken.no/Widgets/" + s.description + "\"></a></div><script src=\"http://data.artsdatabanken.no/Scripts/widget.js\"></script>");
                });
            },

            showAboutWidget: function (s) {
                key.widgetHtml("<i class=\"fa fa-spinner fa-pulse fa-5x\"></i>");

                if ($('#aboutKeyModal').is(':visible')) {
                    $('#aboutKeyModal').modal('hide');
                    $('#aboutKeyModal').on('hidden.bs.modal', function (e) {
                        $('#widgetModal').modal('show');
                    });
                }
                else
                    $('#widgetModal').modal('show');

                $.get("http://data.artsdatabanken.no/Widgets/" + key.description(), function (data) {
                    key.widgetHtml("<div class=\"artsdatabanken-widget\"><a href=\"http://data.artsdatabanken.no/Widgets/" + key.description() + "\"></a></div><script src=\"http://data.artsdatabanken.no/Scripts/widget.js\"></script>");
                });
            },


            inputTrue: function (state) {
                //~ set the checked state if it has no status yet
                if (state.status() === null) {
                    setState(state.id, state.parent, 1);
                    if (key.listView() && $("#focus")[0]) $("#focus")[0].scrollIntoView(true);

                    if (key.relevantTaxa().length === 1 || (key.characters_unanswered().length + key.characters_hidden().length == 0)) {
                        $('#resultModal').modal('show');
                    }
                }
            },

            inputFalse: function (state) {
                //~ set the checked state if it has no status yet
                if (state.status() === null) {
                    setState(state.id, state.parent, 0);
                    if (listView()) $("#focus")[0].scrollIntoView(true);

                    if (key.relevantTaxa().length === 1 || (key.characters_unanswered().length + key.characters_hidden().length == 0)) {
                        $('#resultModal').modal('show');
                    }
                }
            },

            inputReset: function (state) {
                //~ reset the checked state if it had been checked explicitly
                if (state.checked() !== null) setState(state.id, state.parent, null);
            },

            skipCharacter: function (character) {
                _.find(key.characters(), function (char) {
                    return char.id === character.id;
                }).skipped(true);
            },

            resetAll: function () {
                if (confirm("Er du sikker at du vil nullstille nøkkelen?")) {
                    removedTaxa([]);
                    key.widgetHtml(false);
                    key.stateHelpHtml(false);
                    resetAll();
                }
            },

            compositionComplete: function () {
                $(function () {
                    $("#tabs").tabs();

                    $("#character-carousel").swiperight(function () {
                        $('.carousel').carousel('prev');
                    });

                    $("#character-carousel").swipeleft(function () {
                        $('.carousel').carousel('next');
                    });

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

                    var csvUrl = getUrlParameter('csv');

                    if (csvUrl) {
                        loadCSVurl(csvUrl);
                    }
                });
            }
        };
    });
