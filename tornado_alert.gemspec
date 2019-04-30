# -*- encoding: utf-8 -*-
$:.push File.expand_path("../lib", __FILE__)
require 'tornado_alert/version'

Gem::Specification.new do |s|
  s.name        = 'tornado_alert'
  s.version     = DSTornadoAlert::VERSION
  s.executables << 'tornado_alert'
  s.date        = '2017-04-24'
  s.summary     = 'Get specific data from darksky API'
  s.description = 'Currently using this to get tornado alerts from darksky'
  s.authors     = ['Jeremy Miller']
  s.email       = 'jmiller3346@gmail.com'
  s.homepage    = 'http://rubygems.org/gems/tornado_alert'
  s.license     = 'GPL-3.0'

  s.files         = `git ls-files`.split("\n")
  s.test_files    = `git ls-files -- {test,spec,features}/*`.split("\n")
  s.executables   = `git ls-files -- bin/*`.split("\n").map{ |f| File.basename(f) }
  s.require_paths = ['lib']

  s.add_runtime_dependency 'typhoeus', ['~> 1.3']
  s.add_runtime_dependency 'date', ['~> 2.0']
  s.add_development_dependency 'rake', ['~> 12.3']
  s.add_development_dependency 'rspec', ['~> 3.8']
  s.add_development_dependency 'vcr', ['~> 4.0']
end
