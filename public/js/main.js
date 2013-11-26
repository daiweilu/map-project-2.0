// Avoid `console` errors in browsers that lack a console.
(function() {
  var method;
  var noop = function () {};
  var methods = [
    'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
    'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
    'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
    'timeStamp', 'trace', 'warn'
  ];
  var length = methods.length;
  var console = (window.console = window.console || {});

  while (length--) {
    method = methods[length];

    // Only stub undefined methods.
    if (!console[method]) {
      console[method] = noop;
    }
  }
}());


// --- Modules ---
angular.module('ngBackbone', [])
.factory('BackboneEvents', function() {

  function de(current, deVal) {
    return (typeof current === 'undefined') ? deVal : current;
  }

  Backbone.Events._checkStatesProperties = function(state) {
    this._states               = de(this._states              , {});
    this._inStateCalls         = de(this._inStateCalls        , {});
    this._inStateCalls[state]  = de(this._inStateCalls[state] , []);
    this._outStateCalls        = de(this._outStateCalls       , {});
    this._outStateCalls[state] = de(this._outStateCalls[state], []);
  };

  Backbone.Events.inState = function(state, callback, context) {
    this._checkStatesProperties(state);

    var bindCall = _.bind(callback, context || this);
    this._inStateCalls[state].push(bindCall);
    if (this._states[state]) bindCall();
  };

  Backbone.Events.outState = function(state, callback, context) {
    this._checkStatesProperties(state);

    var bindCall = _.bind(callback, context || this);
    this._outStateCalls[state].push(bindCall);
    if (!this._states[state]) bindCall();
  };

  Backbone.Events.enter = function(state) {
    this._checkStatesProperties(state);
    var isc = this._inStateCalls[state];

    if (!this._states[state]) {
      this._states[state] = true;
      for (var i = 0; i < isc.length; i++) { isc[i](); }
    }
  };

  Backbone.Events.leave = function(state) {
    this._checkStatesProperties(state);
    var osc = this._outStateCalls[state];

    if (this._states[state]) {
      this._states[state] = false;
      for (var i = 0; i < osc.length; i++) { osc[i](); }
    }
  };

  return Backbone.Events;
})
.factory('BackboneSync', function() {
  return Backbone;
})
.factory('Backbone', function(BackboneEvents, BackboneSync) {
  return Backbone;
});


// --- mapApp ---
//
var app = angular.module('mapApp', ['ngBackbone', 'ngAnimate']);


// --- Controllers ---
//
app.controller('AppCtrl', function() {
  this.showDirectionModal = false;
});


app.controller('PanelCtrl', function($scope, SavedPlaces) {
  this.savedPlaces = SavedPlaces.models;
});


// --- Directives ---
//
app.directive('mdPlaceEntry', function($compile, $templateCache) {
  return {
    link: function(scope, element, attrs) {
      var name = scope.place._input ? 'place-input-template' : 'saved-place-template';
      var template = $templateCache.get(name);
      element.html( $compile(template)(scope) );
    }
  };
});


app.directive('mdPlaceInput', function() {
  return function(scope, element, attrs) {
    var textarea = element.children('.md-place-input-textarea');
    var shadow   = element.children('.md-place-input-shadow');
    var hint     = element.children('.md-place-input-hint');

    function updateTextareaHeight(extra) {
      var contents = extra ? (textarea.val() + extra).split(/\n/)
                           : textarea.val().split(/\n/);
      var span, hintLeft;
      var lineCount = 0;

      shadow.empty();
      for (var i = 0; i < contents.length; i++) {
        span = $('<span>');
        span.html(contents[i].replace(/ /g, '&nbsp;'));
        shadow.append(span, $('<br>'));
        var rects = span[0].getClientRects();
        lineCount += rects.length;
        hintLeft = rects.length ? rects[rects.length - 1].width : 0;
      }
      textarea.attr('rows', (shadow.height() / 24) || 1);

      updateHintPosition(
        lineCount ? 8 + (lineCount - 1) * 24 : 8
        , hintLeft);
    }
    updateTextareaHeight();

    function updateHintPosition(top, left) {
      hint.css({top: top, left: left});
    }

    textarea.on('keydown', function(e) {
      switch (e.keyCode) {
        case 13:
          updateTextareaHeight("\n");
          break;
        default:
          updateTextareaHeight(String.fromCharCode(e.keyCode));
      }
    });

    textarea.on('keyup', function(e) {
      updateTextareaHeight();
    });

    textarea.on('paste', function(e) {
      setTimeout(function() {
        updateTextareaHeight();
      });
    });
  };
});


// --- Services ---
app.factory('Map', function(BackboneEvents) {
  var map = {
    setMap: function(map) {
      this._googleMap = map;
      this.enter('ready');
    },
    getMap: function() { return this._googleMap; },
    getBounds: function() { return this.getMap().getBounds(); }
  };
  _.extend(map, BackboneEvents);
  return map;
});


app.factory('PlacesService', function(Map) {
  var service = {
    textSearch: function(request, callback) {
      this._placesService.textSearch(request, callback);
    },
    getDetails: function(request, callback) {
      this._placesService.getDetails(request, callback);
    }
  };
  Map.inState('ready', function() {
    service._placesService = new google.maps.places.PlacesService(Map.getMap());
  });
  return service;
});


