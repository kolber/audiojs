# audio.js

## Usage

Include audio.js:
    <script src="./audio.js"></script>

HTML:
    <audio id="audio_tag2" preload="auto" autobuffer>
      <source src="./juicy.mp3">
    </audio>

Javascript:
    audiojs.events.ready(function() {
      var as = audiojs.createAll();
    });

See `test1.html`, `test2.html` & `test3.html` for more detailed use case tests.

## Compiling Flash from the command line

Using the Flex SDK (which is free), flash movies can be compiled
directly from the command line. It makes life that little bit less painful.

### Installing mxmlc

1. Download and unzip the current 'Milestone Release' 'Open Source Flex SDK' from:
   <http://opensource.adobe.com/wiki/display/flexsdk/Download+Flex+4>

2. Copy the `bin` folder to `/usr/local/bin/flex/bin/`

3. Add `/usr/local/bin/flex/bin/` to your `PATH`

### Compiling the SWF

Run the following command from within the audiojs folder.

    mxmlc audiojs.as