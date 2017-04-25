Gem::Specification.new do |s|
  s.name        = 'wu_tornado_alert'
  s.version     = '0.0.0'
  s.executables << 'wu_tornado_alert'
  s.date        = '2017-04-24'
  s.summary     = 'Get specific data from weather underground'
  s.description = 'Currently using this to get tornado alerts from WU'
  s.authors     = ['Jeremy Miller']
  s.email       = 'jmiller3346@gmail.com'
  s.files       = ['lib/wu_tornado_alert.rb']
  s.homepage    = 'http://rubygems.org/gems/wu_tornado_alert'
  s.license     = 'GPL-3.0'
  s.add_runtime_dependency 'wunderground', ['~> 1.2']
end
