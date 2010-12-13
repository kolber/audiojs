desc "Compile and commit new build to git"
task :build => [:compile, :commit_build]

desc "Build cache.js to cache.min.js"
task :compile do
  `closure --js=js/audio.js --compilation_level=SIMPLE_OPTIMIZATIONS --js_output_file=js/audio.min.js --warning_level=QUIET`
end

task :commit_build do
  `git commit js/audio.js -m "Closure compiled \`git rev-parse HEAD\`"`
end

#desc "Run the test suite"
#task :test do
#  `open -a Safari test/suite.html`
#end