app.directive('mdMapCanvas', function(Map) {
  return {
    link: function(scope, element, attrs) {
      var mapStyles = [
        {
          "featureType": "water",
          "stylers": [{
            "color": "#46bcec"
          }, {
            "visibility": "on"
          }]
        }, {
          "featureType": "landscape",
          "stylers": [{
            "color": "#f2f2f2"
          }]
        }, {
          "featureType": "road",
          "stylers": [{
            "saturation": -100
          }, {
            "lightness": 45
          }]
        }, {
          "featureType": "road.highway",
          "stylers": [{
            "visibility": "simplified"
          }]
        }, {
          "featureType": "road.arterial",
          "elementType": "labels.icon",
          "stylers": [{
            "visibility": "off"
          }]
        }, {
          "featureType": "administrative",
          "elementType": "labels.text.fill",
          "stylers": [{
            "color": "#444444"
          }]
        }, {
          "featureType": "transit",
          "stylers": [{
            "visibility": "off"
          }]
        }, {
          "featureType": "poi",
          "stylers": [{
            "visibility": "off"
          }]
        }
      ];
      Map.setMap(new google.maps.Map(element[0], {
        center:           new google.maps.LatLng(40.77, -73.98),
        zoom:             10,
        disableDefaultUI: true,
        mapTypeId:        google.maps.MapTypeId.ROADMAP,
        styles:           mapStyles
      }));
    }
  };
});


app.factory('Place', function(Backbone, $rootScope) {
  return Backbone.Model.extend({
    initialize: function(attrs, options) {
      // this is an input element
      if (options && options._input) {
        this._input = true;
      }
    }
  });
});


app.factory('SearchedPlaces', function(Backbone, Place, PlacesService, $timeout) {
  var SearchedPlaces = Backbone.Collection.extend({
    model: Place,
    initialize: function() {
    }
  });

  return new SearchedPlaces;
});


app.factory('SavedPlaces', function(Backbone, Place) {
  var SavedPlaces = Backbone.Collection.extend({
    model: Place,
    initialize: function() {
      var place = new Place(null, {_input: true});
      this.add(place);
    }
  });

  return new SavedPlaces;
});


app.directive('mdPlaceList', function() {
  return {
    controllerAs: 'MpPlaceListCtrl',
    controller: function($scope, SearchedPlaces, SavedPlaces) {
      var _this = this;

      $scope.$watch(function() {
        return SearchedPlaces.models;
      }, function(newVal) {
        _this.placeSearchResult = newVal;
      });

      $scope.$watch(function() {
        return SavedPlaces.models;
      }, function(newVal) {
        _this.savedPlaces = newVal;
      });

      this.selectPlace = function($event, place) {
        if (!$($event.target).hasClass('js-place-url')) {
          SearchedPlaces.reset();
          SavedPlaces.add(place);
        }
      };
    },
    link: function() {

    }
  };
});


app.directive('mdPlaceDragDrop', function(SavedPlaces) {
  return {
    link: function(scope, element, attrs) {
      var angularComment;

      element.sortable({
        items: '> .sortable',
        handle: '.md-place-list-handle',
        appendTo: 'body',
        helper: 'clone',
        start: function(event, ui) {
          $('#js-drop-zone').css({display: 'block'});
          // var allElements = element.contents();
          // var itemIndex;
          // allElements.each(function(index) {
          //   if (this == ui.item[0]) itemIndex = index;
          // });
          // angularComment = allElements[itemIndex + 2];
        },
        update: function(event, ui) {
          // element.children().each(function(i) {
          //   $(this).scope().place.set({order: i});
          // });
          // // move the comment belongs to previous element to its place
          // $( ui.item[0].previousSibling ).after( ui.item[0].nextSibling );
          // // append comment belongs to sorted item after it
          // ui.item.after(angularComment);
        }
      });

      $('#js-drop-zone').droppable({
        accept: '.md-place-list-item.sortable',
        activate: function(e, ui) {
          $(this).css('display', 'block').animate({opacity: 1}, 200);
        },
        deactivate: function(e, ui) {
          $(this).animate({opacity: 0}, 200, function() {
            $(this).css('display', 'none');
          });
        },
        over: function(e, ui) {
          $(this).css('color', 'red');
        },
        out: function(e, ui) {
          $(this).css('color', '');
        },
        drop: function(e, ui) {
          scope.$apply(function() {
            SavedPlaces.remove(ui.draggable.scope().savedPlace);
            var item = ui.draggable;
            var contents = item.parent().contents();
            var comment;
            contents.each(function(i) {
              if (this == item[0]) comment = contents[i+2];
            });
            p = item[0].parentNode;
            p.removeChild(item[0]);
            p.removeChild(comment);
          });
        }
      });
    }
  };
});


app.animation('.md-place-list-item', function() {
  return {
    enter: function(element, done) {
      var height = element.height();
      element.css({
        overflow: 'hidden',
        minHeight: 0,
        height: 0
      })
      .animate({height: height}, 400, function() {
        element.css('min-height', 40);
        done();
      });
    },

    leave: function(element, done) {

    },

    move: function(element, done) {
    }
  };
})


app.value('PlacesAutocompleteService', new google.maps.places.AutocompleteService());


app.directive('cpPlaceListInputLabel', function() {
  return function(scope, element, attrs) {
    element.on('click', function(e) {
      element.parent().next().find('.js-textarea-input').focus();
      e.preventDefault();
    });
  };
});
