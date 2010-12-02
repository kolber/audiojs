/*


  TODO:
  - Rather than getElementsByTagName, use class matching
  - Flash integration cleanup
  - Use custom css alongside global css
  - Handle jquery elements passed in

*/


// cross-browser dom-ready method

(function(audioJS, audioJS_instance, container) {

  /*

    The window.audioJS_instance psuedo class

  */

  container[audioJS_instance] = function(settings) {

    var source = this.getElementsByTagName('source')[0]

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

  /*

    The window.audioJS pseudo singleton

  */

  container[audioJS] = {

    instance_count: 0,
    instances: [],

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
    flash_source: '\
      <object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="1" height="1" name="$1"> \
        <param name="movie" value="$2?player_instance='+audioJS+'.instances[\'$1\']&load_callback=load_started"> \
        <param name="allowscriptaccess" value="always"> \
        <embed name="$1" src="$2?player_instance='+audioJS+'.instances[\'$1\']&load_callback=load_started" width="1" height="1" allowscriptaccess="always"> \
      </object>',

    settings: {

      autoplay: false,
      swf_location: './audiojs.swf',
      use_flash: (function() {
        var a = document.createElement('audio');
        return !(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''));
      })(),

      create_player: {
        markup: '<div class="play_pause"><p>❙ ❙</p><p>▶</p></div><div class="scrubber"><div class="played"></div><div class="loaded"></div></div><div class="duration"><em>00:00</em>/<strong>00:00</strong></div>',
        play_pause_class: 'play_pause',
        scrubber_class: 'played',
        loaded_percent_class: 'loaded'
      },

      track_ended: function() {
        console.warn('TRACK ENDED');
      },

      load_error: function(e) {
        var scrubber = this.wrapper.getElementsByTagName('div')[1],
            duration = this.wrapper.getElementsByTagName('div')[4],
            play_pause = this.wrapper.getElementsByTagName('div')[0];
        this.wrapper.style.clear = 'both';
        duration.style.display = 'none';
        play_pause.style.display = 'none';
        scrubber.innerHTML = 'Error loading "'+this.mp3+'"';
      },

      load_started: function() {

        var wrapper = this.wrapper.getElementsByTagName('div')[4],
            duration = wrapper.getElementsByTagName('strong')[0],
            m = Math.floor(this.duration / 60),
            s = Math.floor(this.duration % 60);

        duration.innerHTML = ((m<10?"0":"")+m+":"+(s<10?"0":"")+s);
      },

      load_progress: function(loaded_percent) {
        var wrapper = this.wrapper.getElementsByTagName('div')[1],
            loaded = wrapper.getElementsByTagName('div')[1];

        loaded.style.width = (wrapper.offsetWidth * loaded_percent) + 'px';
      },

      play_pause: function() {
        if (this.playing) this.settings.play();
        else this.settings.pause();
      },

      play: function() {
        var wrapper = this.wrapper.getElementsByTagName('div')[0];
        wrapper.getElementsByTagName('p')[0].style.display = 'block';
        wrapper.getElementsByTagName('p')[1].style.display = 'none';
      },

      pause: function() {
        var wrapper = this.wrapper.getElementsByTagName('div')[0];
        wrapper.getElementsByTagName('p')[0].style.display = 'none';
        wrapper.getElementsByTagName('p')[1].style.display = 'block';
      },

      update_playhead: function(percent_played) {
        var wrapper = this.wrapper.getElementsByTagName('div')[1],
            playhead = wrapper.getElementsByTagName('div')[0];
        playhead.style.width = (wrapper.offsetWidth * percent_played) + 'px';

        var wrapper = this.wrapper.getElementsByTagName('div')[4],
            played = wrapper.getElementsByTagName('em')[0]
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
      // return single audioJS instance
      return this.new_instance(element, options);
    },

    create_all: function(options) {
      // automatically create from any audio tags on the page
      var audio_elements = document.getElementsByTagName('audio'),
          instances = []
          options = options || {};

      for (var i = 0, ii = audio_elements.length; i < ii; i++) {
        instances.push(this.new_instance(audio_elements[i], options));
      }

      return instances;
    },

    create_player: function(element, player) {
      // wrap the audio element and append the player markup to that wrapper
      var wrapper = document.createElement('div'),
          element = element;
      wrapper.setAttribute('class', 'audiojs');
      wrapper.setAttribute('id', 'audiojs_'+this.instance_count);
      wrapper.appendChild(element.cloneNode(true));
      wrapper.innerHTML = wrapper.innerHTML + player.markup;
      element.parentNode.replaceChild(wrapper, element);

      // return wrapped element
      return wrapper.getElementsByTagName('audio')[0];
    },

    attach_events: function(wrapper, audio_instance) {
      // Handle play/pause click
      var play_pause = wrapper.getElementsByTagName('div')[0],
          scrubber = wrapper.getElementsByTagName('div')[1],
          left_pos = function(elem) {
            var curleft = 0;
            if (elem.offsetParent) {
              do { curleft += elem.offsetLeft; } while (elem = elem.offsetParent);
            }
            return curleft;
          };

      container[audioJS].events.add_listener(play_pause, 'click', function(e) {
        audio_instance.play_pause();
      });

      container[audioJS].events.add_listener(scrubber, 'click', function(e) {
        var relative_left = e.clientX - left_pos(this);
        audio_instance.skip_to(relative_left / scrubber.offsetWidth);
      });

      container[audioJS].events.add_listener(audio_instance.element, 'progress', function(e) {
        audio_instance.load_progress.apply(audio_instance);
      });

      container[audioJS].events.add_listener(audio_instance.element, 'timeupdate', function(e) {
        audio_instance.update_playhead.apply(audio_instance);
      });

      container[audioJS].events.add_listener(audio_instance.element, 'ended', function(e) {
        audio_instance.track_ended.apply(audio_instance);
      });

      container[audioJS].events.add_listener(audio_instance.source, 'error', function(e) {
        audio_instance.settings.load_error.apply(audio_instance);
      });

    },

    attach_flash_events: function(element, audio_instance) {

      // overwrite audio instance methods
      this.helpers.merge(audio_instance, {
        load_progress: function(loaded_percent, duration) {
          this.loaded_percent = loaded_percent;
          this.duration = duration;
          this.settings.load_started.apply(this);
          this.settings.load_progress.apply(this, [this.loaded_percent]);
        },

        skip_to: function(percent) {
          if (percent > this.loaded_percent) return;
          this.element.skip_to(percent);
        },

        update_playhead: function(percent_played) {
          this.settings.update_playhead.apply(this, [percent_played]);
        }
      })

    },

    new_instance: function(element, options) {
      var s = this.settings;
      if (options) this.helpers.merge(s, options);

      this.instance_count++;

      if (s.create_player) {
        element = this.create_player(element, s.create_player);
      }

      // return new audioJS instance
      var new_audio = container[audioJS_instance].apply(element, [s]);
      this.instances['audiojs_'+this.instance_count] = new_audio;

      if (s.use_flash) {
        var id = 'audiojs_'+this.instance_count,
            flash_source = this.flash_source.replace(/\$1/g, id);

        new_audio.load_started = function() {
          // load in correct mp3
          this.element.load(this.mp3);
          if (s.autoplay) new_audio.play();
          else new_audio.pause();
        }

        // Insert swf include
        flash_source = flash_source.replace(/\$2/g, this.settings.swf_location);
        new_audio.wrapper.innerHTML = flash_source + new_audio.wrapper.innerHTML;
        new_audio.element = this.helpers.get_swf(id);

        // attach flash-specfic events
        this.attach_flash_events(new_audio.wrapper, new_audio);

      } else {
        if (s.autoplay) new_audio.play();
        else new_audio.pause();
      }

      if (s.create_player) this.attach_events(new_audio.wrapper, new_audio);

      return new_audio;
    }

  }

})('audioJS', 'audioJS_instance', this);