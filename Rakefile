desc "Compile and commit new build to git"
task :build => [:compile, :commit_build]

desc "Build audio.js to audio.min.js"
task :compile do
  `closure --js=audiojs/audio.js --compilation_level=SIMPLE_OPTIMIZATIONS --js_output_file=audiojs/audio.min.js --warning_level=QUIET`
end

task :commit_build do
  `git commit audiojs/audio.js -m "Closure compiled \`git rev-parse HEAD\`"`
end

desc "Zip up a release"
task :release => :compile do
  `cat Manifest | zip -9 -@ audiojs.zip`
end

#desc "Run the test suite"
#task :test do
#  `open -a Safari test/suite.html`
#end