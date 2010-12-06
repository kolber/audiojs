/*

  TODO:
  - IE
    - document.ready fails on error
    - IE6 styling issues
  - Play/pause images
  - Use javacript-generated css alongside global css
  - camelCased method & variable names
  - Add a test case for a single player with a playlist
  - MP3s are requested multiple times

*/

(function(audioJS, audioJS_instance, container) {

  // A modified version of Dustin Diaz's getElementsByClassName implementation
  // This version cleans up a bit and falls back to the native method if available
  var get_by_class = function(searchClass, node, tag) {
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

  // The audioJS 'class'
  // We create one of these per audio tag and then push them into audioJS.instances
  container[audioJS_instance] = function(settings) {
    var source = this.getElementsByTagName('source')[0];
    return {
      element: this,
      wrapper: this.parentNode,
      source: source,
      mp3: source ? source.getAttribute('src') : null,
      settings: settings,
      load_started_called: false,
      loaded_percent: 0,
      duration: 1,
      playing: false,

      update_playhead: function() {
        var percent_played = this.element.currentTime / this.duration;
        this.settings.update_playhead.apply(this, [percent_played]);
      },
      skip_to: function(percent) {
        if (percent > this.loaded_percent) return;
        this.element.currentTime = this.duration * percent;
        this.update_playhead();
      },
      load: function(mp3) {
        this.source.setAttribute('src', mp3);
        this.mp3 = mp3;
      },
      load_error: function() {
        this.settings.load_error.apply(this);
      },
      initialised: function() {
        this.settings.initialised.apply(this);
      },
      load_started: function() {
        this.duration = this.element.duration;
        this.update_playhead();
        this.settings.load_started.apply(this);
      },
      load_progress: function() {
        if (this.element.buffered != undefined && this.element.buffered.length) {
          if (!this.load_started_called) {
            this.load_started();
            this.load_started_called = true;
          }
          var duration_loaded = this.element.buffered.end(this.element.buffered.length - 1);
          this.loaded_percent = duration_loaded / this.duration;

          this.settings.load_progress.apply(this, [this.loaded_percent]);
        }
      },
      play_pause: function() {
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
      track_ended: function(e) {
        this.settings.track_ended.apply(this);
      }
    }
  };

  // The audioJS global 'singleton'
  // This is our interface for creating new audioJS instances
  container[audioJS] = {
    instance_count: 0,
    instances: {},

    default_css: '\
      .audiojs .play_pause { clear: both; cursor: pointer; -webkit-text-selection: none; height: 20px; line-height: 20px; text-align: center; background: #eee; color: #666; font-size: 10px; float: left; margin: 0px 0px 10px; } \
      .audiojs .play_pause p { display: inline; margin: 0px; font-family: sans-serif; } \
      .audiojs .scrubber { float: left; width: 300px; height: 20px; background: #eee; position: relative; white-space: nowrap; } \
      .audiojs .played { z-index: 1; position: absolute; top: 0px; left: 0px; bottom: 0px; width: 0px; background: #e0e0e0; } \
      .audiojs .loaded { position: absolute; top: 0px; left: 0px; bottom: 0px; width: 0px; background: #e6e6e6; } \
      .audiojs .duration { float: left; color: #999; margin: 3px 0px 0px 10px; } \
      .audiojs .duration em { font-style: normal; color: #666; } \
      .audiojs .duration strong { font-weight: normal; }',

    // $1 is the name of the flash movie
    // $2 is the path to the swf
    // (+new Date) ensures we always get a fresh copy of the swf (for IE)
    flash_source: '\
      <object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" id="$1" width="1" height="1" name="$1"> \
        <param name="movie" value="$2?player_instance='+audioJS+'.instances[\'$1\']&datetime='+(+new Date)+'"> \
        <param name="allowscriptaccess" value="always"> \
        <embed name="$1" src="$2?player_instance='+audioJS+'.instances[\'$1\']&datetime='+(+new Date)+'" width="1" height="1" allowscriptaccess="always"> \
      </object>',

    settings: {
      autoplay: false,
      swf_location: './audiojs.swf',
      use_flash: (function() {
        var a = document.createElement('audio');
        return !(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''));
      })(),

      create_player: {
        markup: '<div class="play_pause"><p class="play">PLY</p><p class="pause">PSE</p></div><div class="scrubber"><div class="progress"></div><div class="loaded"></div></div><div class="time"><em class="played">00:00</em>/<strong class="duration">00:00</strong></div><div class="loading">Loading...</div>',
        play_pause_class: 'play_pause',
        play_class: 'play',
        pause_class: 'pause',
        scrubber_class: 'scrubber',
        progress_class: 'progress',
        loader_class: 'loaded',
        time_class: 'time',
        duration_class: 'duration',
        played_class: 'played',
        loading_class: 'loading'
      },

      track_ended: function() {},
      load_error: function(e) {
        var player = this.settings.create_player,
            scrubber = get_by_class(player.scrubber_class, this.wrapper),
            duration = get_by_class(player.time_class, this.wrapper),
            play_pause = get_by_class(player.play_pause_class, this.wrapper),
            loading = get_by_class(player.loading_class, this.wrapper);
        this.wrapper.style.clear = 'both';
        duration.style.display = 'none';
        play_pause.style.display = 'none';
        loading.style.display = 'none';
        scrubber.innerHTML = 'Error loading "'+this.mp3+'"';
      },
      initialised: function() {
        var player = this.settings.create_player,
            loading = get_by_class(player.loading_class, this.wrapper),
            play_pause = get_by_class(player.play_pause_class, this.wrapper);
        loading.style.display = 'block';
        play_pause.style.display = 'none';
      },
      load_started: function() {
        var player = this.settings.create_player,
            loading = get_by_class(player.loading_class, this.wrapper),
            time = get_by_class(player.time_class, this.wrapper),
            duration = get_by_class(player.duration_class, this.wrapper),
            play_pause = get_by_class(player.play_pause_class, this.wrapper),
            m = Math.floor(this.duration / 60),
            s = Math.floor(this.duration % 60);
        loading.style.display = 'none';
        play_pause.style.display = 'block';
        time.style.display = 'block';
        duration.innerHTML = ((m<10?"0":"")+m+":"+(s<10?"0":"")+s);
      },
      load_progress: function(loaded_percent) {
        var player = this.settings.create_player,
            scrubber = get_by_class(player.scrubber_class, this.wrapper),
            loaded = get_by_class(player.loader_class, this.wrapper);
        loaded.style.width = (scrubber.offsetWidth * loaded_percent) + 'px';
      },
      play_pause: function() {
        if (this.playing) this.settings.play();
        else this.settings.pause();
      },
      play: function() {
        var player = this.settings.create_player;
        get_by_class(player.play_class, this.wrapper).style.display = 'none';
        get_by_class(player.pause_class, this.wrapper).style.display = 'block';
      },
      pause: function() {
        var player = this.settings.create_player;
        get_by_class(player.play_class, this.wrapper).style.display = 'block';
        get_by_class(player.pause_class, this.wrapper).style.display = 'none';
      },

      update_playhead: function(percent_played) {
        var player = this.settings.create_player,
            scrubber = get_by_class(player.scrubber_class, this.wrapper),
            progress = get_by_class(player.progress_class, this.wrapper);
        progress.style.width = (scrubber.offsetWidth * percent_played) + 'px';

        var played = get_by_class(player.played_class, this.wrapper),
            p = this.duration * percent_played,
            m = Math.floor(p / 60),
            s = Math.floor(p % 60);
        played.innerHTML = ((m<10?"0":"")+m+":"+(s<10?"0":"")+s);
      }
    },

    helpers: {
      merge: function(obj1, obj2) {
        for (attr in obj2) {
          if (obj1.hasOwnProperty(attr) || obj2.hasOwnProperty(attr)) {
            obj1[attr] = obj2[attr];
          }
        }
      },
      clone: function(obj){
        if (obj == null || typeof(obj) !== 'object') return obj;
        var temp = new obj.constructor();
        for (var key in obj) temp[key] = arguments.callee(obj[key]);
        return temp;
      },
      clone_html5_node: function(audio_tag) {
        // create a html5-safe document fragment
        var fragment = document.createDocumentFragment();
        // enable audio-tag support on the fragment
        fragment.createElement('audio');
        var div = fragment.createElement('div');
        fragment.appendChild(div);
        // note: outerHTML is not supported by Firefox, so we can't use this everywhere
        div.innerHTML = audio_tag.outerHTML;
        // return the audio node
        return div.firstChild;
      },
      get_swf: function(name) {
        var swf = document[name] || window[name];
        return swf.length > 1 ? swf[swf.length - 1] : swf;
      }
    },

    events: {
      memory_leaking: false,
      listeners: [],

      add_listener: function(element, eventName, func) {
        if (element.addEventListener) {
          // Use the standard DOM-compliant addEventListener
          element.addEventListener(eventName, func, false);
        } else if (element.attachEvent) {
          // Store listeners so that the containing elements can
          // be purged on page unload
          this.listeners.push(element);
          if (!this.memory_leaking) {
            window.attachEvent('onunload', function() {
              for (var i = 0, ii = this.listeners.length; i < ii; i++) {
                container[audioJS].events.purge(this.listeners[i]);
              }
            });
            this.memory_leaking = true;
          }
          // Attach event
          element.attachEvent('on' + eventName, function() {
            // Scope this to refer to the calling element
            func.call(element, window.event);
          });
        }
      },

      // Douglas Crockford's IE6 memory leak fix
      // http://javascript.crockford.com/memory/leak.html
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

      // DOMready function
      // As seen here: http://webreflection.blogspot.com/2007/09/whats-wrong-with-new-iecontentloaded.html
      // This needs replacing as any script errors will cause IE to go into an infite loop
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
          d.addEventListener("DOMContentLoaded", c, false);
        }
      })(/*@cc_on 1@*/)

    },

    create: function(element, options) {
      var options = options || {}
      // return single audioJS instance
      if (element.length) {
        return this.create_all(options, element);
      } else {
        return this.new_instance(element, options);
      }
    },
    create_all: function(options, elements) {
      // automatically create any audio tags on the page
      var audio_elements = elements || document.getElementsByTagName('audio'),
          instances = []
          options = options || {};
      for (var i = 0, ii = audio_elements.length; i < ii; i++) {
        instances.push(this.new_instance(audio_elements[i], options));
      }
      return instances;
    },

    create_player: function(element, player, id) {
      // wrap the audio element and append the player markup to that wrapper
      var wrapper = document.createElement('div'),
          element = element;
      wrapper.setAttribute('class', 'audiojs');
      wrapper.setAttribute('id', id);
      // Fix IEs broken implementation of innerHTML & broken handling of HTML5 elements
      if (/MSIE/.test(navigator.userAgent)) {
        wrapper.innerHTML = player.markup;
        wrapper.appendChild(this.helpers.clone_html5_node(element));
        element.outerHTML = wrapper.outerHTML;
        wrapper = document.getElementById(id);
      } else {
        wrapper.appendChild(element.cloneNode(true));
        wrapper.innerHTML = wrapper.innerHTML + player.markup;
        element.parentNode.replaceChild(wrapper, element);
      }
      return wrapper.getElementsByTagName('audio')[0];
    },

    attach_events: function(wrapper, audio) {
      // Handle play/pause click
      var ios = (/(iPod|iPhone|iPad)/).test(navigator.userAgent),
          player = audio.settings.create_player,
          play_pause = get_by_class(player.play_pause_class, wrapper),
          scrubber = get_by_class(player.scrubber_class, wrapper),
          left_pos = function(elem) {
            var curleft = 0;
            if (elem.offsetParent) {
              do { curleft += elem.offsetLeft; } while (elem = elem.offsetParent);
            }
            return curleft;
          };

      container[audioJS].events.add_listener(play_pause, 'click', function(e) {
        // For ios we can start preloading the audio file now
        if (ios && audio.element.readyState == 0) audio.initialised.apply(audio);
        audio.play_pause.apply(audio);
      });

      container[audioJS].events.add_listener(scrubber, 'click', function(e) {
        var relative_left = e.clientX - left_pos(this);
        audio.skip_to(relative_left / scrubber.offsetWidth);
      });

      // If we're using flash, then all the following events are no longer useful to us
      if (audio.settings.use_flash) return;

      var timer = setInterval(function() {
        if (audio.element.readyState == 0) {
          // Start the player in its pause state
          audio.pause.apply(audio);
          // ios never starts preloading the audio file, so we need to
          // prevent the loader displaying prematurely
          if(!ios) audio.initialised.apply(audio);
        } else if (audio.element.readyState > 1) {
          // Call pause again to handle Chrome sometimes missing readyState 0
          audio.pause.apply(audio);
          // Handle autoplay
          if (audio.settings.autoplay) audio.play.apply(audio);
          clearInterval(timer);

          var timer2 = setInterval(function() {
            audio.load_progress.apply(audio);
            if (audio.loaded_percent >= 1) clearInterval(timer2);
          });

        }
      }, 10);

      container[audioJS].events.add_listener(audio.element, 'timeupdate', function(e) {
        audio.update_playhead.apply(audio);
      });

      container[audioJS].events.add_listener(audio.element, 'ended', function(e) {
        audio.track_ended.apply(audio);
      });

      container[audioJS].events.add_listener(audio.source, 'error', function(e) {
        clearInterval(timer);
        audio.settings.load_error.apply(audio);
      });

    },

    attach_flash_events: function(element, audio) {
      // Overwrite audio instance methods by hand
      audio['load_progress'] = function(loaded_percent, duration) {
        audio.loaded_percent = loaded_percent;
        audio.duration = duration;
        audio.settings.load_started.apply(audio);
        audio.settings.load_progress.apply(audio, [audio.loaded_percent]);
      }
      audio['skip_to'] = function(percent) {
        if (percent > audio.loaded_percent) return;
        audio.element.skip_to(percent);
      }
      audio['update_playhead'] = function(percent_played) {
        audio.settings.update_playhead.apply(audio, [percent_played]);
      }
      audio['play'] = function() {
        audio.playing = true;
        // IE doesn't allow use of the 'play' method
        // See: http://dev.nuclearrooster.com/2008/07/27/externalinterfaceaddcallback-can-cause-ie-js-errors-with-certain-keyworkds/
        audio.element.pplay();
        audio.settings.play.apply(audio);
      }
      audio['pause'] = function() {
        audio.playing = false;
        // Use 'ppause' to match 'pplay', even though it isn't required
        audio.element.ppause();
        audio.settings.pause.apply(audio);
      }
      audio['load_started'] = function() {
        // Load specified mp3 into our swf
        audio.settings.pause.apply(audio);
        audio.element.loader(audio.mp3);
      }
    },

    new_instance: function(element, options) {
      var element = element,
          s = this.helpers.clone(this.settings),
          id = 'audiojs_wrapper'+this.instance_count,
          instance_count = this.instance_count++;

      if (options) this.helpers.merge(s, options);

      if(element.getAttribute('autoplay') != undefined) s.autoplay = true;

      if (s.create_player.markup) element = this.create_player(element, s.create_player, id);
      else element.parentNode.setAttribute('id', id);

      // return new audioJS instance
      var new_audio = container[audioJS_instance].apply(element, [s]);

      // If we're using flash, insert the swf & attach the required events for it
      if (s.use_flash) {
        var id = 'audiojs'+this.instance_count,
            flash_source = this.flash_source.replace(/\$1/g, id).replace(/\$2/g, this.settings.swf_location);
        // This crazy insertion method helps gets around some IE bugs with innerHTML
        var html = new_audio.wrapper.innerHTML,
            div = document.createElement('div');
            div.innerHTML = flash_source + html;
        new_audio.wrapper.innerHTML = div.innerHTML;
        new_audio.element = this.helpers.get_swf(id);

        this.attach_flash_events(new_audio.wrapper, new_audio);
        this.attach_events(new_audio.wrapper, new_audio);
      } else {
        this.attach_events(new_audio.wrapper, new_audio);
      }

      this.instances[id] = new_audio;
      return new_audio;
    }
  }

})('audioJS', 'audioJS_instance', this);