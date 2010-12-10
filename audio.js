// A cross-browser javascript shim for html5 audio
(function(audiojs, audiojsInstance, container) {

  // ##The audiojs interface
  // This is the global object which provides an interface for creating new `audiojs` instances.
  // It also stores all of the construction helper methods and variables.
  container[audiojs] = {
    instanceCount: 0,
    instances: {},
    // The markup for the swf. It is injected into the page if there is not support for the `<audio>` element. The `$keys` are used as a micro-templating language.  
    // `$1` The name of the flash movie  
    // `$2` The path to the swf  
    // `$3` Cache invalidation  
    flashSource: '\
      <object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" id="$1" width="1" height="1" name="$1" style="position: absolute; left: -1px;"> \
        <param name="movie" value="$2?playerInstance='+audiojs+'.instances[\'$1\']&datetime=$3"> \
        <param name="allowscriptaccess" value="always"> \
        <embed name="$1" src="$2?playerInstance='+audiojs+'.instances[\'$1\']&datetime=$3" width="1" height="1" allowscriptaccess="always"> \
      </object>',

    // ### The main settings object
    // This is where all the default settings are stored. Each of these variables and methods can be overwritten by the user-provided `options` object.
    settings: {
      autoplay: false,
      loop: false,
      preload: true,
      imageLocation: './player-graphics.gif',
      swfLocation: './audiojs.swf',
      useFlash: (function() {
        var a = document.createElement('audio');
        return !(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''));
      })(),
      // The default markup and classes for creating the player:
      createPlayer: {
        markup: '\
          <div class="play-pause"> \
            <p class="play"></p> \
            <p class="pause"></p> \
            <p class="loading"></p> \
            <p class="error"></p> \
          </div> \
          <div class="scrubber"> \
            <div class="progress"></div> \
            <div class="loaded"></div> \
          </div> \
          <div class="time"> \
            <em class="played">00:00</em>/<strong class="duration">00:00</strong> \
          </div> \
          <div class="error-message"></div>',
        playPauseClass: 'play-pause',
        scrubberClass: 'scrubber',
        progressClass: 'progress',
        loaderClass: 'loaded',
        timeClass: 'time',
        durationClass: 'duration',
        playedClass: 'played',
        errorMessageClass: 'error-message',
        playingClass: 'playing',
        loadingClass: 'loading',
        errorClass: 'error'
      },
      // ### String storage
      // The css required by the default player. This is is dynamically injected into a `<style>` tag.
      css: '\
        .audiojs audio { position: absolute; left: -1px; } \
        .audiojs { width: 460px; height: 36px; background: #404040; overflow: hidden; font-family: monospace; font-size: 12px; \
          background-image: -webkit-gradient(linear, left top, left bottom, color-stop(0, #444), color-stop(0.5, #555), color-stop(0.51, #444), color-stop(1, #444)); \
          background-image: -moz-linear-gradient(center top, #444 0%, #555 50%, #444 51%, #444 100%); \
          -webkit-box-shadow: 1px 1px 8px rgba(0, 0, 0, 0.3); -moz-box-shadow: 1px 1px 8px rgba(0, 0, 0, 0.3); \
          -o-box-shadow: 1px 1px 8px rgba(0, 0, 0, 0.3); box-shadow: 1px 1px 8px rgba(0, 0, 0, 0.3); } \
        .audiojs .play-pause { width: 25px; height: 40px; padding: 4px 6px; margin: 0px; float: left; overflow: hidden; border-right: 1px solid #000; } \
        .audiojs p { display: none; width: 25px; height: 40px; margin: 0px; cursor: pointer; } \
        .audiojs .play { display: block; } \
        .audiojs .scrubber { position: relative; float: left; width: 280px; background: #5a5a5a; height: 14px; margin: 10px; border-top: 1px solid #3f3f3f; border-left: 0px; border-bottom: 0px; overflow: hidden; } \
        .audiojs .progress { position: absolute; top: 0px; left: 0px; height: 14px; width: 0px; background: #ccc; z-index: 1; \
          background-image: -webkit-gradient(linear, left top, left bottom, color-stop(0, #ccc), color-stop(0.5, #ddd), color-stop(0.51, #ccc), color-stop(1, #ccc)); \
          background-image: -moz-linear-gradient(center top, #ccc 0%, #ddd 50%, #ccc 51%, #ccc 100%); } \
        .audiojs .loaded { position: absolute; top: 0px; left: 0px; height: 14px; width: 0px; background: #000; \
          background-image: -webkit-gradient(linear, left top, left bottom, color-stop(0, #222), color-stop(0.5, #333), color-stop(0.51, #222), color-stop(1, #222)); \
          background-image: -moz-linear-gradient(center top, #222 0%, #333 50%, #222 51%, #222 100%); } \
        .audiojs .time { float: left; height: 36px; line-height: 36px; margin: 0px 0px 0px 6px; padding: 0px 6px 0px 12px; border-left: 1px solid #000; color: #ddd; text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.5); } \
        .audiojs .time em { padding: 0px 2px 0px 0px; color: #f9f9f9; font-style: normal; } \
        .audiojs .time strong { padding: 0px 0px 0px 2px; font-weight: normal; } \
        .audiojs .error-message { float: left; display: none; margin: 0px 10px; height: 36px; line-height: 36px; color: #fff; } \
        \
        .audiojs .play { background: url("$1") -2px -1px no-repeat; } \
        .audiojs .loading { background: url("$1") -2px -31px no-repeat; } \
        .audiojs .error { background: url("$1") -2px -61px no-repeat; } \
        .audiojs .pause { background: url("$1") -2px -91px no-repeat; } \
        \
        .playing .play, .playing .loading, .playing .error { display: none; } \
        .playing .pause { display: block; } \
        \
        .loading .play, .loading .pause, .loading .error { display: none; } \
        .loading .loading { display: block; } \
        \
        .error .time, .error .play, .error .pause, .error .scrubber, .error .loading { display: none; } \
        .error .error { display: block; } \
        .error .play-pause p { cursor: auto; } \
        .error .error-message { display: block; }',
      // The default event callbacks:
      trackEnded: function(e) {},
      loadError: function(e) {
        var player = this.settings.createPlayer,
            errorMessage = getByClass(player.errorMessageClass, this.wrapper);
        container[audiojs].helpers.removeClass(this.wrapper, player.loadingClass);
        container[audiojs].helpers.addClass(this.wrapper, player.errorClass);
        errorMessage.innerHTML = 'Error loading: "'+this.mp3+'"';
      },
      init: function() {
        var player = this.settings.createPlayer;
        container[audiojs].helpers.addClass(this.wrapper, player.loadingClass);
      },
      loadStarted: function() {
        var player = this.settings.createPlayer,
            duration = getByClass(player.durationClass, this.wrapper),
            m = Math.floor(this.duration / 60),
            s = Math.floor(this.duration % 60);
        container[audiojs].helpers.removeClass(this.wrapper, player.loadingClass);
        duration.innerHTML = ((m<10?'0':'')+m+':'+(s<10?'0':'')+s);
      },
      loadProgress: function(percent) {
        var player = this.settings.createPlayer,
            scrubber = getByClass(player.scrubberClass, this.wrapper),
            loaded = getByClass(player.loaderClass, this.wrapper);
        loaded.style.width = (scrubber.offsetWidth * percent) + 'px';
      },
      playPause: function() {
        if (this.playing) this.settings.play();
        else this.settings.pause();
      },
      play: function() {
        var player = this.settings.createPlayer;
        container[audiojs].helpers.addClass(this.wrapper, player.playingClass);
      },
      pause: function() {
        var player = this.settings.createPlayer;
        container[audiojs].helpers.removeClass(this.wrapper, player.playingClass);
      },
      updatePlayhead: function(percent) {
        var player = this.settings.createPlayer,
            scrubber = getByClass(player.scrubberClass, this.wrapper),
            progress = getByClass(player.progressClass, this.wrapper);
        progress.style.width = (scrubber.offsetWidth * percent) + 'px';

        var played = getByClass(player.playedClass, this.wrapper),
            p = this.duration * percent,
            m = Math.floor(p / 60),
            s = Math.floor(p % 60);
        played.innerHTML = ((m<10?'0':'')+m+':'+(s<10?'0':'')+s);
      }
    },

    // ### Contructor functions

    // `create()`  
    // Used to create a single audiojs instance.  
    // If an array is passed call back to `createAll()`.  
    // Otherwise, create a single instance and return it.  
    create: function(element, options) {
      var options = options || {}
      if (element.length) {
        return this.createAll(options, element);
      } else {
        return this.newInstance(element, options);
      }
    },

    // `createAll()`  
    // Used to create multiple audiojs instances.  
    // If no array of elements is passed, then automatically find any `<audio>` tags on the page and create instances for them.
    createAll: function(options, elements) {
      var audioElements = elements || document.getElementsByTagName('audio'),
          instances = []
          options = options || {};
      for (var i = 0, ii = audioElements.length; i < ii; i++) {
        instances.push(this.newInstance(audioElements[i], options));
      }
      return instances;
    },

    // ### Creating and returning a new instance
    // This goes through all the steps and logic forking required to build out a usable audiojs instance.
    newInstance: function(element, options) {
      var element = element,
          s = this.helpers.clone(this.settings),
          id = 'audiojs'+this.instanceCount,
          wrapperId = 'audiojs_wrapper'+this.instanceCount,
          instanceCount = this.instanceCount++;

      // Check for autoplay and loop attributes and write them into the settings.
      if (element.getAttribute('autoplay') != undefined) s.autoplay = true;
      if (element.getAttribute('loop') != undefined) s.loop = true;
      if (element.getAttribute('preload') == 'none') s.preload = false;
      // Merge the default settings with the user-defined options.
      if (options) this.helpers.merge(s, options);

      // Inject the player html if required.
      if (s.createPlayer.markup) element = this.createPlayer(element, s.createPlayer, wrapperId);
      else element.parentNode.setAttribute('id', wrapperId);

      // Build out a new audiojs instance.
      var audio = container[audiojsInstance].apply(element, [s]);

      // If css has been passed in, then dynamically inject it into the `<head>`
      if (s.css) this.helpers.injectCss(audio, s.css);

      // If `<audio>` isn't supported, insert the swf & attach the required events for it.
      if (s.useFlash) {
        this.injectFlash(audio, id);
        this.attachFlashEvents(audio.wrapper, audio);
      }

      // Attach event callbacks to the new audiojs instance.
      this.attachEvents(audio.wrapper, audio);

      // Store the newly-created audiojs instance.
      this.instances[id] = audio;
      return audio;
    },

    // ### Helper methods for constructing a working player
    // Inject a wrapping div and the markup for the html player.
    createPlayer: function(element, player, id) {
      // Wrap the `<audio>` element and append the player markup to that wrapper.
      var wrapper = document.createElement('div'),
          newElement = element.cloneNode(true);
      wrapper.setAttribute('class', 'audiojs');
      wrapper.setAttribute('id', id);

      // Fix IE's broken implementation of innerHTML & `cloneNode` for HTML5 elements.
      if (newElement.outerHTML && (/<:audio/).test(newElement.outerHTML)) {
        newElement = this.helpers.cloneHtml5Node(element);
        wrapper.innerHTML = player.markup;
        wrapper.appendChild(newElement);
        element.outerHTML = wrapper.outerHTML;
        wrapper = document.getElementById(id);
      } else {
        wrapper.appendChild(newElement);
        wrapper.innerHTML = wrapper.innerHTML + player.markup;
        element.parentNode.replaceChild(wrapper, element);
      }
      return wrapper.getElementsByTagName('audio')[0];
    },

    // Attaches the callbacks from the `<audio>` object into an audiojs instance.
    attachEvents: function(wrapper, audio) {
      var ios = (/(ipod|iphone|ipad)/i).test(navigator.userAgent),
          player = audio.settings.createPlayer,
          playPause = getByClass(player.playPauseClass, wrapper),
          scrubber = getByClass(player.scrubberClass, wrapper),
          leftPos = function(elem) {
            var curleft = 0;
            if (elem.offsetParent) {
              do { curleft += elem.offsetLeft; } while (elem = elem.offsetParent);
            }
            return curleft;
          };

      // If this is the first interaction with the player, iOS needs to start preloading the audio file.  
      // Otherwise, just play/pause.
      container[audiojs].events.addListener(playPause, 'click', function(e) {
        if (ios && audio.element.readyState == 0) audio.init.apply(audio);
        audio.playPause.apply(audio);
      });

      container[audiojs].events.addListener(scrubber, 'click', function(e) {
        var relativeLeft = e.clientX - leftPos(this);
        audio.skipTo(relativeLeft / scrubber.offsetWidth);
      });

      // _If `<audio>` isn't supported, don't register the following handlers._
      if (audio.settings.useFlash) return;

      // Start tracking the load progress of the audio
      container[audiojs].events.trackLoadProgress(audio);

      container[audiojs].events.addListener(audio.element, 'timeupdate', function(e) {
        audio.updatePlayhead.apply(audio);
      });

      container[audiojs].events.addListener(audio.element, 'ended', function(e) {
        audio.trackEnded.apply(audio);
      });

      container[audiojs].events.addListener(audio.source, 'error', function(e) {
        clearInterval(audio.readyTimer);
        clearInterval(audio.loadTimer);
        audio.settings.loadError.apply(audio);
      });

    },

    // Flash requires a slightly different API to the `<audio>` element, so this method is used to overwrite the default event handlers.
    attachFlashEvents: function(element, audio) {
      audio['flashReady'] = false;
      audio['load'] = function(mp3) {
        audio.mp3 = mp3;
        // If the swf isn't ready yet, then `init()` will handle loading the mp3
        if (audio.flashReady) audio.element.load(mp3);
      }
      audio['loadProgress'] = function(percent, duration) {
        audio.loadedPercent = percent;
        audio.duration = duration;
        audio.settings.loadStarted.apply(audio);
        audio.settings.loadProgress.apply(audio, [percent]);
      }
      audio['skipTo'] = function(percent) {
        if (percent > audio.loadedPercent) return;
        audio.updatePlayhead.call(audio, [percent])
        audio.element.skipTo(percent);
      }
      audio['updatePlayhead'] = function(percent) {
        audio.settings.updatePlayhead.apply(audio, [percent]);
      }
      audio['play'] = function() {
        audio.playing = true;
        // IE doesn't allow a method named `play()` to be exposed through `ExternalInterface`, so lets go with `pplay()`.  
        // <http://dev.nuclearrooster.com/2008/07/27/externalinterfaceaddcallback-can-cause-ie-js-errors-with-certain-keyworkds/>
        audio.element.pplay();
        audio.settings.play.apply(audio);
      }
      audio['pause'] = function() {
        audio.playing = false;
        // Use `ppause()` for consistency with `pplay()`, even though it isn't really required.
        audio.element.ppause();
        audio.settings.pause.apply(audio);
      }
      audio['loadStarted'] = function() {
        // Load the mp3 specified by the audio element into the swf.
        audio.flashReady = true;
        audio.element.init(audio.mp3);
        if (audio.settings.autoplay) audio.play.apply(audio);
      }
    },

    // ### Injecting an swf from a string
    // Build up the swf source by replacing the `$keys` and then inject it into the page.
    injectFlash: function(audio, id) {
      var flashSource = this.flashSource.replace(/\$1/g, id);
      flashSource = flashSource.replace(/\$2/g, audio.settings.swfLocation);
      // `(+new Date)` ensures the swf is requested fresh each time
      flashSource = flashSource.replace(/\$3/g, (+new Date + Math.random()));

      // Use an `innerHTML` insertion technique that will work with IE.
      var html = audio.wrapper.innerHTML,
          div = document.createElement('div');
          div.innerHTML = flashSource + html;

      audio.wrapper.innerHTML = div.innerHTML;
      audio.element = this.helpers.getSwf(id);
    },

    // ## Helper functions
    helpers: {
      // **Merge two objects, with `obj2` overwriting `obj1`**  
      // The merge is shallow, but that's all that is required for our purposes.
      merge: function(obj1, obj2) {
        for (attr in obj2) {
          if (obj1.hasOwnProperty(attr) || obj2.hasOwnProperty(attr)) {
            obj1[attr] = obj2[attr];
          }
        }
      },
      // **Clone a javascript object (recursively)**
      clone: function(obj){
        if (obj == null || typeof(obj) !== 'object') return obj;
        var temp = new obj.constructor();
        for (var key in obj) temp[key] = arguments.callee(obj[key]);
        return temp;
      },
      // **Adding/removing classnames from elements**
      addClass: function(element, className) {
        var re = new RegExp('(\\s|^)'+className+'(\\s|$)');
        if (re.test(element.className)) return;
        element.className += ' ' + className;
      },
      removeClass: function(element, className) {
        var re = new RegExp('(\\s|^)'+className+'(\\s|$)');
        element.className = element.className.replace(re,' ');
      },
      // **Dynamic CSS injection**
      // Takes a string of css, inserts it into a style element, then injects it into the very top of the `<head>`
      injectCss: function(audio, string) {
        var head = document.getElementsByTagName('head')[0],
            firstchild = head.firstChild,
            style = document.createElement('style'),
            css = string.replace(/\$1/g, audio.settings.imageLocation);

        if (!head) return;
        // If an audiojs `<style>` tag already exists, append to it
        var prepend = '',
            styles = document.getElementsByTagName('style');

        for (var i = 0, ii = styles.length; i < ii; i++) {
          var title = styles[i].getAttribute('title');
          if (/audiojs/.test(title)) {
            style = styles[i];
            prepend = style.innerHTML;
          }
          break;
        };

        style.setAttribute('type', 'text/css');
        style.setAttribute('title', 'audiojs');

        if (style.styleSheet) style.styleSheet.cssText = prepend + css;
        else style.appendChild(document.createTextNode(prepend + css));

        if (firstchild) head.insertBefore(style, firstchild);
        else head.appendChild(styleElement);
      },
      // **Handle all the IE6+7 requirements for cloning `<audio>` nodes**  
      // Create a html5-safe document fragment by injecting an `<audio>` element into the document fragment.
      cloneHtml5Node: function(audioTag) {
        var fragment = document.createDocumentFragment();
        fragment.createElement('audio');
        var div = fragment.createElement('div');
        fragment.appendChild(div);
        // _outerHTML is not supported by Firefox, so this technique is reserved for IE._
        div.innerHTML = audioTag.outerHTML;
        return div.firstChild;
      },
      // **Cross-browser `<object>` / `<embed>` element selection**
      getSwf: function(name) {
        var swf = document[name] || window[name];
        return swf.length > 1 ? swf[swf.length - 1] : swf;
      }
    },
    // ## Event-handling
    events: {
      memoryLeaking: false,
      listeners: [],
      // **A simple cross-browser event handler abstraction**
      addListener: function(element, eventName, func) {
        // For modern browsers use the standard DOM-compliant addEventListener.
        if (element.addEventListener) {
          element.addEventListener(eventName, func, false);
          // For older versions of Internet Explorer, use `attachEvent`.  
          // Scope `this` to refer to the calling element and register each listener so the containing elements can be purged on page unload.
        } else if (element.attachEvent) {
          this.listeners.push(element);
          if (!this.memoryLeaking) {
            window.attachEvent('onunload', function() {
              for (var i = 0, ii = this.listeners.length; i < ii; i++) {
                container[audiojs].events.purge(this.listeners[i]);
              }
            });
            this.memoryLeaking = true;
          }
          element.attachEvent('on' + eventName, function() {
            func.call(element, window.event);
          });
        }
      },

      trackLoadProgress: function(audio) {
        var readyTimer,
            loadTimer,
            audio = audio,
            ios = (/(ipod|iphone|ipad)/i).test(navigator.userAgent);
        // Use a timer here rather than the official `progress` event, as Chrome has issues calling `progress` when loading files already in cache.
        readyTimer = setInterval(function() {
          if (audio.element.readyState > -1) {
            // iOS doesn't start preloading the audio file until the user interacts manually, so this stops the loader being displayed prematurely.
            if (audio.settings.preload && !ios) audio.init.apply(audio);
          }
          if (audio.element.readyState > 1) {
            // If autoplay has been set, start playing the audio.
            if (audio.settings.autoplay) audio.play.apply(audio);
            clearInterval(readyTimer);
            // Once we have data, then start tracking the load progress.
            loadTimer = setInterval(function() {
              audio.loadProgress.apply(audio);
              if (audio.loadedPercent >= 1) clearInterval(loadTimer);
            });
          }
        }, 10);
        audio.readyTimer = readyTimer;
        audio.loadTimer = loadTimer;
      },

      // **Douglas Crockford's IE6 memory leak fix**  
      // <http://javascript.crockford.com/memory/leak.html>  
      // This is used to release the memory leak created by fixing `this` scoping for IE. It is called on page unload.
      purge: function(d) {
        var a = d.attributes, i;
        if (a) {
          for (i = 0; i < a.length; i += 1) {
            if (typeof d[a[i].name] === 'function') d[a[i].name] = null;
          }
        }
        a = d.childNodes;
        if (a) {
          for (i = 0; i < a.length; i += 1) purge(d.childNodes[i]);
        }
      },

      // **DOMready function**  
      // As seen here: <http://webreflection.blogspot.com/2007/09/whats-wrong-with-new-iecontentloaded.html>  
      ready: (function(ie) {
        var d = document;
        return ie ? function(c){
          var n = d.firstChild,
              f = function(){
                try{ c(n.doScroll('left')) }
                catch(e){ setTimeout(f, 10) }
              };
              f()
        } :
        /webkit|safari|khtml/i.test(navigator.userAgent) ? function(c){
          var f = function(){
            /loaded|complete/.test(d.readyState) ? c() : setTimeout(f, 10)
          };
          f();
        } :
        function(c){
          d.addEventListener('DOMContentLoaded', c, false);
        }
      })(/*@cc_on 1@*/)

    }
  }

  // ## The audiojs class
  // We create one of these per audio tag and then push them into `audiojs['instances']`.
  container[audiojsInstance] = function(settings) {
    // First check the `<audio>` element directly for a src, then if one is not found, look for a `<source>` element.
    var mp3 = (function(audio) {
      var source = audio.getElementsByTagName('source')[0];
      return audio.getAttribute('src') || (source ? source.getAttribute('src') : null);
    })(this);
    // Each audio instance returns an object which contains an API back into the `<audio>` element.
    return {
      // Storage properties:
      element: this,
      wrapper: this.parentNode,
      source: this.getElementsByTagName('source')[0] || this,
      mp3: mp3,
      settings: settings,
      loadStartedCalled: false,
      loadedPercent: 0,
      duration: 1,
      playing: false,
      // API access events:  
      // These call back into the user-provided settings object and handle all the required internal processing.
      updatePlayhead: function() {
        var percent = this.element.currentTime / this.duration;
        this.settings.updatePlayhead.apply(this, [percent]);
      },
      skipTo: function(percent) {
        if (percent > this.loadedPercent) return;
        this.element.currentTime = this.duration * percent;
        this.updatePlayhead();
      },
      load: function(mp3) {
        this.loadStartedCalled = false;
        this.source.setAttribute('src', mp3);
        this.mp3 = mp3;
        container[audiojs].events.trackLoadProgress(this);
      },
      loadError: function() {
        this.settings.loadError.apply(this);
      },
      init: function() {
        this.settings.init.apply(this);
      },
      loadStarted: function() {
        // Wait until `element.duration` exists before setting up the audio player
        if (!this.element.duration) return false;

        this.duration = this.element.duration;
        this.updatePlayhead();
        this.settings.loadStarted.apply(this);
      },
      loadProgress: function() {
        if (this.element.buffered != undefined && this.element.buffered.length) {
          if (!this.loadStartedCalled) {
            this.loadStartedCalled = this.loadStarted();
          }
          var durationLoaded = this.element.buffered.end(this.element.buffered.length - 1);
          this.loadedPercent = durationLoaded / this.duration;

          this.settings.loadProgress.apply(this, [this.loadedPercent]);
        }
      },
      playPause: function() {
        if (this.playing) this.pause();
        else this.play();
      },
      play: function() {
        this.playing = true;
        this.element.play();
        this.settings.play.apply(this);
      },
      pause: function() {
        this.playing = false;
        this.element.pause();
        this.settings.pause.apply(this);
      },
      trackEnded: function(e) {
        this.skipTo.apply(this, [0]);
        if (!this.settings.loop) this.pause.apply(this);
        this.settings.trackEnded.apply(this);
      }
    }
  }

  // **getElementsByClassName**  
  // Having to rely on `getElementsByTagName` is pretty inflexible, so a modified version of Dustin Diaz's `getElementsByClassName` has been included.
  // This version cleans up a bit and uses the native DOM method if it's available.
  var getByClass = function(searchClass, node, tag) {
    var matches = [],
        node = node || document,
        tag = tag || '*',
        els = node.getElementsByTagName(tag),
        pattern = new RegExp("(^|\\s)"+searchClass+"(\\s|$)");

    if (document.getElementsByClassName) {
      matches = node.getElementsByClassName(searchClass);
    } else {
      for (i = 0, j = 0, l = els.length; i < l; i++) {
        if (pattern.test(els[i].className)) {
          matches[j] = els[i];
          j++;
        }
      }
    }
    return matches.length > 1 ? matches : matches[0];
  }

})('audiojs', 'audiojsInstance', this);