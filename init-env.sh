#!bin/bash
# from: https://jekyllrb.com/docs/installation/ubuntu/

sudo apt-get install ruby-full build-essential zlib1g-dev

echo '# Install Ruby Gems to ~/gems' >> ~/.bashrc
echo 'export GEM_HOME="$HOME/gems"' >> ~/.bashrc
echo 'export PATH="$HOME/gems/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

gem install jekyll bundler

init bundle
bundle add jekyll
bundle exec jekyll new --force --skip-bundle .

bundle exec jekyll serve

# if line above gives ERR: can't find executable jekyll for gem jekyll. jekyll is not currently included in the bundle, 
# perhaps you meant to add it to your Gemfile? (Gem::Exception)
#
# type: jekyll -v
# if WARNING: the running version of Bundler (2.1.2) is older(..)
# gem install bundler:2.3.26
# bundle exec jekyll new --force --skip-bundle .
# open Gemfile add gem "jekyll"
# if errors: Retrying dependency api due to error (3/4): Bundler::HTTPError Network error while fetching 
# https://index.rubygems.org/api/v1/dependencies?gems=jekyll 
# (execution expired) persist http instead of https retiring secure 
# if still error: Fetching source index from http://rubygems.org/
#           Network error while fetching
# execute http://rubygems.org/quick/Marshal.4.8/jekyll-1.0.0.beta1.gemspec.rz

# Now run bundle install again (hopefully no network errors)
# still does not, aiaiai, another abandoned idea and script because im stupid...
# current error: 
# Fetching source index from http://rubygems.org/
# Network error while fetching
# http://rubygems.org/quick/Marshal.4.8/jekyll-1.0.0.beta1.gemspec.rz (execution expired)



#FORGET ALL THIS NONSENSE >>>>>>>

# create Gemfile 
# add not secure source http:______
# add -> gem "minima"
